import { beSql } from '@/lib/db'
import { getHealthDetailed, getStatus } from '@/lib/backend-api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SyncSnapshot {
  chain: number
  name: string
  block_count: number
  log_count: number
  latest_block: number
  timestamp: string
}

// In-memory storage for sync history (last 24 hours)
const syncHistory: Map<number, SyncSnapshot[]> = new Map()
const MAX_HISTORY_POINTS = 288 // 24 hours at 5-minute intervals

export async function GET() {
  try {
    // Fetch backend API data and config (for URLs) in parallel
    const [health, status, configs] = await Promise.all([
      getHealthDetailed().catch(() => null),
      getStatus().catch(() => null),
      // Keep config query for RPC URLs (not in backend API)
      beSql`
        SELECT chain, name, start_block, url
        FROM config
        WHERE enabled = true
        ORDER BY chain
      `,
    ])

    // Build chain data from backend API or fallback to config
    const chainData: SyncSnapshot[] = []

    if (health?.checks?.sync?.chains) {
      // Use backend API data
      for (const chain of health.checks.sync.chains) {
        const chainId = parseInt(chain.chain_id, 10)
        chainData.push({
          chain: chainId,
          name: chain.chain_name,
          block_count: 0, // Backend doesn't provide block count
          log_count: 0, // Backend doesn't provide log count
          latest_block: parseInt(chain.synced_block, 10) || 0,
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      // Fallback to config-only data
      for (const config of configs) {
        chainData.push({
          chain: config.chain,
          name: config.name,
          block_count: 0,
          log_count: 0,
          latest_block: 0,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Store snapshots in history
    for (const snapshot of chainData) {
      if (!syncHistory.has(snapshot.chain)) {
        syncHistory.set(snapshot.chain, [])
      }
      const history = syncHistory.get(snapshot.chain)!
      history.push(snapshot)

      // Keep only last MAX_HISTORY_POINTS
      if (history.length > MAX_HISTORY_POINTS) {
        history.shift()
      }
    }

    // Calculate sync rates (blocks per hour based on recent history)
    const syncRates: Record<number, { blocksPerHour: number; logsPerHour: number }> = {}

    for (const [chain, history] of Array.from(syncHistory.entries())) {
      if (history.length >= 2) {
        const oldest = history[0]
        const newest = history[history.length - 1]
        const timeDiffHours = (new Date(newest.timestamp).getTime() - new Date(oldest.timestamp).getTime()) / (1000 * 60 * 60)

        if (timeDiffHours > 0) {
          // Calculate rate based on latest_block changes
          const blocksDiff = newest.latest_block - oldest.latest_block
          syncRates[chain] = {
            blocksPerHour: Math.round(blocksDiff / timeDiffHours),
            logsPerHour: 0, // Not tracked without log counts
          }
        }
      }
    }

    // Get RPC remote block numbers for comparison
    const rpcResults = await Promise.all(
      configs.map(async (config) => {
        if (!config.url) return { chain: config.chain, block: null }
        try {
          const response = await fetch(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_blockNumber',
              params: [],
              id: 1,
            }),
            signal: AbortSignal.timeout(5000),
          })
          const data = await response.json()
          return {
            chain: config.chain,
            block: data.result ? parseInt(data.result, 16) : null,
          }
        } catch (e) {
          return { chain: config.chain, block: null }
        }
      })
    )

    const rpcBlocks: Record<number, number> = {}
    for (const result of rpcResults) {
      if (result.block !== null) {
        rpcBlocks[result.chain] = result.block
      }
    }

    // Build start_block map from config
    const startBlocks: Record<number, number> = Object.fromEntries(
      configs.map((config) => [config.chain, config.start_block || 0])
    )

    // Calculate sync status - use backend data if available
    const syncStatus: Record<number, { behind: number; percentSynced: number; estimatedTimeToSync: string }> = {}

    if (health?.checks?.sync?.chains) {
      // Use backend-provided sync status
      for (const chain of health.checks.sync.chains) {
        const chainId = parseInt(chain.chain_id, 10)
        const rate = syncRates[chainId]
        const behind = chain.blocks_behind

        let estimatedTimeToSync = 'N/A'
        if (rate && rate.blocksPerHour > 0 && behind > 0) {
          const hoursToSync = behind / rate.blocksPerHour
          if (hoursToSync < 1) {
            estimatedTimeToSync = `${Math.round(hoursToSync * 60)} minutes`
          } else if (hoursToSync < 24) {
            estimatedTimeToSync = `${Math.round(hoursToSync)} hours`
          } else {
            estimatedTimeToSync = `${Math.round(hoursToSync / 24)} days`
          }
        } else if (behind === 0 || chain.status === 'synced') {
          estimatedTimeToSync = 'Synced'
        }

        syncStatus[chainId] = {
          behind,
          percentSynced: chain.sync_percentage,
          estimatedTimeToSync,
        }
      }
    } else {
      // Fallback to calculating from RPC blocks
      for (const chain of chainData) {
        const remoteBlock = rpcBlocks[chain.chain]
        const localBlock = chain.latest_block
        const startBlock = startBlocks[chain.chain] || 0
        const rate = syncRates[chain.chain]

        if (remoteBlock) {
          const effectiveLocalBlock = localBlock || startBlock
          const behind = remoteBlock - effectiveLocalBlock
          const totalToSync = remoteBlock - startBlock
          const synced = effectiveLocalBlock - startBlock
          const percentSynced =
            totalToSync > 0 ? Math.min(100, Math.max(0, Math.round((synced / totalToSync) * 100))) : 0

          let estimatedTimeToSync = 'N/A'
          if (rate && rate.blocksPerHour > 0 && behind > 0) {
            const hoursToSync = behind / rate.blocksPerHour
            if (hoursToSync < 1) {
              estimatedTimeToSync = `${Math.round(hoursToSync * 60)} minutes`
            } else if (hoursToSync < 24) {
              estimatedTimeToSync = `${Math.round(hoursToSync)} hours`
            } else {
              estimatedTimeToSync = `${Math.round(hoursToSync / 24)} days`
            }
          } else if (behind === 0) {
            estimatedTimeToSync = 'Synced'
          }

          syncStatus[chain.chain] = {
            behind,
            percentSynced,
            estimatedTimeToSync,
          }
        }
      }
    }

    // Prepare chart data (last 12 data points for sparkline)
    const chartData: Record<number, { blocks: number[]; timestamps: string[] }> = {}

    for (const [chain, history] of Array.from(syncHistory.entries())) {
      const last12 = history.slice(-12)
      chartData[chain] = {
        blocks: last12.map((h: SyncSnapshot) => h.latest_block),
        timestamps: last12.map((h: SyncSnapshot) => h.timestamp),
      }
    }

    return NextResponse.json({
      current: chainData,
      history: Object.fromEntries(syncHistory),
      syncRates,
      rpcBlocks,
      startBlocks,
      syncStatus,
      chartData,
    })
  } catch (e: any) {
    console.error('Error fetching sync history:', e)
    return NextResponse.json({
      current: [],
      history: {},
      syncRates: {},
      rpcBlocks: {},
      startBlocks: {},
      syncStatus: {},
      chartData: {},
      error: e.message,
    })
  }
}
