import { beSql } from '@/lib/db'
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
// In production, you'd store this in a database table
const syncHistory: Map<number, SyncSnapshot[]> = new Map()
const MAX_HISTORY_POINTS = 288 // 24 hours at 5-minute intervals

export async function GET() {
  try {
    // Get current sync status from config (from backend database)
    const configs = await beSql`
      SELECT chain, name, start_block, url
      FROM config
      WHERE enabled = true
      ORDER BY chain
    `

    // Get current block counts for each chain - parallelize all queries
    const chainData: SyncSnapshot[] = await Promise.all(
      configs.map(async (config) => {
        try {
          // Run block and log queries in parallel for each chain
          const [blockStats, logStats] = await Promise.all([
            beSql`
              SELECT
                count(1)::int as block_count,
                max(num)::int as latest_block
              FROM blocks
              WHERE chain = ${config.chain}
            `,
            beSql`
              SELECT count(1)::int as log_count
              FROM logs
              WHERE chain = ${config.chain}
            `
          ])

          return {
            chain: config.chain,
            name: config.name,
            block_count: blockStats[0]?.block_count || 0,
            log_count: logStats[0]?.log_count || 0,
            latest_block: blockStats[0]?.latest_block || 0,
            timestamp: new Date().toISOString(),
          }
        } catch (e) {
          // Chain might not have data yet
          return {
            chain: config.chain,
            name: config.name,
            block_count: 0,
            log_count: 0,
            latest_block: 0,
            timestamp: new Date().toISOString(),
          }
        }
      })
    )

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
          syncRates[chain] = {
            blocksPerHour: Math.round((newest.block_count - oldest.block_count) / timeDiffHours),
            logsPerHour: Math.round((newest.log_count - oldest.log_count) / timeDiffHours),
          }
        }
      }
    }

    // Get RPC remote block numbers for comparison - parallelize all RPC calls
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
            block: data.result ? parseInt(data.result, 16) : null
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

    // Build a map of start_block per chain for accurate progress calculation
    const startBlocks: Record<number, number> = Object.fromEntries(
      configs.map(config => [config.chain, config.start_block || 0])
    )

    // Calculate how far behind each chain is
    const syncStatus: Record<number, { behind: number; percentSynced: number; estimatedTimeToSync: string }> = {}

    for (const chain of chainData) {
      const remoteBlock = rpcBlocks[chain.chain]
      const localBlock = chain.latest_block
      const startBlock = startBlocks[chain.chain] || 0
      const rate = syncRates[chain.chain]

      if (remoteBlock) {
        // Handle case where syncing hasn't started yet (localBlock is 0 or undefined)
        const effectiveLocalBlock = localBlock || startBlock
        const behind = remoteBlock - effectiveLocalBlock
        // Calculate progress relative to start_block, not from block 0
        const totalToSync = remoteBlock - startBlock
        const synced = effectiveLocalBlock - startBlock
        const percentSynced = totalToSync > 0
          ? Math.min(100, Math.max(0, Math.round((synced / totalToSync) * 100)))
          : 0

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

    // Prepare chart data (last 12 data points for sparkline)
    const chartData: Record<number, { blocks: number[]; timestamps: string[] }> = {}

    for (const [chain, history] of Array.from(syncHistory.entries())) {
      const last12 = history.slice(-12)
      chartData[chain] = {
        blocks: last12.map((h: SyncSnapshot) => h.block_count),
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
