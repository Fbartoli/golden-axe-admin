import { NextResponse } from 'next/server'
import { sql, beSql } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface PostgresHealth {
  database: string
  connections: {
    active: number
    idle: number
    max: number
    usagePercent: number
  }
  cacheHitRatio: number
  deadlocks: number
  size: string
  sizeBytes: number
  longRunningQueries: Array<{
    pid: number
    duration: string
    query: string
    state: string
  }>
  replicationLag?: string
}

interface BackendDetailedHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime_seconds: number
  version: string
  checks: {
    database: {
      status: 'ok' | 'error'
      latency_ms: number
      pools: Record<string, {
        connected: boolean
        max_connections: number
        active: number
        idle: number
        waiting: number
      }>
    }
    sync: {
      status: 'synced' | 'syncing' | 'stalled' | 'error'
      chains: Array<{
        chain_id: string
        chain_name: string
        status: 'synced' | 'syncing' | 'stalled' | 'disabled'
        synced_block: string
        head_block: string
        blocks_behind: number
        sync_percentage: number
        estimated_time_to_sync: string
      }>
    }
  }
}

interface BackendHealth {
  url: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  latencyMs: number | null
  error?: string
  lastCheck: string
  detailed?: BackendDetailedHealth
}

interface SystemHealth {
  frontend_db: PostgresHealth | null
  backend_db: PostgresHealth | null
  backend_service: BackendHealth
  timestamp: string
}

async function getPostgresHealth(connection: typeof sql, dbName: string): Promise<PostgresHealth | null> {
  try {
    // Get connection stats
    const [connStats] = await connection`
      SELECT
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_conn
    `

    // Get cache hit ratio
    const [cacheStats] = await connection`
      SELECT
        CASE
          WHEN blks_hit + blks_read = 0 THEN 100
          ELSE round((blks_hit::numeric / (blks_hit + blks_read)) * 100, 2)
        END as cache_hit_ratio
      FROM pg_stat_database
      WHERE datname = current_database()
    `

    // Get deadlock count
    const [deadlockStats] = await connection`
      SELECT deadlocks
      FROM pg_stat_database
      WHERE datname = current_database()
    `

    // Get database size
    const [sizeStats] = await connection`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as size,
        pg_database_size(current_database()) as size_bytes
    `

    // Get long-running queries (> 30 seconds)
    const longQueries = await connection`
      SELECT
        pid,
        now() - pg_stat_activity.query_start as duration,
        query,
        state
      FROM pg_stat_activity
      WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
        AND state != 'idle'
        AND query NOT ILIKE '%pg_stat_activity%'
      ORDER BY query_start
      LIMIT 5
    `

    // Try to get replication lag (may not exist if not a replica)
    let replicationLag: string | undefined
    try {
      const [repStats] = await connection`
        SELECT
          CASE
            WHEN pg_is_in_recovery() THEN
              COALESCE(
                (SELECT extract(epoch from replay_lag)::text || 's'
                 FROM pg_stat_wal_receiver LIMIT 1),
                'N/A'
              )
            ELSE 'primary'
          END as lag
      `
      replicationLag = repStats?.lag
    } catch {
      // Replication stats not available
    }

    const active = Number(connStats.active) || 0
    const idle = Number(connStats.idle) || 0
    const maxConn = Number(connStats.max_conn) || 100

    return {
      database: dbName,
      connections: {
        active,
        idle,
        max: maxConn,
        usagePercent: Math.round(((active + idle) / maxConn) * 100),
      },
      cacheHitRatio: Number(cacheStats?.cache_hit_ratio) || 0,
      deadlocks: Number(deadlockStats?.deadlocks) || 0,
      size: sizeStats?.size || 'Unknown',
      sizeBytes: Number(sizeStats?.size_bytes) || 0,
      longRunningQueries: longQueries.map(q => ({
        pid: q.pid,
        duration: q.duration?.toString() || 'Unknown',
        query: q.query?.substring(0, 100) + (q.query?.length > 100 ? '...' : ''),
        state: q.state,
      })),
      replicationLag,
    }
  } catch (e) {
    console.error(`Error getting PostgreSQL health for ${dbName}:`, e)
    return null
  }
}

async function getBackendHealth(): Promise<BackendHealth> {
  const beUrl = process.env.BE_URL
  const result: BackendHealth = {
    url: beUrl ? maskUrl(beUrl) : 'Not configured',
    status: 'unknown',
    latencyMs: null,
    lastCheck: new Date().toISOString(),
  }

  if (!beUrl) {
    result.status = 'unknown'
    result.error = 'BE_URL not configured'
    return result
  }

  const baseUrl = beUrl.replace(/\/$/, '')

  try {
    // Try detailed health endpoint first for comprehensive metrics
    const detailedUrl = baseUrl + '/health/detailed'
    let response: Response | undefined
    let isDetailed = false
    let start = Date.now()

    try {
      start = Date.now()
      response = await fetch(detailedUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      })
      isDetailed = response.ok
    } catch {
      // Detailed endpoint doesn't exist, fall back to simple health
      try {
        start = Date.now()
        response = await fetch(baseUrl + '/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        })
      } catch {
        // Health endpoint doesn't exist, try root
        start = Date.now()
        response = await fetch(beUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        })
      }
    }

    const latency = Date.now() - start
    result.latencyMs = Math.max(1, latency) // At least 1ms to avoid showing 0

    if (isDetailed && response.ok) {
      try {
        const detailed = await response.json() as BackendDetailedHealth
        result.detailed = detailed
        result.status = detailed.status || 'healthy'
      } catch {
        // JSON parse failed, just use status
        result.status = 'healthy'
      }
    } else {
      result.status = response.ok || response.status < 500 ? 'healthy' : 'unhealthy'
    }

    if (!response.ok && response.status >= 500) {
      result.error = `HTTP ${response.status}`
    }
  } catch (e: any) {
    result.status = 'unhealthy'
    result.error = e.name === 'TimeoutError' ? 'Timeout (5s)' : e.message
  }

  return result
}

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Mask password if present
    if (parsed.password) {
      parsed.password = '***'
    }
    return parsed.toString()
  } catch {
    return url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
  }
}

export async function GET() {
  // Run all health checks in parallel
  const [frontendDb, backendDb, backendService] = await Promise.all([
    getPostgresHealth(sql, 'Frontend DB'),
    getPostgresHealth(beSql, 'Backend DB'),
    getBackendHealth(),
  ])

  const health: SystemHealth = {
    frontend_db: frontendDb,
    backend_db: backendDb,
    backend_service: backendService,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(health)
}
