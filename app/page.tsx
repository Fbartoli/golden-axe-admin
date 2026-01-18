'use client'

import { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  Sun,
  Moon,
  Bell,
  LogOut,
  Network,
  Users,
  RefreshCw,
  Search,
  Terminal,
  Activity,
  Settings,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// Dynamic imports for tab components (reduces initial bundle size)
const NetworksTab = dynamic(
  () => import('@/components/tabs/NetworksTab').then(m => ({ default: m.NetworksTab })),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> }
)
const UsersTab = dynamic(
  () => import('@/components/tabs/UsersTab').then(m => ({ default: m.UsersTab })),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> }
)
const SyncTab = dynamic(
  () => import('@/components/tabs/SyncTab').then(m => ({ default: m.SyncTab })),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> }
)
const QueryTab = dynamic(
  () => import('@/components/tabs/QueryTab').then(m => ({ default: m.QueryTab })),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> }
)
const SystemTab = dynamic(
  () => import('@/components/tabs/SystemTab').then(m => ({ default: m.SystemTab })),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> }
)
const NotificationsTab = dynamic(
  () => import('@/components/tabs/NotificationsTab').then(m => ({ default: m.NotificationsTab })),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> }
)

// Lazy load command palette (only needed when user presses Cmd+K)
const CommandDialog = dynamic(
  () => import('@/components/ui/command').then(m => ({ default: m.CommandDialog })),
  { ssr: false }
)
const CommandInput = dynamic(
  () => import('@/components/ui/command').then(m => ({ default: m.CommandInput })),
  { ssr: false }
)
const CommandList = dynamic(
  () => import('@/components/ui/command').then(m => ({ default: m.CommandList })),
  { ssr: false }
)
const CommandEmpty = dynamic(
  () => import('@/components/ui/command').then(m => ({ default: m.CommandEmpty })),
  { ssr: false }
)
const CommandGroup = dynamic(
  () => import('@/components/ui/command').then(m => ({ default: m.CommandGroup })),
  { ssr: false }
)
const CommandItem = dynamic(
  () => import('@/components/ui/command').then(m => ({ default: m.CommandItem })),
  { ssr: false }
)
const CommandShortcut = dynamic(
  () => import('@/components/ui/command').then(m => ({ default: m.CommandShortcut })),
  { ssr: false }
)

import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  Network as NetworkType,
  ApiKey,
  AdminKey,
  User,
  UserDetail,
  SyncStatus,
  SyncEvent,
  SystemHealth,
  Alert,
  SyncHistoryData,
  NotificationSettings,
  SchemaData,
  QueryResult,
  DecodedResult,
  RpcHealth,
} from '@/types'

type TabType = 'networks' | 'users' | 'sync' | 'query' | 'system' | 'notifications'

