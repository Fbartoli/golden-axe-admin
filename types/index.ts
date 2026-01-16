// Network & Configuration Types
export interface Network {
  chain: number
  name: string
  url: string
  enabled: boolean
  batch_size: number
  concurrency: number
  start_block: number | null
}

// API Key Types
export interface ApiKey {
  owner_email: string
  secret: string
  origins: string[]
  created_at: string
  deleted_at: string | null
}

export interface AdminKey {
  org: string
  name: string | null
  secret: string
  origins: string[]
  created_at: string
  deleted_at: string | null
}

// User Types
export interface User {
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

export interface UserDetail {
  email: string
  keys: Array<{
    secret: string
    origins: string[]
    created_at: string
    deleted_at: string | null
  }>
  plans: Array<{
    name: string
    amount: number
    rate: number
    timeout: number
    connections: number
    queries: number
    created_at: string
    daimo_tx: string | null
    stripe_customer: string | null
  }>
  usage: Array<{ day: string; queries: number }>
  collabs: Array<{
    email: string
    created_at: string
    disabled_at: string | null
  }>
}

// Sync & Indexer Types
export interface SyncStatus {
  config: Array<{
    chain: number
    name: string
    url: string
    enabled: boolean
    batch_size: number
    concurrency: number
    start_block: number | null
  }>
  chainStatus: Record<
    number,
    {
      latest_synced_block?: number
      total_blocks?: number
      latest_log_block?: number
      total_logs?: number
    }
  >
  dbConnected: boolean
}

export interface SyncEvent {
  chain?: number
  new_block?: string
  num?: number
  active_connections?: number
  timestamp: number
}

export interface SyncHistoryData {
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
  syncStatus: Record<
    number,
    { behind: number; percentSynced: number; estimatedTimeToSync: string }
  >
  chartData: Record<number, { blocks: number[]; timestamps: string[] }>
}

// Alias for component compatibility
export type SyncHistory = SyncHistoryData

// Query Types
export interface QueryResult {
  success: boolean
  status?: number
  data?: any
  error?: string
}

export interface DecodedEvent {
  success: boolean
  eventName?: string
  args?: Record<string, any>
  error?: string
}

// Alias for component compatibility
export type DecodedResult = DecodedEvent

export interface SchemaColumn {
  name: string
  type: string
}

export interface QueryTemplate {
  name: string
  description: string
  query: string
  eventSignature?: string
}

export interface SchemaData {
  schema: Record<string, SchemaColumn[]>
  templates: QueryTemplate[]
}

// Monitoring Types
export interface TableSize {
  tablename: string
  size: string
  size_bytes: number
}

export interface RpcHealth {
  chain: string
  name: string
  url: string
  latency: number
  blockNumber: string | null
  error: string | null
}

export interface QueryLogEntry {
  api_key: string
  query: string
  chain: string
  duration_ms: number
  created_at: string
  error: string | null
}

export interface UserUsage {
  email: string
  total_queries: number
  avg_duration_ms: number
  last_query: string
  error_count: number
}

export interface MonitoringData {
  tableSizes: TableSize[]
  dbSize: { size: string; size_bytes: number } | null
  queryHistory: QueryLogEntry[]
  userUsage: UserUsage[]
}

// Health Types
export interface PostgresHealth {
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

export interface BackendHealth {
  url: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  latencyMs: number | null
  error?: string
  lastCheck: string
  // Detailed metrics from /health/detailed
  detailed?: BackendDetailedHealth
}

export interface BackendDetailedHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime_seconds: number
  version: string
  checks: {
    database: {
      status: 'ok' | 'error'
      latency_ms: number
      pools: Record<string, BackendPoolHealth>
    }
    sync: {
      status: 'synced' | 'syncing' | 'stalled' | 'error'
      chains: BackendChainHealth[]
    }
  }
}

export interface BackendPoolHealth {
  connected: boolean
  max_connections: number
  active: number
  idle: number
  waiting: number
}

export interface BackendChainHealth {
  chain_id: string
  chain_name: string
  status: 'synced' | 'syncing' | 'stalled' | 'disabled'
  synced_block: string
  head_block: string
  blocks_behind: number
  sync_percentage: number
  estimated_time_to_sync: string
}

export interface SystemHealth {
  frontend_db: PostgresHealth | null
  backend_db: PostgresHealth | null
  backend_service: BackendHealth
  timestamp: string
}

// Alert Types
export type AlertType =
  | 'sync_behind'
  | 'rpc_error'
  | 'sync_stalled'
  | 'db_connections'
  | 'db_cache'
  | 'db_long_query'
  | 'db_deadlock'
  | 'backend_down'
  | 'backend_slow'
  | 'custom'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  chain?: number
  chainName?: string
  message: string
  details?: string
  timestamp: string
  acknowledged: boolean
}

export interface AlertRule {
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

// Notification Types
export interface Webhook {
  id: number
  name: string
  url: string
  enabled: boolean
  events: string[]
  created_at: string
  last_triggered_at: string | null
  last_error: string | null
}

export interface EmailNotification {
  id: number
  name: string
  email: string
  enabled: boolean
  events: string[]
  created_at: string
  last_sent_at: string | null
}

export interface NotificationSettings {
  webhooks: Webhook[]
  emails: EmailNotification[]
  rules: AlertRule[]
  eventTypes: Array<{ value: string; label: string }>
  ruleTypes: Array<{ value: string; label: string; unit: string }>
}

// Form State Types
export interface WebhookFormState {
  name: string
  url: string
}

export interface EmailFormState {
  name: string
  email: string
}

export interface RuleFormState {
  name: string
  type: string
  chain: string
  comparison: string
  threshold: string
  severity: string
}

// Tab Type
export type TabType =
  | 'networks'
  | 'keys'
  | 'users'
  | 'status'
  | 'query'
  | 'live'
  | 'decoder'
  | 'monitoring'
  | 'notifications'
