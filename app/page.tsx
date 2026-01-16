'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Network {
  chain: number
  name: string
  url: string
  enabled: boolean
  batch_size: number
  concurrency: number
  start_block: number | null
}

interface ApiKey {
  owner_email: string
  secret: string
  origins: string[]
  created_at: string
  deleted_at: string | null
}

interface AdminKey {
  org: string
  name: string | null
  secret: string
  origins: string[]
  created_at: string
  deleted_at: string | null
}

interface User {
  email: string
  plan_name: string | null
  rate: number | null
  timeout: number | null
  connections: number | null
  query_limit: number | null
  plan_date: string | null
  key_count: number
  queries_30d: number
  last_active: string | null
}

interface UserDetail {
  email: string
  keys: Array<{ secret: string; origins: string[]; created_at: string; deleted_at: string | null }>
  plans: Array<{ name: string; amount: number; rate: number; timeout: number; connections: number; queries: number; created_at: string; daimo_tx: string | null; stripe_customer: string | null }>
  usage: Array<{ day: string; queries: number }>
  collabs: Array<{ email: string; created_at: string; disabled_at: string | null }>
}

interface SyncStatus {
  config: Array<{ chain: number; name: string; url: string; enabled: boolean; batch_size: number; concurrency: number; start_block: number | null }>
  chainStatus: Record<number, { latest_synced_block?: number; total_blocks?: number; latest_log_block?: number; total_logs?: number }>
  dbConnected: boolean
}

interface QueryResult {
  success: boolean
  status?: number
  data?: any
  error?: string
}

interface SyncEvent {
  chain?: number
  new_block?: string
  num?: number
  active_connections?: number
  timestamp: number
}

interface DecodedEvent {
  success: boolean
  eventName?: string
  args?: Record<string, any>
  error?: string
}

interface TableSize {
  tablename: string
  size: string
  size_bytes: number
}

interface RpcHealth {
  chain: string
  name: string
  url: string
  latency: number
  blockNumber: string | null
  error: string | null
}

interface QueryLogEntry {
  api_key: string
  query: string
  chain: string
  duration_ms: number
  created_at: string
  error: string | null
}

interface UserUsage {
  email: string
  total_queries: number
  avg_duration_ms: number
  last_query: string
  error_count: number
}

interface MonitoringData {
  tableSizes: TableSize[]
  dbSize: { size: string; size_bytes: number } | null
  queryHistory: QueryLogEntry[]
  userUsage: UserUsage[]
}

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

interface BackendHealth {
  url: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  latencyMs: number | null
  error?: string
  lastCheck: string
}

interface SystemHealth {
  frontend_db: PostgresHealth | null
  backend_db: PostgresHealth | null
  backend_service: BackendHealth
  timestamp: string
}

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

interface SyncHistoryData {
  current: Array<{
    chain: number
    name: string
    block_count: number
    log_count: number
    latest_block: number
  }>
  syncRates: Record<number, { blocksPerHour: number; logsPerHour: number }>
  rpcBlocks: Record<number, number>
  startBlocks: Record<number, number>
  syncStatus: Record<number, { behind: number; percentSynced: number; estimatedTimeToSync: string }>
  chartData: Record<number, { blocks: number[]; timestamps: string[] }>
}

interface Webhook {
  id: number
  name: string
  url: string
  enabled: boolean
  events: string[]
  created_at: string
  last_triggered_at: string | null
  last_error: string | null
}

interface EmailNotification {
  id: number
  name: string
  email: string
  enabled: boolean
  events: string[]
  created_at: string
  last_sent_at: string | null
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
  created_at: string
  last_triggered_at: string | null
}

interface NotificationSettings {
  webhooks: Webhook[]
  emails: EmailNotification[]
  rules: AlertRule[]
  eventTypes: Array<{ value: string; label: string }>
  ruleTypes: Array<{ value: string; label: string; unit: string }>
}

