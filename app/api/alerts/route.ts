import { beSql, sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface Alert {
  id: string
  type: 'sync_behind' | 'rpc_error' | 'high_memory' | 'high_disk' | 'reorg' | 'sync_stalled' | 'high_cpu' | 'custom'
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
    return rules as AlertRule[]
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

    // Get enabled chains
    const configs = await sql`
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

    // Check system resources
    const os = await import('os')
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const memUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100)

    // CPU usage
    const cpus = os.cpus()
    let totalIdle = 0, totalTick = 0
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times]
      }
      totalIdle += cpu.times.idle
    }
    const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100)

    // Store system metrics
    metrics['memory_usage'] = { value: memUsagePercent }
    metrics['cpu_usage'] = { value: cpuUsage }

    // Default memory alerts
    if (memUsagePercent > 90) {
      addAlert({
        type: 'high_memory',
        severity: 'critical',
        message: `Memory usage is critically high: ${memUsagePercent}%`,
        details: `Free: ${Math.round(freeMem / 1024 / 1024 / 1024)}GB of ${Math.round(totalMem / 1024 / 1024 / 1024)}GB`,
      })
    } else if (memUsagePercent > 80) {
      addAlert({
        type: 'high_memory',
        severity: 'warning',
        message: `Memory usage is high: ${memUsagePercent}%`,
      })
    }

    // Default CPU alerts
    if (cpuUsage > 90) {
      addAlert({
        type: 'high_cpu',
        severity: 'critical',
        message: `CPU usage is critically high: ${cpuUsage}%`,
      })
    } else if (cpuUsage > 80) {
      addAlert({
        type: 'high_cpu',
        severity: 'warning',
        message: `CPU usage is high: ${cpuUsage}%`,
      })
    }

    // Check custom rules
    for (const rule of rules) {
      let metricKey: string
      let metricData: { value: number; chain?: number; chainName?: string } | undefined

      if (rule.type === 'sync_behind' && rule.chain) {
        metricKey = `sync_behind_${rule.chain}`
        metricData = metrics[metricKey]
      } else if (rule.type === 'rpc_latency' && rule.chain) {
        metricKey = `rpc_latency_${rule.chain}`
        metricData = metrics[metricKey]
      } else if (rule.type === 'memory_usage') {
        metricData = metrics['memory_usage']
      } else if (rule.type === 'cpu_usage') {
        metricData = metrics['cpu_usage']
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
