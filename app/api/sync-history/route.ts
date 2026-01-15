import { beSql, sql } from '@/lib/db'
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
    // Get current sync status from config
    const configs = await sql`
      SELECT chain, name
      FROM config
      WHERE enabled = true
      ORDER BY chain
    `

    // Get current block counts for each chain
    const chainData: SyncSnapshot[] = []

    for (const config of configs) {
      try {
        // Get block count and latest block
        const blockStats = await beSql`
          SELECT
            count(1)::int as block_count,
            max(num)::int as latest_block
          FROM blocks
          WHERE chain = ${config.chain}
        `

        // Get log count
        const logStats = await beSql`
          SELECT count(1)::int as log_count
          FROM logs
          WHERE chain = ${config.chain}
        `

        const snapshot: SyncSnapshot = {
          chain: config.chain,
          name: config.name,
          block_count: blockStats[0]?.block_count || 0,
          log_count: logStats[0]?.log_count || 0,
          latest_block: blockStats[0]?.latest_block || 0,
          timestamp: new Date().toISOString(),
        }

        chainData.push(snapshot)

        // Store in history
        if (!syncHistory.has(config.chain)) {
          syncHistory.set(config.chain, [])
        }
        const history = syncHistory.get(config.chain)!
        history.push(snapshot)

        // Keep only last MAX_HISTORY_POINTS
        if (history.length > MAX_HISTORY_POINTS) {
          history.shift()
        }
      } catch (e) {
        // Chain might not have data yet
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

    // Calculate sync rates (blocks per hour based on recent history)
    const syncRates: Record<number, { blocksPerHour: number; logsPerHour: number }> = {}

    for (const [chain, history] of syncHistory.entries()) {
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

    // Get RPC remote block numbers for comparison
    const rpcBlocks: Record<number, number> = {}
    for (const config of configs) {
      try {
        const rpcUrl = (await sql`SELECT url FROM config WHERE chain = ${config.chain}`)[0]?.url
        if (rpcUrl) {
          const response = await fetch(rpcUrl, {
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
          if (data.result) {
            rpcBlocks[config.chain] = parseInt(data.result, 16)
          }
        }
      } catch (e) {
        // RPC call failed
      }
    }

    // Calculate how far behind each chain is
    const syncStatus: Record<number, { behind: number; percentSynced: number; estimatedTimeToSync: string }> = {}

    for (const chain of chainData) {
      const remoteBlock = rpcBlocks[chain.chain]
      const localBlock = chain.latest_block
      const rate = syncRates[chain.chain]

      if (remoteBlock && localBlock) {
        const behind = remoteBlock - localBlock
        const percentSynced = Math.min(100, Math.round((localBlock / remoteBlock) * 100))

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

    for (const [chain, history] of syncHistory.entries()) {
      const last12 = history.slice(-12)
      chartData[chain] = {
        blocks: last12.map(h => h.block_count),
        timestamps: last12.map(h => h.timestamp),
      }
    }

    return NextResponse.json({
      current: chainData,
      history: Object.fromEntries(syncHistory),
      syncRates,
      rpcBlocks,
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
      syncStatus: {},
      chartData: {},
      error: e.message,
    })
  }
}