export default function AdminPage() {
  const router = useRouter()
  const [networks, setNetworks] = useState<Network[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [adminKeys, setAdminKeys] = useState<AdminKey[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [tab, setTab] = useState<'networks' | 'users' | 'sync' | 'query' | 'system' | 'notifications'>('networks')

  // Monitoring state
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null)
  const [rpcHealth, setRpcHealth] = useState<RpcHealth[]>([])
  const [rpcLoading, setRpcLoading] = useState(false)

  // Real-time monitoring state
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState(0)
  const [syncHistory, setSyncHistory] = useState<SyncHistoryData | null>(null)
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null)

  // Notifications state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', events: [] as string[] })
  const [emailForm, setEmailForm] = useState({ name: '', email: '', events: [] as string[] })
  const [ruleForm, setRuleForm] = useState({ name: '', type: 'sync_behind', chain: '', threshold: '', comparison: 'gt', severity: 'warning' })

  // UI state - lazy init from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem('darkMode')
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // Query helper state
  const [schemaData, setSchemaData] = useState<{
    schema: Record<string, Array<{ name: string; type: string; nullable: boolean }>>
    templates: Array<{ name: string; description: string; query: string; eventSignature?: string }>
    validationRules: Array<{ pattern: string; message: string }>
  } | null>(null)
  const [queryErrors, setQueryErrors] = useState<string[]>([])
  const [showHelper, setShowHelper] = useState(true)

  // Live sync state
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([])
  const [sseConnected, setSseConnected] = useState(false)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  // Decoder state
  const [abiInput, setAbiInput] = useState('event Transfer(address indexed from, address indexed to, uint256 value)')
  const [topicsInput, setTopicsInput] = useState('')
  const [dataInput, setDataInput] = useState('')
  const [decodedResult, setDecodedResult] = useState<DecodedEvent | null>(null)

  // Query state
  const [queryText, setQueryText] = useState(`SELECT
  block_num,
  tx_hash,
  log_idx,
  address
FROM logs
ORDER BY block_num DESC
LIMIT 10`)
  const [queryChain, setQueryChain] = useState('1')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryTime, setQueryTime] = useState<number | null>(null)
  const [eventSignatures, setEventSignatures] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [liveQueryEnabled, setLiveQueryEnabled] = useState(false)
  const [liveQuerySource, setLiveQuerySource] = useState<EventSource | null>(null)
  const [liveQueryResults, setLiveQueryResults] = useState<any[]>([])
  const [liveQueryConnected, setLiveQueryConnected] = useState(false)

  // Speed tracking state
  const [syncSpeed, setSyncSpeed] = useState<Record<number, number>>({})
  const [prevBlockCounts, setPrevBlockCounts] = useState<Record<number, { count: number; time: number }>>({})
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Network form
  const [networkForm, setNetworkForm] = useState({
    chain: '',
    name: '',
    url: '',
    enabled: false,
    batch_size: '2000',
    concurrency: '10',
    start_block: '',
  })

  // API Key form
  const [keyForm, setKeyForm] = useState({
    owner_email: '',
    origins: '',
  })

  useEffect(() => {
    fetchNetworks()
    fetchKeys()
    fetchAdminKeys()
    fetchUsers()
  }, [])

  // Auto-refresh for sync status
  useEffect(() => {
    if (tab === 'sync' && autoRefresh) {
      const interval = setInterval(fetchStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [tab, autoRefresh])

  // Stop monitoring interval when leaving system tab
  useEffect(() => {
    if (tab !== 'system') {
      stopMonitoringInterval()
    }
    // Cleanup on unmount
    return () => stopMonitoringInterval()
  }, [tab])

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur()
        }
        return
      }

      // Ctrl/Cmd + K: Open command palette / focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }

      // Escape: Close command palette
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setSearchQuery('')
      }

      // Number keys 1-6 for tabs (without modifiers)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tabs: Array<typeof tab> = ['networks', 'users', 'sync', 'query', 'system', 'notifications']
        const num = parseInt(e.key)
        if (num >= 1 && num <= 6) {
          setTab(tabs[num - 1])
          if (num === 3) fetchStatus()
          if (num === 5) { fetchMonitoring(); checkRpcHealth() }
        }
      }

      // D: Toggle dark mode
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
        setDarkMode((d: boolean) => !d)
      }

      // R: Refresh current tab
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        if (tab === 'networks') fetchNetworks()
        if (tab === 'users') { fetchUsers(); fetchKeys(); fetchAdminKeys() }
        if (tab === 'sync') fetchStatus()
        if (tab === 'system') { fetchMonitoring(); checkRpcHealth() }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tab])

  async function fetchNetworks() {
    const res = await fetch('/api/networks')
    setNetworks(await res.json())
  }

  async function fetchKeys() {
    const res = await fetch('/api/keys')
    setKeys(await res.json())
  }

  async function fetchAdminKeys() {
    try {
      const res = await fetch('/api/admin-key')
      setAdminKeys(await res.json())
    } catch (e) {
      console.error('Failed to fetch admin keys:', e)
    }
  }

  async function fetchUsers() {
    const res = await fetch('/api/users')
    setUsers(await res.json())
  }

  async function fetchMonitoring() {
    const res = await fetch('/api/monitoring')
    setMonitoringData(await res.json())
  }

  async function checkRpcHealth() {
    setRpcLoading(true)
    try {
      const res = await fetch('/api/rpc-health')
      setRpcHealth(await res.json())
    } catch (e) {
      console.error('RPC health check failed:', e)
    }
    setRpcLoading(false)
  }

  async function fetchSystemHealth() {
    try {
      const res = await fetch('/api/system-health')
      setSystemHealth(await res.json())
    } catch (e) {
      console.error('Failed to fetch system health:', e)
    }
  }

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/alerts')
      const data = await res.json()
      setAlerts(data.alerts || [])
      setUnacknowledgedAlerts(data.unacknowledgedCount || 0)
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
    }
  }

  async function acknowledgeAlert(alertId: string) {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', alertId }),
      })
      fetchAlerts()
    } catch (e) {
      console.error('Failed to acknowledge alert:', e)
    }
  }

  async function acknowledgeAllAlerts() {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge_all' }),
      })
      fetchAlerts()
    } catch (e) {
      console.error('Failed to acknowledge all alerts:', e)
    }
  }

  async function fetchSyncHistory() {
    try {
      const res = await fetch('/api/sync-history')
      setSyncHistory(await res.json())
    } catch (e) {
      console.error('Failed to fetch sync history:', e)
    }
  }

  function startMonitoringInterval() {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
    }
    // Fetch immediately
    fetchSystemHealth()
    fetchAlerts()
    fetchSyncHistory()
    // Then every 4 seconds
    const interval = setInterval(() => {
      fetchSystemHealth()
      fetchAlerts()
      fetchSyncHistory()
    }, 4000)
    setMonitoringInterval(interval)
  }

  function stopMonitoringInterval() {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      setMonitoringInterval(null)
    }
  }

  async function fetchSchema() {
    try {
      const res = await fetch('/api/schema')
      setSchemaData(await res.json())
    } catch (e) {
      console.error('Failed to fetch schema:', e)
    }
  }

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      setNotificationSettings(await res.json())
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    }
  }

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_webhook', ...webhookForm }),
    })
    setWebhookForm({ name: '', url: '', events: [] })
    fetchNotifications()
  }

  async function addEmail(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_email', ...emailForm }),
    })
    setEmailForm({ name: '', email: '', events: [] })
    fetchNotifications()
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_rule',
        ...ruleForm,
        chain: ruleForm.chain ? parseInt(ruleForm.chain) : null,
        threshold: parseInt(ruleForm.threshold),
      }),
    })
    setRuleForm({ name: '', type: 'sync_behind', chain: '', threshold: '', comparison: 'gt', severity: 'warning' })
    fetchNotifications()
  }

  async function toggleWebhook(id: number, enabled: boolean) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_webhook', id, enabled }),
    })
    fetchNotifications()
  }

  async function toggleEmail(id: number, enabled: boolean) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_email', id, enabled }),
    })
    fetchNotifications()
  }

  async function toggleRule(id: number, enabled: boolean) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_rule', id, enabled }),
    })
    fetchNotifications()
  }

  async function deleteWebhook(id: number) {
    if (!confirm('Delete this webhook?')) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_webhook', id }),
    })
    fetchNotifications()
  }

  async function deleteEmail(id: number) {
    if (!confirm('Delete this email notification?')) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_email', id }),
    })
    fetchNotifications()
  }

  async function deleteRule(id: number) {
    if (!confirm('Delete this alert rule?')) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_rule', id }),
    })
    fetchNotifications()
  }

  async function testWebhook(url: string) {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test_webhook', url }),
    })
    const data = await res.json()
    if (data.success) {
      alert('Webhook test successful!')
    } else {
      alert(`Webhook test failed: ${data.error || `HTTP ${data.status}`}`)
    }
  }

  function validateQuery(sql: string): string[] {
    const errors: string[] = []
    if (!schemaData) return errors

    // Check validation rules
    for (const rule of schemaData.validationRules) {
      try {
        const regex = new RegExp(rule.pattern, 'i')
        if (regex.test(sql)) {
          errors.push(rule.message)
        }
      } catch (e) {
        // Invalid regex pattern, skip
      }
    }

    // Basic syntax checks
    const trimmed = sql.trim()
    if (trimmed && !trimmed.toLowerCase().startsWith('select')) {
      errors.push('Query must start with SELECT')
    }

    // Check for unclosed quotes
    const singleQuotes = (sql.match(/'/g) || []).length
    if (singleQuotes % 2 !== 0) {
      errors.push('Unclosed single quote')
    }

    // Check for unclosed parentheses
    const openParens = (sql.match(/\(/g) || []).length
    const closeParens = (sql.match(/\)/g) || []).length
    if (openParens !== closeParens) {
      errors.push('Mismatched parentheses')
    }

    return errors
  }

  // Validate query on change
  useEffect(() => {
    const errors = validateQuery(queryText)
    setQueryErrors(errors)
  }, [queryText, schemaData])

  async function fetchUserDetail(email: string) {
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`)
    setSelectedUser(await res.json())
  }

  // Uses functional setState for stable reference in intervals (avoids stale closures)
  async function fetchStatus() {
    const res = await fetch('/api/status')
    const data = await res.json()
    setSyncStatus(data)

    // Calculate speed for each chain using functional updates to avoid stale closures
    const now = Date.now()

    setPrevBlockCounts(prev => {
      const newSpeeds: Record<number, number> = {}

      for (const [chainStr, status] of Object.entries(data.chainStatus)) {
        const chain = Number(chainStr)
        const currentCount = (status as any).total_blocks || 0
        const prevCount = prev[chain]

        if (prevCount && now - prevCount.time > 0) {
          const blocksDiff = currentCount - prevCount.count
          const timeDiff = (now - prevCount.time) / 1000 // seconds
          if (blocksDiff > 0 && timeDiff > 0) {
            newSpeeds[chain] = Number((blocksDiff / timeDiff).toFixed(2))
          }
        }
      }

      // Update speeds using functional update
      setSyncSpeed(prevSpeeds => ({ ...prevSpeeds, ...newSpeeds }))

      // Return new previous counts
      const newPrevCounts: Record<number, { count: number; time: number }> = {}
      for (const [chainStr, status] of Object.entries(data.chainStatus)) {
        const chain = Number(chainStr)
        newPrevCounts[chain] = { count: (status as any).total_blocks || 0, time: now }
      }
      return newPrevCounts
    })
  }

  function startSyncStream() {
    if (eventSource) {
      eventSource.close()
    }
    const es = new EventSource('/api/sync-stream')
    es.onopen = () => setSseConnected(true)
    es.onerror = () => setSseConnected(false)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setSyncEvents(prev => [...prev.slice(-99), { ...data, timestamp: Date.now() }])
      } catch {}
    }
    setEventSource(es)
  }

  function stopSyncStream() {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
      setSseConnected(false)
    }
  }

  async function decodeEvent() {
    try {
      const topics = topicsInput.split('\n').filter(t => t.trim())
      const res = await fetch('/api/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          abi: abiInput,
          topics,
          data: dataInput || '0x',
        }),
      })
      setDecodedResult(await res.json())
    } catch (e: any) {
      setDecodedResult({ success: false, error: e.message })
    }
  }

  const [liveQueryError, setLiveQueryError] = useState<string | null>(null)

  function startLiveQuery() {
    if (liveQuerySource) {
      liveQuerySource.close()
      setLiveQuerySource(null)
    }
    setLiveQueryResults([])
    setLiveQueryConnected(false)
    setLiveQueryError(null)

    const signatures = eventSignatures
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .join('|||')

    const params = new URLSearchParams({
      chain: queryChain,
      query: queryText,
      event_signatures: signatures,
    })

    // Add API key if provided to bypass rate limiting
    if (apiKey) {
      params.set('api_key', apiKey)
    }

    const es = new EventSource(`/api/query-live?${params.toString()}`)
    es.onopen = () => {
      setLiveQueryConnected(true)
      setLiveQueryError(null)
    }
    es.onerror = (err) => {
      setLiveQueryConnected(false)
      setLiveQueryError('Connection failed - try adding an API key or check backend availability')
      es.close()
      setLiveQuerySource(null)
    }
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.result) {
          // Transform result format
          const rawResult = data.result[0] || []
          if (rawResult.length > 1) {
            const columns = rawResult[0] as string[]
            const rows = rawResult.slice(1).map((row: any[]) => {
              const obj: Record<string, any> = {}
              columns.forEach((col, i) => {
                obj[col] = row[i]
              })
              return obj
            })
            setLiveQueryResults(prev => [...rows, ...prev].slice(0, 100))
          }
        }
      } catch {}
    }
    setLiveQuerySource(es)
  }

  function stopLiveQuery() {
    if (liveQuerySource) {
      liveQuerySource.close()
      setLiveQuerySource(null)
      setLiveQueryConnected(false)
    }
  }

  async function executeQuery() {
    if (liveQueryEnabled) {
      startLiveQuery()
      return
    }

    setQueryLoading(true)
    setQueryResult(null)
    setQueryTime(null)
    const start = Date.now()
    try {
      const signatures = eventSignatures
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          chain: queryChain,
          event_signatures: signatures,
        }),
      })
      const data = await res.json()
      setQueryResult(data)
      setQueryTime(Date.now() - start)
    } catch (e: any) {
      setQueryResult({ success: false, error: e.message })
      setQueryTime(Date.now() - start)
    }
    setQueryLoading(false)
  }

  async function addNetwork(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/networks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain: parseInt(networkForm.chain),
        name: networkForm.name,
        url: networkForm.url,
        enabled: networkForm.enabled,
        batch_size: parseInt(networkForm.batch_size),
        concurrency: parseInt(networkForm.concurrency),
        start_block: networkForm.start_block ? parseInt(networkForm.start_block) : null,
      }),
    })
    setNetworkForm({ chain: '', name: '', url: '', enabled: false, batch_size: '2000', concurrency: '10', start_block: '' })
    fetchNetworks()
  }

  async function deleteNetwork(chain: number) {
    if (!confirm(`Delete network ${chain}?`)) return
    await fetch(`/api/networks?chain=${chain}`, { method: 'DELETE' })
    fetchNetworks()
  }

  async function toggleNetwork(network: Network) {
    await fetch('/api/networks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...network, enabled: !network.enabled }),
    })
    fetchNetworks()
  }

  async function updateNetwork(network: Network, updates: Partial<Network>) {
    await fetch('/api/networks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...network, ...updates }),
    })
    fetchNetworks()
  }

  async function addKey(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_email: keyForm.owner_email,
        origins: keyForm.origins ? keyForm.origins.split(',').map(s => s.trim()) : [],
      }),
    })
    const data = await res.json()
    alert(`API Key created: ${data.secret}`)
    setKeyForm({ owner_email: '', origins: '' })
    fetchKeys()
  }

  async function deleteKey(secret: string) {
    if (!confirm('Delete this API key?')) return
    await fetch(`/api/keys?secret=${secret}`, { method: 'DELETE' })
    fetchKeys()
  }

  async function createAdminKey() {
    try {
      const res = await fetch('/api/admin-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org: 'admin' }),
      })
      const data = await res.json()
      if (data.secret) {
        alert(`Admin key created: ${data.secret}\n\nThis key has unlimited access (1000 connections, 500K queries). Use it in the Query tab for Live Mode.`)
        fetchAdminKeys()
      } else if (data.error) {
        alert(`Error creating admin key: ${data.error}`)
      }
    } catch (e: any) {
      alert(`Failed to create admin key: ${e.message}`)
    }
  }

  async function deleteAdminKey(secret: string) {
    if (!confirm('Delete this admin key?')) return
    await fetch(`/api/admin-key?secret=${secret}`, { method: 'DELETE' })
    fetchAdminKeys()
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  // Dark mode colors - memoized to prevent object recreation on every render
  const colors = useMemo(() => ({
    bg: darkMode ? '#1a1a2e' : '#f5f5f5',
    cardBg: darkMode ? '#16213e' : '#fff',
    text: darkMode ? '#e4e4e7' : '#333',
    textMuted: darkMode ? '#9ca3af' : '#666',
    border: darkMode ? '#374151' : '#ddd',
    borderLight: darkMode ? '#2d3748' : '#eee',
    inputBg: darkMode ? '#1f2937' : '#fff',
    statBg: darkMode ? '#1f2937' : '#f8f9fa',
    primary: '#007bff',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    secondary: '#6c757d',
  }), [darkMode])

  // Styles - memoized to prevent object recreation on every render
  const styles = useMemo(() => ({
    page: { minHeight: '100vh', background: colors.bg, color: colors.text, padding: '20px', transition: 'all 0.3s ease' },
    container: { maxWidth: '1200px', margin: '0 auto' },
    header: { marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '10px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' as const },
    tab: (active: boolean) => ({
      padding: '8px 16px',
      background: active ? colors.primary : colors.cardBg,
      color: active ? '#fff' : colors.text,
      border: `1px solid ${active ? colors.primary : colors.border}`,
      cursor: 'pointer',
      borderRadius: '4px',
      fontSize: '14px',
      transition: 'all 0.2s ease',
    }),
    card: { background: colors.cardBg, padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${colors.border}` },
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '14px' },
    th: { textAlign: 'left' as const, padding: '10px', borderBottom: `2px solid ${colors.borderLight}`, color: colors.textMuted, fontSize: '12px', textTransform: 'uppercase' as const },
    td: { padding: '10px', borderBottom: `1px solid ${colors.borderLight}` },
    input: { padding: '8px', border: `1px solid ${colors.border}`, borderRadius: '4px', marginRight: '10px', marginBottom: '10px', background: colors.inputBg, color: colors.text },
    button: { padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'opacity 0.2s' },
    deleteBtn: { padding: '4px 8px', background: colors.danger, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    viewBtn: { padding: '4px 8px', background: colors.primary, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
    toggleBtn: (enabled: boolean) => ({
      padding: '4px 8px',
      background: enabled ? colors.success : colors.secondary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    }),
    badge: (color: string) => ({
      padding: '2px 8px',
      background: color,
      color: '#fff',
      borderRadius: '12px',
      fontSize: '12px',
    }),
    backBtn: { padding: '8px 16px', background: colors.secondary, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' },
    stat: { display: 'inline-block', marginRight: '20px', padding: '10px 15px', background: colors.statBg, borderRadius: '4px' },
    inlineInput: { width: '70px', padding: '4px 6px', border: `1px solid ${colors.border}`, borderRadius: '4px', textAlign: 'center' as const, background: colors.inputBg, color: colors.text },
    searchInput: { padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: '4px', background: colors.inputBg, color: colors.text, width: '200px', fontSize: '14px' },
    darkModeBtn: { padding: '8px 12px', background: darkMode ? colors.warning : colors.secondary, color: darkMode ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
    commandPalette: {
      position: 'fixed' as const,
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '100px',
      zIndex: 1000,
    },
    commandBox: {
      background: colors.cardBg,
      borderRadius: '8px',
      width: '500px',
      maxWidth: '90vw',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      border: `1px solid ${colors.border}`,
    },
    shortcutKey: { display: 'inline-block', padding: '2px 6px', background: colors.statBg, borderRadius: '3px', fontSize: '11px', marginLeft: '8px', fontFamily: 'monospace' },
  }), [colors, darkMode])

  // Filter data based on search query - memoized to prevent recalculation on every render
  const searchLower = useMemo(() => searchQuery.toLowerCase(), [searchQuery])

  const filteredNetworks = useMemo(() =>
    networks.filter(n =>
      searchQuery === '' ||
      n.name.toLowerCase().includes(searchLower) ||
      n.chain.toString().includes(searchQuery) ||
      n.url.toLowerCase().includes(searchLower)
    ),
    [networks, searchQuery, searchLower]
  )

  const filteredKeys = useMemo(() =>
    keys.filter(k =>
      searchQuery === '' ||
      k.owner_email.toLowerCase().includes(searchLower) ||
      k.secret.toLowerCase().includes(searchLower)
    ),
    [keys, searchQuery, searchLower]
  )

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      searchQuery === '' ||
      u.email.toLowerCase().includes(searchLower) ||
      (u.plan_name && u.plan_name.toLowerCase().includes(searchLower))
    ),
    [users, searchQuery, searchLower]
  )

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Command Palette */}
        {showCommandPalette && (
          <div style={styles.commandPalette} onClick={() => setShowCommandPalette(false)}>
            <div style={styles.commandBox} onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                type="text"
                placeholder="Search or type a command..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setShowCommandPalette(false)
                    setSearchQuery('')
                  }
                }}
                style={{ width: '100%', padding: '15px', fontSize: '16px', border: 'none', borderBottom: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, outline: 'none' }}
              />
              <div style={{ padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                <div style={{ padding: '8px', color: colors.textMuted, fontSize: '12px', textTransform: 'uppercase' }}>Keyboard Shortcuts</div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Networks</span><span style={styles.shortcutKey}>1</span>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>API Keys</span><span style={styles.shortcutKey}>2</span>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Users</span><span style={styles.shortcutKey}>3</span>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sync Status</span><span style={styles.shortcutKey}>4</span>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Query</span><span style={styles.shortcutKey}>5</span>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Live Sync</span><span style={styles.shortcutKey}>6</span>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Event Decoder</span><span style={styles.shortcutKey}>7</span>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Monitoring</span><span style={styles.shortcutKey}>8</span>
                </div>
                <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: '8px', paddingTop: '8px' }}>
                  <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Toggle Dark Mode</span><span style={styles.shortcutKey}>D</span>
                  </div>
                  <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Refresh</span><span style={styles.shortcutKey}>R</span>
                  </div>
                  <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Close</span><span style={styles.shortcutKey}>Esc</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={{ margin: 0, fontSize: '24px' }}>Golden Axe Admin</h1>
            <input
              type="text"
              placeholder="Search... (Ctrl+K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              onFocus={() => setShowCommandPalette(true)}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {searchQuery && (
              <button
                style={{ ...styles.button, background: colors.secondary, padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setSearchQuery('')}
              >
                Clear filter
              </button>
            )}
            <button style={styles.darkModeBtn} onClick={() => setDarkMode((d: boolean) => !d)}>
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              style={{ ...styles.button, background: colors.danger, padding: '6px 12px', fontSize: '12px' }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={styles.tabs}>
        <button style={styles.tab(tab === 'networks')} onClick={() => setTab('networks')}>Networks</button>
        <button style={styles.tab(tab === 'users')} onClick={() => { setTab('users'); fetchUsers(); fetchKeys(); fetchAdminKeys(); }}>Users</button>
        <button style={styles.tab(tab === 'sync')} onClick={() => { setTab('sync'); fetchStatus(); }}>Sync</button>
        <button style={styles.tab(tab === 'query')} onClick={() => { setTab('query'); fetchSchema(); }}>Query</button>
        <button style={styles.tab(tab === 'system')} onClick={() => { setTab('system'); fetchMonitoring(); checkRpcHealth(); startMonitoringInterval(); }}>
          System
          {unacknowledgedAlerts > 0 && (
            <span style={{ marginLeft: '5px', background: '#dc3545', color: '#fff', borderRadius: '10px', padding: '2px 6px', fontSize: '11px' }}>{unacknowledgedAlerts}</span>
          )}
        </button>
        <button style={styles.tab(tab === 'notifications')} onClick={() => { setTab('notifications'); fetchNotifications(); }}>
          Notifications
        </button>
      </div>

      {tab === 'networks' && (
        <>
          <div style={styles.card}>
            <h3>Add Network</h3>
            <form onSubmit={addNetwork}>
              <input style={styles.input} placeholder="Chain ID" value={networkForm.chain} onChange={e => setNetworkForm({ ...networkForm, chain: e.target.value })} required />
              <input style={styles.input} placeholder="Name" value={networkForm.name} onChange={e => setNetworkForm({ ...networkForm, name: e.target.value })} required />
              <input style={{ ...styles.input, width: '300px' }} placeholder="RPC URL" value={networkForm.url} onChange={e => setNetworkForm({ ...networkForm, url: e.target.value })} required />
              <input style={styles.input} placeholder="Batch Size" value={networkForm.batch_size} onChange={e => setNetworkForm({ ...networkForm, batch_size: e.target.value })} />
              <input style={styles.input} placeholder="Concurrency" value={networkForm.concurrency} onChange={e => setNetworkForm({ ...networkForm, concurrency: e.target.value })} />
              <input style={styles.input} placeholder="Start Block" value={networkForm.start_block} onChange={e => setNetworkForm({ ...networkForm, start_block: e.target.value })} />
              <label style={{ marginRight: '10px' }}>
                <input type="checkbox" checked={networkForm.enabled} onChange={e => setNetworkForm({ ...networkForm, enabled: e.target.checked })} /> Enabled
              </label>
              <button style={styles.button} type="submit">Add Network</button>
            </form>
          </div>

          <div style={styles.card}>
            <h3>Networks</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Chain</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>URL</th>
                  <th style={styles.th}>Batch</th>
                  <th style={styles.th}>Concurrency</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNetworks.map(n => (
                  <tr key={n.chain}>
                    <td style={styles.td}>{n.chain}</td>
                    <td style={styles.td}>{n.name}</td>
                    <td style={styles.td}>
                      <input
                        type="text"
                        style={{ ...styles.inlineInput, width: '200px', textAlign: 'left' as const }}
                        value={n.url}
                        onChange={e => {
                          const newVal = e.target.value
                          setNetworks(networks.map(net => net.chain === n.chain ? { ...net, url: newVal } : net))
                        }}
                        onBlur={e => updateNetwork(n, { url: e.target.value })}
                        title={n.url}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        style={styles.inlineInput}
                        value={n.batch_size}
                        onChange={e => {
                          const newVal = parseInt(e.target.value) || 10
                          setNetworks(networks.map(net => net.chain === n.chain ? { ...net, batch_size: newVal } : net))
                        }}
                        onBlur={e => updateNetwork(n, { batch_size: parseInt(e.target.value) || 10 })}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        style={styles.inlineInput}
                        value={n.concurrency}
                        onChange={e => {
                          const newVal = parseInt(e.target.value) || 1
                          setNetworks(networks.map(net => net.chain === n.chain ? { ...net, concurrency: newVal } : net))
                        }}
                        onBlur={e => updateNetwork(n, { concurrency: parseInt(e.target.value) || 1 })}
                      />
                    </td>
                    <td style={styles.td}>
                      <button style={styles.toggleBtn(n.enabled)} onClick={() => toggleNetwork(n)}>
                        {n.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.deleteBtn} onClick={() => deleteNetwork(n.chain)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'users' && !selectedUser && (
        <>
          <div style={styles.card}>
            <h3>Add API Key</h3>
            <form onSubmit={addKey}>
              <input style={styles.input} placeholder="Owner Email" value={keyForm.owner_email} onChange={e => setKeyForm({ ...keyForm, owner_email: e.target.value })} required />
              <input style={styles.input} placeholder="Origins (comma-separated)" value={keyForm.origins} onChange={e => setKeyForm({ ...keyForm, origins: e.target.value })} />
              <button style={styles.button} type="submit">Create Key</button>
            </form>
          </div>

          <div style={styles.card}>
            <h3>API Keys</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Owner</th>
                  <th style={styles.th}>Secret</th>
                  <th style={styles.th}>Origins</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map(k => (
                  <tr key={k.secret} style={{ opacity: k.deleted_at ? 0.5 : 1 }}>
                    <td style={styles.td}>{k.owner_email}</td>
                    <td style={styles.td}><code>{k.secret.substring(0, 8)}...</code></td>
                    <td style={styles.td}>{k.origins.join(', ') || '-'}</td>
                    <td style={styles.td}>{new Date(k.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>{k.deleted_at ? 'Deleted' : 'Active'}</td>
                    <td style={styles.td}>
                      {!k.deleted_at && (
                        <button style={styles.deleteBtn} onClick={() => deleteKey(k.secret)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Admin Keys Section */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Admin Keys (Unlimited)</h3>
                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '5px 0 0 0' }}>
                  Admin keys have 1000 connections and 500K queries/month. Use for admin panel and testing.
                </p>
              </div>
              <button style={styles.button} onClick={createAdminKey}>Create Admin Key</button>
            </div>
            {adminKeys.length === 0 ? (
              <p style={{ color: colors.textMuted }}>No admin keys. Click "Create Admin Key" to generate one.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Org</th>
                    <th style={styles.th}>Secret</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminKeys.filter(k => !k.deleted_at).map(k => (
                    <tr key={k.secret}>
                      <td style={styles.td}>{k.org}</td>
                      <td style={styles.td}>
                        <code style={{ background: colors.statBg, padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}
                              onClick={() => { navigator.clipboard.writeText(k.secret); alert('Copied to clipboard!') }}
                              title="Click to copy">
                          {k.secret}
                        </code>
                      </td>
                      <td style={styles.td}>{new Date(k.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}><span style={{ ...styles.badge('#28a745') }}>Active</span></td>
                      <td style={styles.td}>
                        <button style={styles.deleteBtn} onClick={() => deleteAdminKey(k.secret)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'users' && !selectedUser && (
        <div style={styles.card}>
          <h3>Users</h3>
          {users.length === 0 ? (
            <p style={{ color: '#666' }}>No users found</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Plan</th>
                  <th style={styles.th}>API Keys</th>
                  <th style={styles.th}>Queries (30d)</th>
                  <th style={styles.th}>Last Active</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.email}>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      {u.plan_name ? (
                        <span style={styles.badge(u.plan_name === 'Pro' ? '#007bff' : u.plan_name === 'Dedicated' ? '#6f42c1' : '#28a745')}>
                          {u.plan_name}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>No plan</span>
                      )}
                    </td>
                    <td style={styles.td}>{u.key_count}</td>
                    <td style={styles.td}>{u.queries_30d.toLocaleString()}</td>
                    <td style={styles.td}>{u.last_active ? new Date(u.last_active).toLocaleDateString() : '-'}</td>
                    <td style={styles.td}>
                      <button style={styles.viewBtn} onClick={() => fetchUserDetail(u.email)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'users' && selectedUser && (
        <>
          <button style={styles.backBtn} onClick={() => setSelectedUser(null)}>← Back to Users</button>

          <div style={styles.card}>
            <h3>{selectedUser.email}</h3>
            <div style={{ marginBottom: '15px' }}>
              <div style={styles.stat}>
                <strong>API Keys:</strong> {selectedUser.keys.filter(k => !k.deleted_at).length}
              </div>
              <div style={styles.stat}>
                <strong>Plan Changes:</strong> {selectedUser.plans.length}
              </div>
              <div style={styles.stat}>
                <strong>Collaborators:</strong> {selectedUser.collabs.filter(c => !c.disabled_at).length}
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h4>API Keys</h4>
            {selectedUser.keys.length === 0 ? (
              <p style={{ color: '#666' }}>No API keys</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Secret</th>
                    <th style={styles.th}>Origins</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUser.keys.map(k => (
                    <tr key={k.secret} style={{ opacity: k.deleted_at ? 0.5 : 1 }}>
                      <td style={styles.td}><code>{k.secret}</code></td>
                      <td style={styles.td}>{k.origins.join(', ') || '-'}</td>
                      <td style={styles.td}>{new Date(k.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>{k.deleted_at ? 'Deleted' : 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.card}>
            <h4>Plan History</h4>
            {selectedUser.plans.length === 0 ? (
              <p style={{ color: '#666' }}>No plan history</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Plan</th>
                    <th style={styles.th}>Rate</th>
                    <th style={styles.th}>Timeout</th>
                    <th style={styles.th}>Connections</th>
                    <th style={styles.th}>Queries</th>
                    <th style={styles.th}>Payment</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUser.plans.map((p, i) => (
                    <tr key={i}>
                      <td style={styles.td}><span style={styles.badge('#007bff')}>{p.name}</span></td>
                      <td style={styles.td}>{p.rate}/s</td>
                      <td style={styles.td}>{p.timeout}s</td>
                      <td style={styles.td}>{p.connections}</td>
                      <td style={styles.td}>{p.queries.toLocaleString()}</td>
                      <td style={styles.td}>
                        {p.daimo_tx ? 'Daimo' : p.stripe_customer ? 'Stripe' : '-'}
                      </td>
                      <td style={styles.td}>{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.card}>
            <h4>Usage (Last 30 Days)</h4>
            {selectedUser.usage.length === 0 ? (
              <p style={{ color: '#666' }}>No usage data</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '2px' }}>
                {selectedUser.usage.slice().reverse().map((u, i) => {
                  const max = Math.max(...selectedUser.usage.map(x => x.queries))
                  const height = max > 0 ? (u.queries / max) * 130 : 0
                  return (
                    <div
                      key={i}
                      title={`${u.day}: ${u.queries.toLocaleString()} queries`}
                      style={{
                        flex: 1,
                        height: `${height}px`,
                        background: '#007bff',
                        borderRadius: '2px 2px 0 0',
                        minWidth: '8px',
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {selectedUser.collabs.length > 0 && (
            <div style={styles.card}>
              <h4>Collaborators</h4>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Added</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUser.collabs.map((c, i) => (
                    <tr key={i} style={{ opacity: c.disabled_at ? 0.5 : 1 }}>
                      <td style={styles.td}>{c.email}</td>
                      <td style={styles.td}>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>{c.disabled_at ? 'Disabled' : 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'sync' && (
        <>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Sync Status</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={e => setAutoRefresh(e.target.checked)}
                    style={{ marginRight: '5px' }}
                  />
                  Auto-refresh (5s)
                </label>
                <button style={styles.button} onClick={fetchStatus}>Refresh</button>
              </div>
            </div>

            {!syncStatus ? (
              <p style={{ color: '#666' }}>Loading...</p>
            ) : (
              <>
                <div style={{ marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                  <strong>Database:</strong>
                  {syncStatus.dbConnected ? (
                    <span style={{ ...styles.badge('#28a745'), marginLeft: '10px' }}>Connected - Syncing</span>
                  ) : (
                    <span style={{ ...styles.badge('#ffc107'), marginLeft: '10px' }}>No sync data yet</span>
                  )}
                </div>

                <h4>Enabled Chains ({syncStatus.config.length})</h4>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Chain</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Batch Size</th>
                      <th style={styles.th}>Concurrency</th>
                      <th style={styles.th}>Start Block</th>
                      <th style={styles.th}>Synced Block</th>
                      <th style={styles.th}>Blocks</th>
                      <th style={styles.th}>Logs</th>
                      <th style={styles.th}>Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncStatus.config.map(c => {
                      const status = syncStatus.chainStatus[c.chain]
                      return (
                        <tr key={c.chain}>
                          <td style={styles.td}>{c.chain}</td>
                          <td style={styles.td}>{c.name}</td>
                          <td style={styles.td}>{c.batch_size}</td>
                          <td style={styles.td}>{c.concurrency}</td>
                          <td style={styles.td}>{c.start_block?.toLocaleString() || '-'}</td>
                          <td style={styles.td}>
                            {status?.latest_synced_block ? (
                              <strong>{status.latest_synced_block.toLocaleString()}</strong>
                            ) : (
                              <span style={{ color: '#999' }}>-</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {status?.total_blocks ? (
                              status.total_blocks.toLocaleString()
                            ) : (
                              <span style={{ color: '#999' }}>0</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {status?.total_logs ? (
                              status.total_logs.toLocaleString()
                            ) : (
                              <span style={{ color: '#999' }}>0</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {syncSpeed[c.chain] ? (
                              <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                                {syncSpeed[c.chain]} blk/s
                              </span>
                            ) : (
                              <span style={{ color: '#999' }}>-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {Object.keys(syncStatus.chainStatus).length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>Sync Summary</h4>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      {Object.entries(syncStatus.chainStatus).map(([chain, status]) => {
                        const config = syncStatus.config.find(c => c.chain === Number(chain))
                        return (
                          <div key={chain} style={{ ...styles.stat, minWidth: '200px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{config?.name || `Chain ${chain}`}</div>
                            <div>Block: {status.latest_synced_block?.toLocaleString() || '-'}</div>
                            <div>Blocks: {status.total_blocks?.toLocaleString() || 0}</div>
                            <div>Logs: {status.total_logs?.toLocaleString() || 0}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {tab === 'query' && (
        <>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {/* Main Query Panel */}
            <div style={{ flex: '1 1 600px', minWidth: '300px' }}>
              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0 }}>SQL Query</h3>
                  <button
                    style={{ ...styles.button, background: colors.secondary, padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => setShowHelper(!showHelper)}
                  >
                    {showHelper ? 'Hide Helper' : 'Show Helper'}
                  </button>
                </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ marginRight: '10px' }}>
                <strong>Chain:</strong>
                <select
                  value={queryChain}
                  onChange={e => setQueryChain(e.target.value)}
                  style={{ ...styles.input, marginLeft: '10px', width: '200px' }}
                >
                  {networks.filter(n => n.enabled).map(n => (
                    <option key={n.chain} value={n.chain}>{n.name} ({n.chain})</option>
                  ))}
                  {networks.filter(n => n.enabled).length === 0 && (
                    <>
                      <option value="1">Main (1)</option>
                      <option value="7777777">Zora (7777777)</option>
                    </>
                  )}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Event Signatures <span style={{ fontWeight: 'normal', color: '#666' }}>(one per line, enables ABI decoding)</span>
              </label>
              <textarea
                value={eventSignatures}
                onChange={e => setEventSignatures(e.target.value)}
                placeholder="Transfer(address indexed from, address indexed to, uint256 value)
Approval(address indexed owner, address indexed spender, uint256 value)"
                style={{
                  width: '100%',
                  height: '80px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>SQL Query</label>
              <textarea
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                style={{
                  width: '100%',
                  height: '200px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
                placeholder="Enter SQL query..."
              />
              {/* Validation Errors */}
              {queryErrors.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', background: darkMode ? '#4a1c1c' : '#f8d7da', color: darkMode ? '#f8d7da' : '#721c24', borderRadius: '4px', fontSize: '13px' }}>
                  <strong>Validation Issues:</strong>
                  <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                    {queryErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {queryErrors.length === 0 && queryText.trim() && (
                <div style={{ marginTop: '10px', padding: '8px 10px', background: darkMode ? '#1c4a1c' : '#d4edda', color: darkMode ? '#d4edda' : '#155724', borderRadius: '4px', fontSize: '13px' }}>
                  ✓ Query looks valid
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                style={{ ...styles.button, opacity: queryLoading ? 0.7 : 1 }}
                onClick={executeQuery}
                disabled={queryLoading}
              >
                {liveQueryEnabled ? (liveQueryConnected ? 'Streaming...' : 'Start Live') : (queryLoading ? 'Running...' : 'Run Query')}
              </button>
              {liveQueryEnabled && liveQueryConnected && (
                <button style={{ ...styles.button, background: '#dc3545' }} onClick={stopLiveQuery}>
                  Stop
                </button>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={liveQueryEnabled}
                  onChange={e => {
                    setLiveQueryEnabled(e.target.checked)
                    if (!e.target.checked) stopLiveQuery()
                  }}
                />
                <strong>Live Mode</strong>
                <span style={{ color: '#666', fontSize: '12px' }}>(streams new results as blocks sync)</span>
              </label>
              {liveQueryEnabled && (
                <input
                  type="text"
                  placeholder="API Key (optional, bypasses rate limits)"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  style={{ ...styles.input, width: '280px', marginBottom: 0 }}
                />
              )}
              {!liveQueryEnabled && queryTime !== null && (
                <span style={{ color: '#666' }}>Completed in {queryTime}ms</span>
              )}
              {liveQueryEnabled && liveQueryConnected && (
                <span style={{ ...styles.badge('#28a745') }}>Connected - {liveQueryResults.length} results</span>
              )}
              {liveQueryEnabled && liveQueryError && (
                <span style={{ ...styles.badge('#dc3545') }}>{liveQueryError}</span>
              )}
            </div>
              </div>

              {/* Live Results - inside main panel */}
              {liveQueryEnabled && liveQueryResults.length > 0 && (
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>
                      Live Results
                      <span style={{ ...styles.badge('#007bff'), marginLeft: '10px' }}>{liveQueryResults.length} rows</span>
                    </h3>
                    <button style={{ ...styles.button, background: colors.secondary }} onClick={() => setLiveQueryResults([])}>Clear</button>
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                    {liveQueryResults.length > 0 && (
                      <table style={styles.table}>
                        <thead style={{ position: 'sticky', top: 0, background: colors.cardBg }}>
                          <tr>
                            {Object.keys(liveQueryResults[0]).map(key => (
                              <th key={key} style={styles.th}>{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {liveQueryResults.map((row: any, i: number) => (
                            <tr key={i} style={{ background: i === 0 ? (darkMode ? '#1c4a1c' : '#e8f5e9') : 'transparent' }}>
                              {Object.values(row).map((val: any, j: number) => (
                                <td key={j} style={{ ...styles.td, fontFamily: 'monospace', fontSize: '12px' }}>
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* Query Results - inside main panel */}
              {queryResult && !liveQueryEnabled && (
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>
                      Results
                      {queryResult.success ? (
                        <span style={{ ...styles.badge('#28a745'), marginLeft: '10px' }}>Success</span>
                      ) : (
                        <span style={{ ...styles.badge('#dc3545'), marginLeft: '10px' }}>Error</span>
                      )}
                    </h3>
                    {queryResult.status && (
                      <span style={{ color: colors.textMuted }}>Status: {queryResult.status}</span>
                    )}
                  </div>

                  {queryResult.error && (
                    <div style={{ background: darkMode ? '#4a1c1c' : '#f8d7da', color: darkMode ? '#f8d7da' : '#721c24', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
                      {queryResult.error}
                    </div>
                  )}

                  {queryResult.data && (
                    <>
                      {Array.isArray(queryResult.data) ? (
                        <div style={{ overflowX: 'auto' }}>
                          <div style={{ marginBottom: '10px', color: colors.textMuted }}>
                            {queryResult.data.length} rows returned
                          </div>
                          {queryResult.data.length > 0 && (
                            <table style={styles.table}>
                              <thead>
                                <tr>
                                  {Object.keys(queryResult.data[0]).map(key => (
                                    <th key={key} style={styles.th}>{key}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {queryResult.data.map((row: any, i: number) => (
                                  <tr key={i}>
                                    {Object.values(row).map((val: any, j: number) => (
                                      <td key={j} style={{ ...styles.td, fontFamily: 'monospace', fontSize: '12px' }}>
                                        {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ) : (
                        <pre style={{ background: colors.statBg, padding: '15px', borderRadius: '4px', overflow: 'auto', fontSize: '13px' }}>
                          {JSON.stringify(queryResult.data, null, 2)}
                        </pre>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Query Helper Sidebar */}
            {showHelper && (
              <div style={{ flex: '0 0 320px', minWidth: '280px' }}>
                {/* Schema Explorer */}
                <div style={styles.card}>
                  <h4 style={{ margin: '0 0 15px 0' }}>Schema Explorer</h4>
                  {schemaData?.schema ? (
                    <div style={{ fontSize: '13px' }}>
                      {Object.entries(schemaData.schema).map(([table, columns]) => (
                        <div key={table} style={{ marginBottom: '15px' }}>
                          <div
                            style={{ fontWeight: 'bold', cursor: 'pointer', padding: '5px', background: colors.statBg, borderRadius: '4px', marginBottom: '5px' }}
                            onClick={() => setQueryText(prev => prev + (prev ? '\n' : '') + table)}
                          >
                            📋 {table}
                          </div>
                          <div style={{ paddingLeft: '10px' }}>
                            {columns.map(col => (
                              <div
                                key={col.name}
                                style={{ padding: '3px 5px', cursor: 'pointer', borderRadius: '3px', display: 'flex', justifyContent: 'space-between' }}
                                onClick={() => setQueryText(prev => prev + col.name)}
                                title={`Click to insert "${col.name}"`}
                              >
                                <span>{col.name}</span>
                                <span style={{ color: colors.textMuted, fontSize: '11px' }}>{col.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: colors.textMuted }}>Loading schema...</p>
                  )}
                </div>

                {/* Query Templates */}
                <div style={styles.card}>
                  <h4 style={{ margin: '0 0 15px 0' }}>Query Templates</h4>
                  {schemaData?.templates ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {schemaData.templates.map((t, i) => (
                        <button
                          key={i}
                          style={{
                            padding: '10px',
                            background: colors.statBg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            color: colors.text,
                          }}
                          onClick={() => {
                            setQueryText(t.query)
                            if (t.eventSignature) setEventSignatures(t.eventSignature)
                          }}
                          title={t.description}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>{t.name}</div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>{t.description}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: colors.textMuted }}>Loading templates...</p>
                  )}
                </div>

                {/* Quick Reference */}
                <div style={styles.card}>
                  <h4 style={{ margin: '0 0 15px 0' }}>Quick Reference</h4>
                  <div style={{ fontSize: '12px', color: colors.textMuted }}>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: colors.text }}>Hex literals:</strong>
                      <code style={{ display: 'block', marginTop: '3px', padding: '5px', background: colors.statBg, borderRadius: '3px' }}>
                        '\x1234...'
                      </code>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: colors.text }}>Array access:</strong>
                      <code style={{ display: 'block', marginTop: '3px', padding: '5px', background: colors.statBg, borderRadius: '3px' }}>
                        topics[1], topics[2]
                      </code>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: colors.text }}>Count rows:</strong>
                      <code style={{ display: 'block', marginTop: '3px', padding: '5px', background: colors.statBg, borderRadius: '3px' }}>
                        count(1) not count(*)
                      </code>
                    </div>
                    <div>
                      <strong style={{ color: colors.text }}>Decode logs:</strong>
                      <code style={{ display: 'block', marginTop: '3px', padding: '5px', background: colors.statBg, borderRadius: '3px' }}>
                        Add event signature above
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </>
      )}

      {tab === 'sync' && (
        <>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>
                Live Sync Monitor
                {sseConnected ? (
                  <span style={{ ...styles.badge('#28a745'), marginLeft: '10px' }}>Connected</span>
                ) : (
                  <span style={{ ...styles.badge('#dc3545'), marginLeft: '10px' }}>Disconnected</span>
                )}
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={styles.button} onClick={startSyncStream}>Reconnect</button>
                <button style={{ ...styles.button, background: '#dc3545' }} onClick={stopSyncStream}>Stop</button>
                <button style={{ ...styles.button, background: '#6c757d' }} onClick={() => setSyncEvents([])}>Clear</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              {[1, 7777777].map(chain => {
                const chainEvents = syncEvents.filter(e => e.chain === chain)
                const latest = chainEvents.filter(e => e.new_block === 'local').slice(-1)[0]
                const remote = chainEvents.filter(e => e.new_block === 'remote').slice(-1)[0]
                return (
                  <div key={chain} style={{ ...styles.stat, minWidth: '200px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      {chain === 1 ? 'Mainnet' : chain === 7777777 ? 'Zora' : `Chain ${chain}`}
                    </div>
                    <div>Local: {latest?.num?.toLocaleString() || '-'}</div>
                    <div>Remote: {remote?.num?.toLocaleString() || '-'}</div>
                    {latest && remote && (
                      <div style={{ color: remote.num! - latest.num! > 100 ? '#dc3545' : '#28a745' }}>
                        Behind: {(remote.num! - latest.num!).toLocaleString()}
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={styles.stat}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Connections</div>
                <div>{syncEvents.filter(e => e.active_connections !== undefined).slice(-1)[0]?.active_connections ?? '-'}</div>
              </div>
            </div>

            <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '15px', borderRadius: '4px', height: '400px', overflow: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
              {syncEvents.slice().reverse().map((event, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#888' }}>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  {event.chain && (
                    <>
                      <span style={{ color: '#569cd6' }}> [{event.chain === 1 ? 'ETH' : event.chain === 7777777 ? 'ZORA' : event.chain}]</span>
                      <span style={{ color: event.new_block === 'local' ? '#4ec9b0' : '#ce9178' }}> {event.new_block}</span>
                      <span style={{ color: '#b5cea8' }}> #{event.num?.toLocaleString()}</span>
                    </>
                  )}
                  {event.active_connections !== undefined && (
                    <span style={{ color: '#dcdcaa' }}> connections: {event.active_connections}</span>
                  )}
                </div>
              ))}
              {syncEvents.length === 0 && <div style={{ color: '#888' }}>Waiting for events...</div>}
            </div>
          </div>
        </>
      )}

      {tab === 'query' && (
        <>
          <div style={styles.card}>
            <h3>Event Decoder</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>Decode raw event logs using an ABI signature</p>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ABI (event signature or JSON)</label>
              <textarea
                value={abiInput}
                onChange={e => setAbiInput(e.target.value)}
                placeholder="event Transfer(address indexed from, address indexed to, uint256 value)"
                style={{
                  width: '100%',
                  height: '80px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Topics (one per line)</label>
              <textarea
                value={topicsInput}
                onChange={e => setTopicsInput(e.target.value)}
                placeholder="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
0x000000000000000000000000abc...
0x000000000000000000000000def..."
                style={{
                  width: '100%',
                  height: '100px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Data (hex)</label>
              <textarea
                value={dataInput}
                onChange={e => setDataInput(e.target.value)}
                placeholder="0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"
                style={{
                  width: '100%',
                  height: '60px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>

            <button style={styles.button} onClick={decodeEvent}>Decode Event</button>
          </div>

          {decodedResult && (
            <div style={styles.card}>
              <h4>
                Result
                {decodedResult.success ? (
                  <span style={{ ...styles.badge('#28a745'), marginLeft: '10px' }}>Decoded</span>
                ) : (
                  <span style={{ ...styles.badge('#dc3545'), marginLeft: '10px' }}>Error</span>
                )}
              </h4>

              {decodedResult.error && (
                <div style={{ background: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '4px' }}>
                  {decodedResult.error}
                </div>
              )}

              {decodedResult.success && (
                <div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Event:</strong> <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>{decodedResult.eventName}</code>
                  </div>
                  <div>
                    <strong>Arguments:</strong>
                    <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px', overflow: 'auto', fontSize: '13px' }}>
                      {JSON.stringify(decodedResult.args, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={styles.card}>
            <h4>Example: ERC-20 Transfer</h4>
            <button
              style={{ ...styles.button, background: '#6c757d' }}
              onClick={() => {
                setAbiInput('event Transfer(address indexed from, address indexed to, uint256 value)')
                setTopicsInput(`0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
0x000000000000000000000000a9d1e08c7793af67e9d92fe308d5697fb81d3e43
0x00000000000000000000000028c6c06298d514db089934071355e5743bf21d60`)
                setDataInput('0x00000000000000000000000000000000000000000000000000000000773594d8')
              }}
            >
              Load Example
            </button>
          </div>
        </>
      )}

      {tab === 'system' && (
        <>
          {/* Database Size */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Database Size</h3>
              <button style={styles.button} onClick={fetchMonitoring}>Refresh</button>
            </div>

            {monitoringData?.dbSize && (
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
                <strong>Total Database Size:</strong>{' '}
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                  {monitoringData.dbSize.size}
                </span>
              </div>
            )}

            {monitoringData?.tableSizes && monitoringData.tableSizes.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Table</th>
                    <th style={styles.th}>Size</th>
                    <th style={styles.th}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoringData.tableSizes.map(t => (
                    <tr key={t.tablename}>
                      <td style={styles.td}><code>{t.tablename}</code></td>
                      <td style={styles.td}>{t.size}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '100px', height: '10px', background: '#e9ecef', borderRadius: '5px' }}>
                            <div
                              style={{
                                width: `${Math.min(100, (t.size_bytes / (monitoringData.dbSize?.size_bytes || 1)) * 100)}%`,
                                height: '100%',
                                background: '#007bff',
                                borderRadius: '5px',
                              }}
                            />
                          </div>
                          <span>{((t.size_bytes / (monitoringData.dbSize?.size_bytes || 1)) * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#666' }}>No table data available</p>
            )}
          </div>

          {/* RPC Health */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>RPC Health Check</h3>
              <button style={styles.button} onClick={checkRpcHealth} disabled={rpcLoading}>
                {rpcLoading ? 'Checking...' : 'Check Health'}
              </button>
            </div>

            {rpcHealth.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Chain</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Latency</th>
                    <th style={styles.th}>Block Number</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rpcHealth.map(r => (
                    <tr key={r.chain}>
                      <td style={styles.td}>{r.chain}</td>
                      <td style={styles.td}>{r.name}</td>
                      <td style={styles.td}>
                        <span style={{
                          color: r.latency < 500 ? '#28a745' : r.latency < 1000 ? '#ffc107' : '#dc3545',
                          fontWeight: 'bold'
                        }}>
                          {r.latency}ms
                        </span>
                      </td>
                      <td style={styles.td}>
                        {r.blockNumber ? Number(r.blockNumber).toLocaleString() : '-'}
                      </td>
                      <td style={styles.td}>
                        {r.error ? (
                          <span style={{ ...styles.badge('#dc3545') }} title={r.error}>Error</span>
                        ) : (
                          <span style={{ ...styles.badge('#28a745') }}>Healthy</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#666' }}>Click "Check Health" to test RPC endpoints</p>
            )}
          </div>

          {/* API Usage per User */}
          <div style={styles.card}>
            <h3>API Usage (Last 30 Days)</h3>

            {monitoringData?.userUsage && monitoringData.userUsage.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Total Queries</th>
                    <th style={styles.th}>Avg Duration</th>
                    <th style={styles.th}>Errors</th>
                    <th style={styles.th}>Last Query</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoringData.userUsage.map(u => (
                    <tr key={u.email}>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>
                        <strong>{u.total_queries.toLocaleString()}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: u.avg_duration_ms < 100 ? '#28a745' : u.avg_duration_ms < 500 ? '#ffc107' : '#dc3545' }}>
                          {u.avg_duration_ms}ms
                        </span>
                      </td>
                      <td style={styles.td}>
                        {u.error_count > 0 ? (
                          <span style={{ color: '#dc3545' }}>{u.error_count}</span>
                        ) : (
                          <span style={{ color: '#28a745' }}>0</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {u.last_query ? new Date(u.last_query).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#666' }}>No usage data available (query_log table may not exist)</p>
            )}
          </div>

          {/* Query History */}
          <div style={styles.card}>
            <h3>Recent Queries</h3>

            {monitoringData?.queryHistory && monitoringData.queryHistory.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Chain</th>
                    <th style={styles.th}>Query</th>
                    <th style={styles.th}>Duration</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoringData.queryHistory.slice(0, 20).map((q, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{new Date(q.created_at).toLocaleString()}</td>
                      <td style={styles.td}>{q.chain}</td>
                      <td style={styles.td}>
                        <code style={{ fontSize: '11px' }} title={q.query}>
                          {q.query.length > 50 ? q.query.substring(0, 50) + '...' : q.query}
                        </code>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: q.duration_ms < 100 ? '#28a745' : q.duration_ms < 500 ? '#ffc107' : '#dc3545' }}>
                          {q.duration_ms}ms
                        </span>
                      </td>
                      <td style={styles.td}>
                        {q.error ? (
                          <span style={{ ...styles.badge('#dc3545') }} title={q.error}>Error</span>
                        ) : (
                          <span style={{ ...styles.badge('#28a745') }}>OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#666' }}>No query history available (query_log table may not exist)</p>
            )}
          </div>

          {/* Alerts Panel */}
          <div style={{ ...styles.card, borderLeft: alerts.some(a => !a.acknowledged && a.severity === 'critical') ? '4px solid #dc3545' : alerts.some(a => !a.acknowledged) ? '4px solid #ffc107' : '4px solid #28a745' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>
                Alerts
                {unacknowledgedAlerts > 0 && (
                  <span style={{ marginLeft: '10px', background: '#dc3545', color: '#fff', borderRadius: '10px', padding: '2px 8px', fontSize: '12px' }}>
                    {unacknowledgedAlerts} new
                  </span>
                )}
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={styles.button} onClick={fetchAlerts}>Refresh</button>
                {unacknowledgedAlerts > 0 && (
                  <button style={{ ...styles.button, background: '#6c757d' }} onClick={acknowledgeAllAlerts}>
                    Acknowledge All
                  </button>
                )}
              </div>
            </div>

            {alerts.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {alerts.slice(0, 20).map(alert => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: alert.acknowledged ? colors.cardBg : alert.severity === 'critical' ? '#f8d7da' : alert.severity === 'warning' ? '#fff3cd' : '#d1ecf1',
                      borderRadius: '4px',
                      borderLeft: `4px solid ${alert.severity === 'critical' ? '#dc3545' : alert.severity === 'warning' ? '#ffc107' : '#17a2b8'}`,
                      opacity: alert.acknowledged ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            marginRight: '8px',
                            background: alert.severity === 'critical' ? '#dc3545' : alert.severity === 'warning' ? '#ffc107' : '#17a2b8',
                            color: alert.severity === 'warning' ? '#000' : '#fff',
                          }}>
                            {alert.severity.toUpperCase()}
                          </span>
                          {alert.chainName && <span style={{ color: '#666', marginRight: '8px' }}>[{alert.chainName}]</span>}
                          {alert.message}
                        </div>
                        {alert.details && <div style={{ fontSize: '12px', color: '#666' }}>{alert.details}</div>}
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          style={{ ...styles.button, padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#28a745', textAlign: 'center', padding: '20px' }}>
                No alerts - all systems operational
              </p>
            )}
          </div>

          {/* System Health - Database & Backend */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Infrastructure Health</h3>
              <button style={styles.button} onClick={fetchSystemHealth}>Refresh</button>
            </div>

            {systemHealth ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Backend Service */}
                <div style={{ padding: '15px', background: colors.statBg, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Backend Service</div>
                    <div style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: systemHealth.backend_service.status === 'healthy' ? '#28a745' : systemHealth.backend_service.status === 'unhealthy' ? '#dc3545' : '#6c757d',
                      color: '#fff'
                    }}>
                      {systemHealth.backend_service.status.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>Latency</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: systemHealth.backend_service.latencyMs && systemHealth.backend_service.latencyMs > 1000 ? '#ffc107' : colors.text }}>
                        {systemHealth.backend_service.latencyMs !== null ? `${systemHealth.backend_service.latencyMs}ms` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>URL</div>
                      <div style={{ fontSize: '12px', color: colors.text, wordBreak: 'break-all' }}>{systemHealth.backend_service.url}</div>
                    </div>
                    {systemHealth.backend_service.error && (
                      <div>
                        <div style={{ fontSize: '11px', color: colors.textMuted }}>Error</div>
                        <div style={{ fontSize: '12px', color: '#dc3545' }}>{systemHealth.backend_service.error}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Databases */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                  {/* Frontend DB */}
                  {systemHealth.frontend_db && (
                    <div style={{ padding: '15px', background: colors.statBg, borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>{systemHealth.frontend_db.database}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>Connections</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: systemHealth.frontend_db.connections.usagePercent > 80 ? '#dc3545' : colors.text }}>
                            {systemHealth.frontend_db.connections.active + systemHealth.frontend_db.connections.idle}/{systemHealth.frontend_db.connections.max}
                          </div>
                          <div style={{ height: '4px', background: '#e9ecef', borderRadius: '2px', marginTop: '4px' }}>
                            <div style={{ width: `${systemHealth.frontend_db.connections.usagePercent}%`, height: '100%', background: systemHealth.frontend_db.connections.usagePercent > 80 ? '#dc3545' : '#28a745', borderRadius: '2px' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>Cache Hit Ratio</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: systemHealth.frontend_db.cacheHitRatio < 90 ? '#ffc107' : '#28a745' }}>
                            {systemHealth.frontend_db.cacheHitRatio}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>Size</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{systemHealth.frontend_db.size}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>Deadlocks</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: systemHealth.frontend_db.deadlocks > 0 ? '#dc3545' : colors.text }}>
                            {systemHealth.frontend_db.deadlocks}
                          </div>
                        </div>
                      </div>
                      {systemHealth.frontend_db.longRunningQueries.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '8px', background: '#fff3cd', borderRadius: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#856404', fontWeight: 'bold' }}>Long-running queries:</div>
                          {systemHealth.frontend_db.longRunningQueries.map(q => (
                            <div key={q.pid} style={{ fontSize: '11px', color: '#856404', marginTop: '4px' }}>
                              PID {q.pid}: {q.duration} - {q.query}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Backend DB */}
                  {systemHealth.backend_db && (
                    <div style={{ padding: '15px', background: colors.statBg, borderRadius: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>{systemHealth.backend_db.database}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>Connections</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: systemHealth.backend_db.connections.usagePercent > 80 ? '#dc3545' : colors.text }}>
                            {systemHealth.backend_db.connections.active + systemHealth.backend_db.connections.idle}/{systemHealth.backend_db.connections.max}
                          </div>
                          <div style={{ height: '4px', background: '#e9ecef', borderRadius: '2px', marginTop: '4px' }}>
                            <div style={{ width: `${systemHealth.backend_db.connections.usagePercent}%`, height: '100%', background: systemHealth.backend_db.connections.usagePercent > 80 ? '#dc3545' : '#28a745', borderRadius: '2px' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>Cache Hit Ratio</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: systemHealth.backend_db.cacheHitRatio < 90 ? '#ffc107' : '#28a745' }}>
                            {systemHealth.backend_db.cacheHitRatio}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>Size</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{systemHealth.backend_db.size}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>Deadlocks</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: systemHealth.backend_db.deadlocks > 0 ? '#dc3545' : colors.text }}>
                            {systemHealth.backend_db.deadlocks}
                          </div>
                        </div>
                      </div>
                      {systemHealth.backend_db.longRunningQueries.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '8px', background: '#fff3cd', borderRadius: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#856404', fontWeight: 'bold' }}>Long-running queries:</div>
                          {systemHealth.backend_db.longRunningQueries.map(q => (
                            <div key={q.pid} style={{ fontSize: '11px', color: '#856404', marginTop: '4px' }}>
                              PID {q.pid}: {q.duration} - {q.query}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: colors.textMuted, textAlign: 'right' }}>
                  Last updated: {new Date(systemHealth.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <p style={{ color: '#666' }}>Loading infrastructure health...</p>
            )}
          </div>

          {/* Sync Progress Charts */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Sync Progress</h3>
              <button style={styles.button} onClick={fetchSyncHistory}>Refresh</button>
            </div>

            {syncHistory?.current && syncHistory.current.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                {syncHistory.current.map(chain => {
                  const status = syncHistory.syncStatus?.[chain.chain]
                  const rates = syncHistory.syncRates?.[chain.chain]
                  const chartData = syncHistory.chartData?.[chain.chain]
                  const remoteBlock = syncHistory.rpcBlocks?.[chain.chain]

                  return (
                    <div key={chain.chain} style={{ padding: '15px', background: colors.statBg, borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong>{chain.name}</strong>
                        {status && (
                          <span style={{
                            ...styles.badge(status.percentSynced >= 99 ? '#28a745' : status.percentSynced >= 90 ? '#ffc107' : '#dc3545')
                          }}>
                            {status.percentSynced}% synced
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: '8px', background: '#e9ecef', borderRadius: '4px', marginBottom: '10px' }}>
                        <div style={{
                          width: `${status?.percentSynced || 0}%`,
                          height: '100%',
                          background: status?.percentSynced && status.percentSynced >= 99 ? '#28a745' : '#007bff',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>

                      {/* Sparkline chart */}
                      {chartData && chartData.blocks.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '40px', gap: '2px', marginBottom: '10px' }}>
                          {chartData.blocks.map((val, i, arr) => {
                            const min = Math.min(...arr)
                            const max = Math.max(...arr)
                            const range = max - min || 1
                            const height = ((val - min) / range) * 100
                            return (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  height: `${Math.max(5, height)}%`,
                                  background: i === arr.length - 1 ? '#007bff' : '#b8daff',
                                  borderRadius: '2px',
                                }}
                                title={`${val.toLocaleString()} blocks`}
                              />
                            )
                          })}
                        </div>
                      )}

                      {/* Stats */}
                      <div style={{ fontSize: '12px', color: colors.textMuted }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Local Block:</span>
                          <strong>{chain.latest_block.toLocaleString()}</strong>
                        </div>
                        {remoteBlock && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Remote Block:</span>
                            <strong>{remoteBlock.toLocaleString()}</strong>
                          </div>
                        )}
                        {status && status.behind > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: status.behind > 100 ? '#dc3545' : '#ffc107' }}>
                            <span>Behind:</span>
                            <strong>{status.behind.toLocaleString()} blocks</strong>
                          </div>
                        )}
                        {rates && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Speed:</span>
                            <strong>{rates.blocksPerHour.toLocaleString()} blocks/hr</strong>
                          </div>
                        )}
                        {status && status.estimatedTimeToSync && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>ETA:</span>
                            <strong style={{ color: status.estimatedTimeToSync === 'Synced' ? '#28a745' : 'inherit' }}>
                              {status.estimatedTimeToSync}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: '#666' }}>Loading sync progress...</p>
            )}
          </div>
        </>
      )}

      {tab === 'notifications' && (
        <>
          {/* Webhooks */}
          <div style={styles.card}>
            <h3>Webhook Notifications</h3>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '15px' }}>
              Send HTTP POST requests to URLs when alerts are triggered.
            </p>

            <form onSubmit={addWebhook} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <input
                style={{ ...styles.input, flex: '1', minWidth: '150px', marginBottom: 0 }}
                placeholder="Name (e.g., Slack)"
                value={webhookForm.name}
                onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })}
                required
              />
              <input
                style={{ ...styles.input, flex: '2', minWidth: '250px', marginBottom: 0 }}
                placeholder="URL (e.g., https://hooks.slack.com/...)"
                value={webhookForm.url}
                onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
                required
              />
              <button type="submit" style={styles.button}>Add Webhook</button>
            </form>

            {notificationSettings?.webhooks && notificationSettings.webhooks.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>URL</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Last Triggered</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationSettings.webhooks.map(w => (
                    <tr key={w.id} style={{ opacity: w.enabled ? 1 : 0.5 }}>
                      <td style={styles.td}>{w.name}</td>
                      <td style={styles.td}>
                        <code style={{ fontSize: '11px' }}>{w.url.substring(0, 40)}...</code>
                      </td>
                      <td style={styles.td}>
                        {w.last_error ? (
                          <span style={{ ...styles.badge('#dc3545') }} title={w.last_error}>Error</span>
                        ) : (
                          <span style={{ ...styles.badge(w.enabled ? '#28a745' : '#6c757d') }}>
                            {w.enabled ? 'Active' : 'Disabled'}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {w.last_triggered_at ? new Date(w.last_triggered_at).toLocaleString() : 'Never'}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            style={{ ...styles.button, padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => testWebhook(w.url)}
                          >
                            Test
                          </button>
                          <button
                            style={{ ...styles.button, padding: '4px 8px', fontSize: '11px', background: w.enabled ? '#6c757d' : '#28a745' }}
                            onClick={() => toggleWebhook(w.id, !w.enabled)}
                          >
                            {w.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            style={{ ...styles.deleteBtn, padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => deleteWebhook(w.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: colors.textMuted }}>No webhooks configured</p>
            )}
          </div>

          {/* Email Notifications */}
          <div style={styles.card}>
            <h3>Email Notifications</h3>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '15px' }}>
              Send email alerts when issues are detected. {!process.env.POSTMARK_KEY && '(Requires POSTMARK_KEY env var)'}
            </p>

            <form onSubmit={addEmail} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <input
                style={{ ...styles.input, flex: '1', minWidth: '150px', marginBottom: 0 }}
                placeholder="Name (e.g., On-call)"
                value={emailForm.name}
                onChange={e => setEmailForm({ ...emailForm, name: e.target.value })}
                required
              />
              <input
                style={{ ...styles.input, flex: '2', minWidth: '250px', marginBottom: 0 }}
                type="email"
                placeholder="Email address"
                value={emailForm.email}
                onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
                required
              />
              <button type="submit" style={styles.button}>Add Email</button>
            </form>

            {notificationSettings?.emails && notificationSettings.emails.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Last Sent</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationSettings.emails.map(e => (
                    <tr key={e.id} style={{ opacity: e.enabled ? 1 : 0.5 }}>
                      <td style={styles.td}>{e.name}</td>
                      <td style={styles.td}>{e.email}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge(e.enabled ? '#28a745' : '#6c757d') }}>
                          {e.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {e.last_sent_at ? new Date(e.last_sent_at).toLocaleString() : 'Never'}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            style={{ ...styles.button, padding: '4px 8px', fontSize: '11px', background: e.enabled ? '#6c757d' : '#28a745' }}
                            onClick={() => toggleEmail(e.id, !e.enabled)}
                          >
                            {e.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            style={{ ...styles.deleteBtn, padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => deleteEmail(e.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: colors.textMuted }}>No email notifications configured</p>
            )}
          </div>

          {/* Custom Alert Rules */}
          <div style={styles.card}>
            <h3>Custom Alert Rules</h3>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '15px' }}>
              Define custom thresholds for triggering alerts.
            </p>

            <form onSubmit={addRule} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'flex-end' }}>
              <div style={{ flex: '1', minWidth: '150px' }}>
                <label style={{ fontSize: '11px', color: colors.textMuted }}>Name</label>
                <input
                  style={{ ...styles.input, marginBottom: 0 }}
                  placeholder="e.g., High latency alert"
                  value={ruleForm.name}
                  onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ minWidth: '130px' }}>
                <label style={{ fontSize: '11px', color: colors.textMuted }}>Metric</label>
                <select
                  style={{ ...styles.input, marginBottom: 0 }}
                  value={ruleForm.type}
                  onChange={e => setRuleForm({ ...ruleForm, type: e.target.value })}
                >
                  {notificationSettings?.ruleTypes?.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  )) || (
                    <>
                      <option value="sync_behind">Blocks Behind</option>
                      <option value="cpu_usage">CPU Usage</option>
                      <option value="memory_usage">Memory Usage</option>
                      <option value="rpc_latency">RPC Latency</option>
                    </>
                  )}
                </select>
              </div>
              {(ruleForm.type === 'sync_behind' || ruleForm.type === 'rpc_latency') && (
                <div style={{ minWidth: '100px' }}>
                  <label style={{ fontSize: '11px', color: colors.textMuted }}>Chain ID</label>
                  <input
                    style={{ ...styles.input, marginBottom: 0 }}
                    placeholder="e.g., 1"
                    value={ruleForm.chain}
                    onChange={e => setRuleForm({ ...ruleForm, chain: e.target.value })}
                  />
                </div>
              )}
              <div style={{ minWidth: '80px' }}>
                <label style={{ fontSize: '11px', color: colors.textMuted }}>Comparison</label>
                <select
                  style={{ ...styles.input, marginBottom: 0 }}
                  value={ruleForm.comparison}
                  onChange={e => setRuleForm({ ...ruleForm, comparison: e.target.value })}
                >
                  <option value="gt">&gt;</option>
                  <option value="gte">&gt;=</option>
                  <option value="lt">&lt;</option>
                  <option value="lte">&lt;=</option>
                  <option value="eq">=</option>
                </select>
              </div>
              <div style={{ minWidth: '100px' }}>
                <label style={{ fontSize: '11px', color: colors.textMuted }}>Threshold</label>
                <input
                  style={{ ...styles.input, marginBottom: 0 }}
                  type="number"
                  placeholder="e.g., 1000"
                  value={ruleForm.threshold}
                  onChange={e => setRuleForm({ ...ruleForm, threshold: e.target.value })}
                  required
                />
              </div>
              <div style={{ minWidth: '100px' }}>
                <label style={{ fontSize: '11px', color: colors.textMuted }}>Severity</label>
                <select
                  style={{ ...styles.input, marginBottom: 0 }}
                  value={ruleForm.severity}
                  onChange={e => setRuleForm({ ...ruleForm, severity: e.target.value })}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <button type="submit" style={styles.button}>Add Rule</button>
            </form>

            {notificationSettings?.rules && notificationSettings.rules.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Condition</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Last Triggered</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationSettings.rules.map(r => (
                    <tr key={r.id} style={{ opacity: r.enabled ? 1 : 0.5 }}>
                      <td style={styles.td}>{r.name}</td>
                      <td style={styles.td}>
                        <code>
                          {r.type}
                          {r.chain && ` (chain ${r.chain})`}
                          {' '}{r.comparison === 'gt' ? '>' : r.comparison === 'gte' ? '>=' : r.comparison === 'lt' ? '<' : r.comparison === 'lte' ? '<=' : '='}{' '}
                          {r.threshold}
                        </code>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge(r.severity === 'critical' ? '#dc3545' : r.severity === 'warning' ? '#ffc107' : '#17a2b8'),
                          color: r.severity === 'warning' ? '#000' : '#fff',
                        }}>
                          {r.severity}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge(r.enabled ? '#28a745' : '#6c757d') }}>
                          {r.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {r.last_triggered_at ? new Date(r.last_triggered_at).toLocaleString() : 'Never'}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            style={{ ...styles.button, padding: '4px 8px', fontSize: '11px', background: r.enabled ? '#6c757d' : '#28a745' }}
                            onClick={() => toggleRule(r.id, !r.enabled)}
                          >
                            {r.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            style={{ ...styles.deleteBtn, padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => deleteRule(r.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: colors.textMuted }}>No custom rules configured. Default rules (sync &gt;100 blocks behind, memory &gt;80%, CPU &gt;80%) are always active.</p>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  )
}
