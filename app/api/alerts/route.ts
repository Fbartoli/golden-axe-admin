import { beSql, sql } from '@/lib/db'
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
    // Generate a unique key for this alert to avoid duplicate notifications
    const alertKey = `${alert.type}-${alert.chain || 'system'}-${alert.severity}`

    // Only send notification if we haven't sent one for this alert type recently
    if (previousState.notifiedAlerts.has(alertKey)) {
      return
    }

    // Mark as notified (will be cleared after 10 minutes)
    previousState.notifiedAlerts.add(alertKey)
    setTimeout(() => previousState.notifiedAlerts.delete(alertKey), 10 * 60 * 1000)

    // Call the notification sender
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
  // Check for duplicate recent alerts (same type and chain within 5 minutes)
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

    // Keep only MAX_ALERTS
    if (alerts.length > MAX_ALERTS) {
      alerts.pop()
    }

    // Send notification for critical and warning alerts
    if (alert.severity === 'critical' || alert.severity === 'warning') {
      sendNotification(newAlert)
    }
  }
}

// Load custom alert rules from database
async function loadAlertRules(): Promise<AlertRule[]> {
  try {
    const rules = await sql`
      SELECT id, name, type, chain, threshold, comparison, severity, enabled
      FROM alert_rules
      WHERE enabled = true
    `
    return rules as unknown as AlertRule[]
  } catch (e) {
    // Table might not exist yet
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
    // Load custom rules
    const rules = await loadAlertRules()

    // Get enabled chains (from backend database)
    const configs = await beSql`
      SELECT chain, name, url
      FROM config
      WHERE enabled = true
    `

    const now = Date.now()
    const timeSinceLastCheck = now - previousState.lastCheck

    // Track current metrics for custom rules
    const metrics: Record<string, { value: number; chain?: number; chainName?: string }> = {}

    for (const config of configs) {
      // Check RPC health
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

        // Store RPC latency metric
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
          } else {
            // Check sync status
            const remoteBlock = parseInt(data.result, 16)

            const localBlockResult = await beSql`
              SELECT max(num)::int as latest_block
              FROM blocks
              WHERE chain = ${config.chain}
            `
            const localBlock = localBlockResult[0]?.latest_block || 0
            const behind = remoteBlock - localBlock

            // Store sync_behind metric
            metrics[`sync_behind_${config.chain}`] = { value: behind, chain: config.chain, chainName: config.name }

            // Default alert if more than 100 blocks behind
            if (behind > 100) {
              addAlert({
                type: 'sync_behind',
                severity: behind > 1000 ? 'critical' : 'warning',
                chain: config.chain,
                chainName: config.name,
                message: `Chain is ${behind.toLocaleString()} blocks behind`,
                details: `Local: ${localBlock.toLocaleString()}, Remote: ${remoteBlock.toLocaleString()}`,
              })
            }

            // Check for stalled sync
            if (timeSinceLastCheck > 60000) {
              const prevBlockCount = previousState.blockCounts[config.chain] || 0
              const currentBlockResult = await beSql`
                SELECT count(1)::int as block_count
                FROM blocks
                WHERE chain = ${config.chain}
              `
              const currentBlockCount = currentBlockResult[0]?.block_count || 0

              if (prevBlockCount > 0 && currentBlockCount === prevBlockCount && behind > 0) {
                addAlert({
                  type: 'sync_stalled',
                  severity: 'warning',
                  chain: config.chain,
                  chainName: config.name,
                  message: 'Sync appears to be stalled',
                  details: `No new blocks synced in the last check interval`,
                })
              }

              previousState.blockCounts[config.chain] = currentBlockCount
            }
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
        // Connection usage
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

        // Cache hit ratio
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

        // Long-running queries (> 60 seconds)
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

        // Deadlocks (check if count increased)
        const [deadlockStats] = await dbConn`
          SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()
        `
        const deadlocks = Number(deadlockStats?.deadlocks) || 0

        // We'd need to track previous deadlock count to detect new ones
        // For now, just alert if there are any (they persist until stats reset)
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

    // Check backend service health
    const beUrl = process.env.BE_URL
    if (beUrl) {
      try {
        const start = performance.now()
        const healthUrl = beUrl.replace(/\/$/, '') + '/health'

        let response: Response
        try {
          response = await fetch(healthUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          })
        } catch {
          response = await fetch(beUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          })
        }

        const latency = Math.round(performance.now() - start)
        metrics['backend_latency'] = { value: latency }

        if (!response.ok && response.status >= 500) {
          addAlert({
            type: 'backend_down',
            severity: 'critical',
            message: `Backend service returned HTTP ${response.status}`,
            details: `URL: ${beUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`,
          })
        } else if (latency > 2000) {
          addAlert({
            type: 'backend_slow',
            severity: 'warning',
            message: `Backend service responding slowly (${latency}ms)`,
          })
        }
      } catch (e: any) {
        addAlert({
          type: 'backend_down',
          severity: 'critical',
          message: `Backend service unreachable: ${e.name === 'TimeoutError' ? 'Timeout' : e.message}`,
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
        // Use highest connection usage across DBs
        const feConn = metrics['db_connections_Frontend DB']?.value || 0
        const beConn = metrics['db_connections_Backend DB']?.value || 0
        metricData = { value: Math.max(feConn, beConn) }
      } else if (rule.type === 'db_cache') {
        // Use lowest cache hit ratio across DBs
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

        // Update last triggered
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
  // Check for new alerts
  await checkAlerts()

  // Return current alerts
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
