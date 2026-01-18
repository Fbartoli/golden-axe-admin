const BE_URL = process.env.BE_URL || 'http://localhost:8081'

export interface ChainSync {
  chain_id: string
  chain_name: string
  status: 'synced' | 'syncing' | 'stalled' | 'disabled'
  synced_block: string
  head_block: string
  blocks_behind: number
  sync_percentage: number
}

export interface HealthDetailedResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime_seconds: number
  version: string
  checks: {
    database: {
      status: 'ok' | 'error'
      latency_ms: number
      pools: Record<string, { connected: boolean; max_connections: number; active: number; idle: number }>
    }
    sync: {
      status: 'synced' | 'syncing' | 'stalled' | 'error'
      chains: ChainSync[]
    }
  }
}

export interface StatusChain {
  chain: string
  name: string
  current: string
  target: string
  behind: string
  running: boolean
}

export interface StatusResponse {
  chains: StatusChain[]
  connections: Record<string, { active: number; idle: number; waiting: number }>
}

export async function getHealthDetailed(): Promise<HealthDetailedResponse> {
  const res = await fetch(`${BE_URL}/health/detailed`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Backend error: ${res.status}`)
  return res.json()
}

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetch(`${BE_URL}/status`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Backend error: ${res.status}`)
  return res.json()
}
