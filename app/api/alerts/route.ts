import { beSql, sql } from '@/lib/db'
import { getHealthDetailed } from '@/lib/backend-api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface Alert {
  id: string
  type: 'sync_behind' | 'rpc_error' | 'sync_stalled' | 'db_connections' | 'db_cache' | 'db_long_query' | 'db_deadlock' | 'backend_down' | 'backend_slow' | 'custom'
  severity: 'info' | 'warning' | 'critical'
  chain?: number
  chainName?: string
  message: string
  details?: string
  timestamp: string
  acknowledged: boolean
}

interface AlertRule {
  id: number
  name: string
  type: string
  chain: number | null
  threshold: number
  comparison: string
  severity: string
  enabled: boolean
}

// In-memory alert storage
const alerts: Alert[] = []
const MAX_ALERTS = 100

// Track previous state for detecting changes
let previousState: {
  blockCounts: Record<number, number>
  lastCheck: number
  notifiedAlerts: Set<string>
} = {
  blockCounts: {},
  lastCheck: 0,
  notifiedAlerts: new Set(),
}

function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Send notification for a new alert
async function sendNotification(alert: Alert) {
  try {
    const alertKey = `${alert.type}-${alert.chain || 'system'}-${alert.severity}`

    if (previousState.notifiedAlerts.has(alertKey)) {
      return
    }

    previousState.notifiedAlerts.add(alertKey)
    setTimeout(() => previousState.notifiedAlerts.delete(alertKey), 10 * 60 * 1000)

    await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    }).catch(e => console.error('Failed to send notification:', e))
  } catch (e) {
    console.error('Error sending notification:', e)
  }
}

async function addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  const isDuplicate = alerts.some(
    a =>
      a.type === alert.type &&
      a.chain === alert.chain &&
      new Date(a.timestamp).getTime() > fiveMinutesAgo
  )

  if (!isDuplicate) {
    const newAlert: Alert = {
      ...alert,
      id: generateAlertId(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
    }

    alerts.unshift(newAlert)

    if (alerts.length > MAX_ALERTS) {
      alerts.pop()
    }

    if (alert.severity === 'critical' || alert.severity === 'warning') {
      sendNotification(newAlert)
    }
  }
}

// Load custom alert rules from database (frontend DB)
async function loadAlertRules(): Promise<AlertRule[]> {
  try {
    const rules = await sql`
      SELECT id, name, type, chain, threshold, comparison, severity, enabled
      FROM alert_rules
      WHERE enabled = true
    `
    return rules as unknown as AlertRule[]
  } catch (e) {
    return []
  }
}

// Check if a value triggers a rule
function checkRule(rule: AlertRule, value: number): boolean {
  switch (rule.comparison) {
    case 'gt': return value > rule.threshold
    case 'gte': return value >= rule.threshold
    case 'lt': return value < rule.threshold
    case 'lte': return value <= rule.threshold
    case 'eq': return value === rule.threshold
    default: return value > rule.threshold
  }
}

