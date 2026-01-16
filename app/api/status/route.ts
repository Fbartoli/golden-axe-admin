import { beSql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  // Get config from be database (config table moved to backend)
  const config = await beSql`
    SELECT chain, name, url, enabled, batch_size, concurrency, start_block
    FROM config
    WHERE enabled = true
    ORDER BY chain
  `

  // Get sync status from be database - latest block per chain
  let syncData: any[] = []
  try {
    syncData = await beSql`
      SELECT
        chain,
        max(num) as latest_synced_block,
        count(*) as total_blocks
      FROM blocks
      GROUP BY chain
      ORDER BY chain
    `
  } catch (e) {
    // Table might not exist yet
  }

  // Get latest logs per chain
  let logsData: any[] = []
  try {
    logsData = await beSql`
      SELECT
        chain,
        max(block_num) as latest_log_block,
        count(*) as total_logs
      FROM logs
      GROUP BY chain
      ORDER BY chain
    `
  } catch (e) {
    // Table might not exist yet
  }

  // Combine the data
  const chainStatus: Record<number, any> = {}
  for (const row of syncData) {
    chainStatus[row.chain] = {
      latest_synced_block: Number(row.latest_synced_block),
      total_blocks: Number(row.total_blocks),
    }
  }
  for (const row of logsData) {
    if (!chainStatus[row.chain]) {
      chainStatus[row.chain] = {}
    }
    chainStatus[row.chain].latest_log_block = Number(row.latest_log_block)
    chainStatus[row.chain].total_logs = Number(row.total_logs)
  }

  return NextResponse.json({
    config,
    chainStatus,
    dbConnected: syncData.length > 0 || logsData.length > 0,
  })
}