const TAB_CONFIG: { id: TabType; label: string; shortcut: string; icon: typeof Network }[] = [
  { id: 'networks', label: 'Networks', shortcut: '1', icon: Network },
  { id: 'users', label: 'Users', shortcut: '2', icon: Users },
  { id: 'sync', label: 'Sync', shortcut: '3', icon: RefreshCw },
  { id: 'query', label: 'Query', shortcut: '4', icon: Terminal },
  { id: 'system', label: 'System', shortcut: '5', icon: Activity },
  { id: 'notifications', label: 'Notifications', shortcut: '6', icon: Settings },
]

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<TabType>('networks')
  const [isPending, startTransition] = useTransition()
  const [darkMode, setDarkMode] = useState(true)

  // Core data state
  const [networks, setNetworks] = useState<NetworkType[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [adminKeys, setAdminKeys] = useState<AdminKey[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)

  // System monitoring state
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState(0)
  const [syncHistory, setSyncHistory] = useState<SyncHistoryData | null>(null)
  const [rpcHealth, setRpcHealth] = useState<RpcHealth[]>([])
  const [rpcLoading, setRpcLoading] = useState(false)
  const [monitoringData, setMonitoringData] = useState<any>(null)

  // Notifications state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // Sync tab state
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([])
  const [sseConnected, setSseConnected] = useState(false)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [syncSpeed, setSyncSpeed] = useState<Record<number, number>>({})
  const prevBlockCountsRef = useRef<Record<number, { count: number; time: number }>>({})

  // Query tab state
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null)
  const [queryErrors, setQueryErrors] = useState<string[]>([])
  const [showHelper, setShowHelper] = useState(true)
  const [abiInput, setAbiInput] = useState('event Transfer(address indexed from, address indexed to, uint256 value)')
  const [topicsInput, setTopicsInput] = useState('')
  const [dataInput, setDataInput] = useState('')
  const [decodedResult, setDecodedResult] = useState<DecodedResult | null>(null)
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
  const [liveQueryError, setLiveQueryError] = useState<string | null>(null)

  // Fetch functions
  const fetchNetworks = useCallback(async () => {
    const res = await fetch('/api/networks')
    if (res.ok) setNetworks(await res.json())
  }, [])

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/keys')
    if (res.ok) setKeys(await res.json())
  }, [])

  const fetchAdminKeys = useCallback(async () => {
    const res = await fetch('/api/admin-key')
    if (res.ok) setAdminKeys(await res.json())
  }, [])

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
  }, [])

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/status')
    if (res.ok) {
      const data = await res.json()
      setSyncStatus(data)
      const now = Date.now()
      const newSpeeds: Record<number, number> = {}
      for (const [chain, status] of Object.entries(data.chainStatus)) {
        const chainNum = Number(chain)
        const count = (status as any).total_blocks || 0
        const prev = prevBlockCountsRef.current[chainNum]
        if (prev && now - prev.time > 0) {
          const speed = Math.round(((count - prev.count) / ((now - prev.time) / 1000)) * 10) / 10
          if (speed > 0) newSpeeds[chainNum] = speed
        }
        prevBlockCountsRef.current[chainNum] = { count, time: now }
      }
      if (Object.keys(newSpeeds).length > 0) setSyncSpeed(s => ({ ...s, ...newSpeeds }))
    }
  }, [])

  const fetchSystemHealth = useCallback(async () => {
    const res = await fetch('/api/system-health')
    if (res.ok) setSystemHealth(await res.json())
  }, [])

  const fetchAlerts = useCallback(async () => {
    const res = await fetch('/api/alerts')
    if (res.ok) {
      const data = await res.json()
      setAlerts(data.alerts || [])
      setUnacknowledgedAlerts(data.unacknowledgedCount || 0)
    }
  }, [])

  const fetchSyncHistory = useCallback(async () => {
    const res = await fetch('/api/sync-history')
    if (res.ok) setSyncHistory(await res.json())
  }, [])

  const fetchRpcHealth = useCallback(async () => {
    setRpcLoading(true)
    try {
      const res = await fetch('/api/rpc-health')
      if (res.ok) setRpcHealth(await res.json())
    } finally {
      setRpcLoading(false)
    }
  }, [])

  const fetchMonitoring = useCallback(async () => {
    const res = await fetch('/api/monitoring')
    if (res.ok) setMonitoringData(await res.json())
  }, [])

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications')
    if (res.ok) setNotificationSettings(await res.json())
  }, [])

  const fetchSchema = useCallback(async () => {
    const res = await fetch('/api/schema')
    if (res.ok) setSchemaData(await res.json())
  }, [])

  const fetchUserDetail = useCallback(async (email: string) => {
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`)
    if (res.ok) setSelectedUser(await res.json())
  }, [])

  // Initial data fetch - parallelized to avoid waterfall
  useEffect(() => {
    Promise.all([
      fetchNetworks(),
      fetchKeys(),
      fetchAdminKeys(),
      fetchUsers()
    ])
  }, [fetchNetworks, fetchKeys, fetchAdminKeys, fetchUsers])

  // Tab-specific data fetching - parallelized to avoid waterfall
  useEffect(() => {
    if (tab === 'sync') {
      fetchStatus()
    } else if (tab === 'system') {
      Promise.all([
        fetchSystemHealth(),
        fetchAlerts(),
        fetchSyncHistory(),
        fetchRpcHealth(),
        fetchMonitoring()
      ])
    } else if (tab === 'notifications') {
      fetchNotifications()
    } else if (tab === 'query') {
      fetchSchema()
    }
  }, [tab, fetchStatus, fetchSystemHealth, fetchAlerts, fetchSyncHistory, fetchRpcHealth, fetchMonitoring, fetchNotifications, fetchSchema])

  // Auto-refresh for sync tab
  useEffect(() => {
    if (tab === 'sync' && autoRefresh) {
      const interval = setInterval(fetchStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [tab, autoRefresh, fetchStatus])

  // System monitoring interval
  useEffect(() => {
    if (tab === 'system') {
      const interval = setInterval(() => {
        fetchSystemHealth()
        fetchAlerts()
        fetchSyncHistory()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [tab, fetchSystemHealth, fetchAlerts, fetchSyncHistory])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowCommandPalette(p => !p)
        return
      }

      if (e.key === 'Escape') {
        setShowCommandPalette(false)
        return
      }

      const tabIndex = TAB_CONFIG.findIndex(t => t.shortcut === e.key)
      if (tabIndex !== -1) {
        startTransition(() => setTab(TAB_CONFIG[tabIndex].id))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // SSE for live sync
  const startSyncStream = useCallback(() => {
    if (eventSource) eventSource.close()
    const es = new EventSource('/api/sync-stream')
    es.onopen = () => setSseConnected(true)
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        setSyncEvents(prev => [...prev.slice(-99), { ...event, timestamp: Date.now() }])
      } catch {}
    }
    es.onerror = () => setSseConnected(false)
    setEventSource(es)
  }, [eventSource])

  const stopSyncStream = useCallback(() => {
    eventSource?.close()
    setEventSource(null)
    setSseConnected(false)
  }, [eventSource])

  // Query execution
  const executeQuery = useCallback(async () => {
    if (liveQueryEnabled) {
      if (liveQuerySource) {
        liveQuerySource.close()
        setLiveQuerySource(null)
      }
      setLiveQueryResults([])
      setLiveQueryError(null)
      setLiveQueryConnected(false)

      const formattedSigs = eventSignatures
        ? eventSignatures.split('\n').map(s => s.trim()).filter(Boolean).join('|||')
        : ''

      const params = new URLSearchParams({
        query: queryText,
        chain: queryChain,
      })
      if (formattedSigs) params.set('event_signatures', formattedSigs)
      if (apiKey) params.set('api_key', apiKey)

      try {
        const es = new EventSource(`/api/query-live?${params.toString()}`)

        es.onopen = () => {
          setLiveQueryConnected(true)
          setLiveQueryError(null)
        }

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            if (data.error) {
              setLiveQueryError(data.error)
              return
            }

            const transformArrayToObjects = (arr: any[][]): Record<string, any>[] => {
              if (!arr || arr.length < 2) return []
              const columns = arr[0] as string[]
              return arr.slice(1).map((row: any[]) => {
                const obj: Record<string, any> = {}
                columns.forEach((col, i) => {
                  obj[col] = row[i]
                })
                return obj
              })
            }

            let rows: Record<string, any>[] = []

            if (data.rows && Array.isArray(data.rows)) {
              rows = data.rows
            } else if (Array.isArray(data)) {
              if (data.length > 0 && Array.isArray(data[0])) {
                rows = transformArrayToObjects(data)
              } else if (data.length > 0 && typeof data[0] === 'object') {
                rows = data
              }
            } else if (data.result) {
              if (Array.isArray(data.result) && data.result.length > 0) {
                const innerResult = data.result[0]
                if (Array.isArray(innerResult) && innerResult.length > 0 && Array.isArray(innerResult[0])) {
                  rows = transformArrayToObjects(innerResult)
                } else if (Array.isArray(innerResult)) {
                  rows = innerResult
                }
              }
            }

            if (rows.length > 0) {
              setLiveQueryResults(prev => [...rows, ...prev].slice(0, 100))
            }
          } catch (parseErr) {
            console.error('Failed to parse SSE data:', parseErr, e.data)
          }
        }

        es.onerror = (err) => {
          console.error('EventSource error:', err)
          setLiveQueryConnected(false)
          if (es.readyState === EventSource.CLOSED) {
            setLiveQueryError('Connection closed - backend may be unavailable')
          } else {
            setLiveQueryError('Connection error - retrying...')
          }
        }

        setLiveQuerySource(es)
      } catch (err: any) {
        setLiveQueryError(`Failed to connect: ${err.message}`)
      }
      return
    }

    setQueryLoading(true)
    setQueryResult(null)
    const start = Date.now()
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          chain: parseInt(queryChain),
          event_signatures: eventSignatures || undefined,
          api_key: apiKey || undefined,
        }),
      })
      const data = await res.json()
      setQueryTime(Date.now() - start)
      setQueryResult({
        success: data.success ?? res.ok,
        status: data.status ?? res.status,
        data: data.data,
        error: data.error,
      })
    } catch (e: any) {
      setQueryResult({ success: false, error: e.message })
    } finally {
      setQueryLoading(false)
    }
  }, [queryText, queryChain, eventSignatures, apiKey, liveQueryEnabled, liveQuerySource])

  const stopLiveQuery = useCallback(() => {
    liveQuerySource?.close()
    setLiveQuerySource(null)
    setLiveQueryConnected(false)
    setLiveQueryEnabled(false)
  }, [liveQuerySource])

  // Decoder
  const decodeEvent = useCallback(async () => {
    const res = await fetch('/api/decode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ abi: abiInput, topics: topicsInput.split('\n').filter(Boolean), data: dataInput }),
    })
    setDecodedResult(await res.json())
  }, [abiInput, topicsInput, dataInput])

  // Alert actions
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge', alertId }),
    })
    fetchAlerts()
  }, [fetchAlerts])

  const acknowledgeAllAlerts = useCallback(async () => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge_all' }),
    })
    fetchAlerts()
  }, [fetchAlerts])

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('light', darkMode)
  }

  // Deferred search query for smoother typing
  const deferredSearchQuery = useDeferredValue(searchQuery)

  // Memoized filtered arrays
  const filteredNetworks = useMemo(() =>
    networks.filter(n =>
      n.name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
      n.chain.toString().includes(deferredSearchQuery)
    ),
    [networks, deferredSearchQuery]
  )
  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.email.toLowerCase().includes(deferredSearchQuery.toLowerCase())
    ),
    [users, deferredSearchQuery]
  )
  const filteredKeys = useMemo(() =>
    keys.filter(k =>
      k.owner_email.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
      k.secret.includes(deferredSearchQuery)
    ),
    [keys, deferredSearchQuery]
  )

  return (
    <TooltipProvider>
      <div className="min-h-screen p-5">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gold">Horusblock Admin</h1>
              {unacknowledgedAlerts > 0 && (
                <Badge variant="error" className="gap-1">
                  <Bell className="h-3 w-3" />
                  {unacknowledgedAlerts} alert{unacknowledgedAlerts > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="w-52 justify-start text-muted-foreground"
                onClick={() => setShowCommandPalette(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                Search...
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">&#8984;</span>K
                </kbd>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={toggleDarkMode} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
                    {darkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => startTransition(() => setTab(v as TabType))} className="space-y-6">
            <TabsList className="bg-card border border-border h-auto flex-wrap gap-1 p-1">
              {TAB_CONFIG.map((t) => {
                const Icon = t.icon
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className={cn(
                      "gap-2 data-[state=active]:bg-gold data-[state=active]:text-black"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                    <kbd className="ml-1 hidden h-5 select-none items-center rounded bg-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                      {t.shortcut}
                    </kbd>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value="networks" className="mt-6">
              <NetworksTab
                networks={networks}
                setNetworks={setNetworks}
                filteredNetworks={filteredNetworks}
                onRefresh={fetchNetworks}
              />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <UsersTab
                users={users}
                filteredUsers={filteredUsers}
                keys={keys}
                filteredKeys={filteredKeys}
                adminKeys={adminKeys}
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                fetchUserDetail={fetchUserDetail}
                onRefreshKeys={fetchKeys}
                onRefreshAdminKeys={fetchAdminKeys}
              />
            </TabsContent>

            <TabsContent value="sync" className="mt-6">
              <SyncTab
                syncStatus={syncStatus}
                syncSpeed={syncSpeed}
                autoRefresh={autoRefresh}
                setAutoRefresh={setAutoRefresh}
                onRefresh={fetchStatus}
                sseConnected={sseConnected}
                syncEvents={syncEvents}
                setSyncEvents={setSyncEvents}
                startSyncStream={startSyncStream}
                stopSyncStream={stopSyncStream}
              />
            </TabsContent>

            <TabsContent value="query" className="mt-6">
              <QueryTab
                networks={networks}
                queryChain={queryChain}
                setQueryChain={setQueryChain}
                eventSignatures={eventSignatures}
                setEventSignatures={setEventSignatures}
                queryText={queryText}
                setQueryText={setQueryText}
                queryErrors={queryErrors}
                queryLoading={queryLoading}
                queryTime={queryTime}
                queryResult={queryResult}
                liveQueryEnabled={liveQueryEnabled}
                setLiveQueryEnabled={setLiveQueryEnabled}
                liveQueryConnected={liveQueryConnected}
                liveQueryResults={liveQueryResults}
                setLiveQueryResults={setLiveQueryResults}
                liveQueryError={liveQueryError}
                apiKey={apiKey}
                setApiKey={setApiKey}
                executeQuery={executeQuery}
                stopLiveQuery={stopLiveQuery}
                showHelper={showHelper}
                setShowHelper={setShowHelper}
                schemaData={schemaData}
                abiInput={abiInput}
                setAbiInput={setAbiInput}
                topicsInput={topicsInput}
                setTopicsInput={setTopicsInput}
                dataInput={dataInput}
                setDataInput={setDataInput}
                decodedResult={decodedResult}
                decodeEvent={decodeEvent}
              />
            </TabsContent>

            <TabsContent value="system" className="mt-6">
              <SystemTab
                monitoringData={monitoringData}
                fetchMonitoring={fetchMonitoring}
                rpcHealth={rpcHealth}
                rpcLoading={rpcLoading}
                checkRpcHealth={fetchRpcHealth}
                alerts={alerts}
                unacknowledgedAlerts={unacknowledgedAlerts}
                fetchAlerts={fetchAlerts}
                acknowledgeAlert={acknowledgeAlert}
                acknowledgeAllAlerts={acknowledgeAllAlerts}
                systemHealth={systemHealth}
                fetchSystemHealth={fetchSystemHealth}
                syncHistory={syncHistory}
                fetchSyncHistory={fetchSyncHistory}
              />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <NotificationsTab
                settings={notificationSettings}
                networks={networks}
                onRefresh={fetchNotifications}
              />
            </TabsContent>
          </Tabs>

          {/* Command Palette */}
          <CommandDialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Navigation">
                {TAB_CONFIG.map((t) => {
                  const Icon = t.icon
                  return (
                    <CommandItem
                      key={t.id}
                      onSelect={() => {
                        startTransition(() => setTab(t.id))
                        setShowCommandPalette(false)
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>Go to {t.label}</span>
                      <CommandShortcut>{t.shortcut}</CommandShortcut>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </CommandItem>
                <CommandItem onSelect={toggleDarkMode}>
                  {darkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  <span>Toggle theme</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </div>
      </div>
    </TooltipProvider>
  )
}