async function checkAlerts() {
  try {
    // Load custom rules and fetch backend health + config for URLs in parallel
    const [rules, health, configs] = await Promise.all([
      loadAlertRules(),
      getHealthDetailed().catch(() => null),
      // Keep config query for RPC URLs
      beSql`
        SELECT chain, name, url
        FROM config
        WHERE enabled = true
      `,
    ])

    const now = Date.now()
    const timeSinceLastCheck = now - previousState.lastCheck

    // Track current metrics for custom rules
    const metrics: Record<string, { value: number; chain?: number; chainName?: string }> = {}

    // Check sync status from backend API
    if (health?.checks?.sync?.chains) {
      for (const chain of health.checks.sync.chains) {
        const chainId = parseInt(chain.chain_id, 10)
        const behind = chain.blocks_behind

        metrics[`sync_behind_${chainId}`] = { value: behind, chain: chainId, chainName: chain.chain_name }

        // Alert if more than 100 blocks behind
        if (behind > 100) {
          addAlert({
            type: 'sync_behind',
            severity: behind > 1000 ? 'critical' : 'warning',
            chain: chainId,
            chainName: chain.chain_name,
            message: `Chain is ${behind.toLocaleString()} blocks behind`,
            details: `Synced: ${chain.synced_block}, Head: ${chain.head_block}`,
          })
        }

        // Check for stalled sync
        if (chain.status === 'stalled') {
          addAlert({
            type: 'sync_stalled',
            severity: 'warning',
            chain: chainId,
            chainName: chain.chain_name,
            message: 'Sync appears to be stalled',
            details: `Status: ${chain.status}`,
          })
        }
      }
    }

    // Check RPC health for each chain (using URLs from config)
    for (const config of configs) {
      try {
        const rpcStart = Date.now()
        const response = await fetch(config.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
          signal: AbortSignal.timeout(10000),
        })
        const rpcLatency = Date.now() - rpcStart

        metrics[`rpc_latency_${config.chain}`] = { value: rpcLatency, chain: config.chain, chainName: config.name }

        if (!response.ok) {
          addAlert({
            type: 'rpc_error',
            severity: 'critical',
            chain: config.chain,
            chainName: config.name,
            message: `RPC endpoint returned HTTP ${response.status}`,
            details: `URL: ${config.url.replace(/\/[^/]*$/, '/***')}`,
          })
        } else {
          const data = await response.json()
          if (data.error) {
            addAlert({
              type: 'rpc_error',
              severity: 'warning',
              chain: config.chain,
              chainName: config.name,
              message: `RPC error: ${data.error.message}`,
            })
          }
        }
      } catch (e: any) {
        addAlert({
          type: 'rpc_error',
          severity: 'critical',
          chain: config.chain,
          chainName: config.name,
          message: `RPC connection failed: ${e.message}`,
        })
      }
    }

    // Check database health
    for (const [dbName, dbConn] of [['Frontend DB', sql], ['Backend DB', beSql]] as const) {
      try {
        const [connStats] = await dbConn`
          SELECT
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active,
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle,
            (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_conn
        `
        const totalConn = Number(connStats.active) + Number(connStats.idle)
        const maxConn = Number(connStats.max_conn) || 100
        const connUsagePercent = Math.round((totalConn / maxConn) * 100)

        metrics[`db_connections_${dbName}`] = { value: connUsagePercent }

        if (connUsagePercent > 90) {
          addAlert({
            type: 'db_connections',
            severity: 'critical',
            message: `${dbName}: Connection pool nearly exhausted (${connUsagePercent}%)`,
            details: `${totalConn}/${maxConn} connections in use`,
          })
        } else if (connUsagePercent > 75) {
          addAlert({
            type: 'db_connections',
            severity: 'warning',
            message: `${dbName}: High connection usage (${connUsagePercent}%)`,
            details: `${totalConn}/${maxConn} connections in use`,
          })
        }

        const [cacheStats] = await dbConn`
          SELECT
            CASE
              WHEN blks_hit + blks_read = 0 THEN 100
              ELSE round((blks_hit::numeric / (blks_hit + blks_read)) * 100, 2)
            END as cache_hit_ratio
          FROM pg_stat_database
          WHERE datname = current_database()
        `
        const cacheHitRatio = Number(cacheStats?.cache_hit_ratio) || 100

        metrics[`db_cache_${dbName}`] = { value: cacheHitRatio }

        if (cacheHitRatio < 80) {
          addAlert({
            type: 'db_cache',
            severity: 'warning',
            message: `${dbName}: Low cache hit ratio (${cacheHitRatio}%)`,
            details: `Consider increasing shared_buffers or reviewing query patterns`,
          })
        }

        const longQueries = await dbConn`
          SELECT pid, now() - query_start as duration, left(query, 100) as query
          FROM pg_stat_activity
          WHERE (now() - query_start) > interval '60 seconds'
            AND state != 'idle'
            AND query NOT ILIKE '%pg_stat_activity%'
          LIMIT 3
        `

        if (longQueries.length > 0) {
          addAlert({
            type: 'db_long_query',
            severity: 'warning',
            message: `${dbName}: ${longQueries.length} long-running query(s) detected`,
            details: `PID ${longQueries[0].pid}: ${longQueries[0].query}...`,
          })
        }

        const [deadlockStats] = await dbConn`
          SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()
        `
        const deadlocks = Number(deadlockStats?.deadlocks) || 0

        metrics[`db_deadlocks_${dbName}`] = { value: deadlocks }

      } catch (e: any) {
        addAlert({
          type: 'db_connections',
          severity: 'critical',
          message: `${dbName}: Connection failed`,
          details: e.message,
        })
      }
    }

    // Check backend service health (use health data if already fetched)
    const beUrl = process.env.BE_URL
    if (beUrl) {
      if (health) {
        // Backend is healthy, check for degraded status
        if (health.status === 'unhealthy') {
          addAlert({
            type: 'backend_down',
            severity: 'critical',
            message: `Backend service is unhealthy`,
            details: `Status: ${health.status}`,
          })
        } else if (health.status === 'degraded') {
          addAlert({
            type: 'backend_slow',
            severity: 'warning',
            message: `Backend service is degraded`,
            details: `Status: ${health.status}`,
          })
        }
        metrics['backend_latency'] = { value: 0 } // We got a response
      } else {
        // Backend health check failed
        addAlert({
          type: 'backend_down',
          severity: 'critical',
          message: `Backend service unreachable`,
        })
      }
    }

    // Check custom rules
    for (const rule of rules) {
      let metricData: { value: number; chain?: number; chainName?: string } | undefined

      if (rule.type === 'sync_behind' && rule.chain) {
        metricData = metrics[`sync_behind_${rule.chain}`]
      } else if (rule.type === 'rpc_latency' && rule.chain) {
        metricData = metrics[`rpc_latency_${rule.chain}`]
      } else if (rule.type === 'db_connections') {
        const feConn = metrics['db_connections_Frontend DB']?.value || 0
        const beConn = metrics['db_connections_Backend DB']?.value || 0
        metricData = { value: Math.max(feConn, beConn) }
      } else if (rule.type === 'db_cache') {
        const feCache = metrics['db_cache_Frontend DB']?.value || 100
        const beCache = metrics['db_cache_Backend DB']?.value || 100
        metricData = { value: Math.min(feCache, beCache) }
      } else if (rule.type === 'backend_latency') {
        metricData = metrics['backend_latency']
      }

      if (metricData && checkRule(rule, metricData.value)) {
        addAlert({
          type: 'custom',
          severity: rule.severity as 'info' | 'warning' | 'critical',
          chain: metricData.chain,
          chainName: metricData.chainName,
          message: `${rule.name}: ${metricData.value} ${rule.comparison} ${rule.threshold}`,
          details: `Custom rule triggered`,
        })

        await sql`
          UPDATE alert_rules SET last_triggered_at = now() WHERE id = ${rule.id}
        `.catch(() => {})
      }
    }

    previousState.lastCheck = now
  } catch (e: any) {
    console.error('Error checking alerts:', e)
  }
}

export async function GET() {
  await checkAlerts()

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length

  return NextResponse.json({
    alerts,
    unacknowledgedCount,
    lastCheck: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { action, alertId } = body

  if (action === 'acknowledge' && alertId) {
    const alert = alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'acknowledge_all') {
    alerts.forEach(a => (a.acknowledged = true))
    return NextResponse.json({ success: true })
  }

  if (action === 'clear_acknowledged') {
    const unacknowledged = alerts.filter(a => !a.acknowledged)
    alerts.length = 0
    alerts.push(...unacknowledged)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
