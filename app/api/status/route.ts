import { getHealthDetailed } from '@/lib/backend-api'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const health = await getHealthDetailed()

    // Transform backend response to match expected format
    const config = health.checks.sync.chains.map(chain => ({
      chain: parseInt(chain.chain_id, 10),
      name: chain.chain_name,
      enabled: chain.status !== 'disabled',
    }))

    // Build chainStatus keyed by chain ID
    const chainStatus: Record<number, any> = {}
    for (const chain of health.checks.sync.chains) {
      const chainId = parseInt(chain.chain_id, 10)
      chainStatus[chainId] = {
        latest_synced_block: parseInt(chain.synced_block, 10) || 0,
        head_block: parseInt(chain.head_block, 10) || 0,
        blocks_behind: chain.blocks_behind,
        sync_percentage: chain.sync_percentage,
        status: chain.status,
      }
    }

    return NextResponse.json({
      config,
      chainStatus,
      dbConnected: health.checks.database.status === 'ok',
      backendStatus: health.status,
      backendVersion: health.version,
      uptimeSeconds: health.uptime_seconds,
    })
  } catch (e: any) {
    console.error('Error fetching status from backend:', e)
    return NextResponse.json({
      config: [],
      chainStatus: {},
      dbConnected: false,
      error: e.message,
    }, { status: 503 })
  }
}
