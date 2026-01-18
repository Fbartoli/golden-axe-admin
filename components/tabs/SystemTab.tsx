'use client'

import { memo } from 'react'
import {
  Database,
  Server,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
} from 'lucide-react'
import { MonitoringData, RpcHealth, Alert, SystemHealth, SyncHistory } from '@/types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ScrollArea,
} from '@/components/ui'
import { LogsViewer } from '@/components/LogsViewer'
import { cn } from '@/lib/utils'

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

interface SystemTabProps {
  monitoringData: MonitoringData | null
  fetchMonitoring: () => void
  rpcHealth: RpcHealth[]
  rpcLoading: boolean
  checkRpcHealth: () => void
  alerts: Alert[]
  unacknowledgedAlerts: number
  fetchAlerts: () => void
  acknowledgeAlert: (id: string) => void
  acknowledgeAllAlerts: () => void
  systemHealth: SystemHealth | null
  fetchSystemHealth: () => void
  syncHistory: SyncHistory | null
  fetchSyncHistory: () => void
}

export const SystemTab = memo(function SystemTab({
  monitoringData,
  fetchMonitoring,
  rpcHealth,
  rpcLoading,
  checkRpcHealth,
  alerts,
  unacknowledgedAlerts,
  fetchAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  systemHealth,
  fetchSystemHealth,
  syncHistory,
  fetchSyncHistory,
}: SystemTabProps) {
  return (
    <div className="space-y-6">
      {/* Database Size */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Size
          </CardTitle>
          <Button onClick={fetchMonitoring} size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {monitoringData?.dbSize && (
            <div className="mb-6 p-4 bg-secondary rounded-lg flex items-center gap-4">
              <span className="font-medium">Total Database Size:</span>
              <span className="text-2xl font-bold text-gold">
                {monitoringData.dbSize.size}
              </span>
            </div>
          )}

          {monitoringData?.tableSizes && monitoringData.tableSizes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monitoringData.tableSizes.map(t => (
                  <TableRow key={t.tablename}>
                    <TableCell><code className="text-xs">{t.tablename}</code></TableCell>
                    <TableCell>{t.size}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-border rounded-full">
                          <div
                            className="h-full bg-gold rounded-full"
                            style={{
                              width: `${Math.min(100, (t.size_bytes / (monitoringData.dbSize?.size_bytes || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm">
                          {((t.size_bytes / (monitoringData.dbSize?.size_bytes || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No table data available</p>
          )}
        </CardContent>
      </Card>

      {/* RPC Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            RPC Health Check
          </CardTitle>
          <Button onClick={checkRpcHealth} disabled={rpcLoading} size="sm">
            <RefreshCw className={cn("h-4 w-4 mr-1", rpcLoading && "animate-spin")} />
            {rpcLoading ? 'Checking...' : 'Check Health'}
          </Button>
        </CardHeader>
        <CardContent>
          {rpcHealth.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chain</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Block Number</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rpcHealth.map(r => (
                  <TableRow key={r.chain}>
                    <TableCell className="font-mono">{r.chain}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-bold",
                        r.latency < 500 ? "text-green-500" : r.latency < 1000 ? "text-yellow-500" : "text-red-500"
                      )}>
                        {r.latency}ms
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {r.blockNumber ? Number(r.blockNumber).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {r.error ? (
                        <Badge variant="error" title={r.error}>Error</Badge>
                      ) : (
                        <Badge variant="success">Healthy</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Click "Check Health" to test RPC endpoints</p>
          )}
        </CardContent>
      </Card>

      {/* API Usage */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {monitoringData?.userUsage && monitoringData.userUsage.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Total Queries</TableHead>
                  <TableHead>Avg Duration</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Last Query</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monitoringData.userUsage.map(u => (
                  <TableRow key={u.email}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="font-bold">{u.total_queries.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={cn(
                        u.avg_duration_ms < 100 ? "text-green-500" : u.avg_duration_ms < 500 ? "text-yellow-500" : "text-red-500"
                      )}>
                        {u.avg_duration_ms}ms
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={u.error_count > 0 ? "text-red-500" : "text-green-500"}>
                        {u.error_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.last_query ? new Date(u.last_query).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No usage data available</p>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card className={cn(
        "border-l-4",
        alerts.some(a => !a.acknowledged && a.severity === 'critical') ? "border-l-red-500" :
        alerts.some(a => !a.acknowledged) ? "border-l-yellow-500" : "border-l-green-500"
      )}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alerts
            {unacknowledgedAlerts > 0 && (
              <Badge variant="error">{unacknowledgedAlerts} new</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={fetchAlerts} size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            {unacknowledgedAlerts > 0 && (
              <Button variant="secondary" onClick={acknowledgeAllAlerts} size="sm">
                Acknowledge All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {alerts.slice(0, 20).map(alert => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-3 rounded-lg border-l-4",
                      alert.acknowledged ? "opacity-60 bg-secondary" :
                      alert.severity === 'critical' ? "bg-red-500/10 border-l-red-500" :
                      alert.severity === 'warning' ? "bg-yellow-500/10 border-l-yellow-500" :
                      "bg-blue-500/10 border-l-blue-500"
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                            className="text-[10px]"
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.chainName && (
                            <span className="text-muted-foreground text-xs">[{alert.chainName}]</span>
                          )}
                          <span className="font-medium">{alert.message}</span>
                        </div>
                        {alert.details && (
                          <p className="text-xs text-muted-foreground">{alert.details}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <Button size="sm" variant="secondary" onClick={() => acknowledgeAlert(alert.id)}>
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-green-500 flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8" />
              <p>No alerts - all systems operational</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Infrastructure Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Infrastructure Health
          </CardTitle>
          <Button onClick={fetchSystemHealth} size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {systemHealth ? (
            <div className="space-y-6">
              {/* Backend Service */}
              <div className="p-4 bg-secondary rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Backend Service</span>
                  <Badge
                    variant={
                      systemHealth.backend_service.status === 'healthy' ? 'success' :
                      systemHealth.backend_service.status === 'degraded' ? 'warning' : 'error'
                    }
                  >
                    {systemHealth.backend_service.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Latency</div>
                    <div className={cn(
                      "text-xl font-bold",
                      systemHealth.backend_service.latencyMs && systemHealth.backend_service.latencyMs > 1000 ? "text-yellow-500" : ""
                    )}>
                      {systemHealth.backend_service.latencyMs !== null ? `${systemHealth.backend_service.latencyMs}ms` : 'N/A'}
                    </div>
                  </div>
                  {systemHealth.backend_service.detailed?.version && (
                    <div>
                      <div className="text-xs text-muted-foreground">Version</div>
                      <div className="text-lg font-bold">{systemHealth.backend_service.detailed.version}</div>
                    </div>
                  )}
                  {systemHealth.backend_service.detailed?.uptime_seconds !== undefined && (
                    <div>
                      <div className="text-xs text-muted-foreground">Uptime</div>
                      <div className="text-lg font-bold">
                        {formatUptime(systemHealth.backend_service.detailed.uptime_seconds)}
                      </div>
                    </div>
                  )}
                  {systemHealth.backend_service.detailed?.checks?.database && (
                    <div>
                      <div className="text-xs text-muted-foreground">DB Latency</div>
                      <div className={cn(
                        "text-lg font-bold",
                        systemHealth.backend_service.detailed.checks.database.latency_ms > 100 ? "text-yellow-500" : ""
                      )}>
                        {systemHealth.backend_service.detailed.checks.database.latency_ms}ms
                      </div>
                    </div>
                  )}
                </div>

                {/* Database Pools */}
                {systemHealth.backend_service.detailed?.checks?.database?.pools && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs font-semibold mb-2">Database Pools</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(systemHealth.backend_service.detailed.checks.database.pools).map(([poolName, pool]) => (
                        <div key={poolName} className="p-3 bg-card rounded-lg border border-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-xs uppercase">{poolName}</span>
                            <Badge variant={pool.connected ? 'success' : 'error'} className="text-[10px]">
                              {pool.connected ? 'CONNECTED' : 'DOWN'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>Active: <strong>{pool.active}</strong></div>
                            <div>Idle: <strong>{pool.idle}</strong></div>
                            <div>Waiting: <strong className={pool.waiting > 0 ? "text-yellow-500" : ""}>{pool.waiting}</strong></div>
                            <div>Max: <strong>{pool.max_connections}</strong></div>
                          </div>
                          <div className="h-1 bg-border rounded-full mt-2">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                ((pool.active + pool.idle) / pool.max_connections) > 0.8 ? "bg-red-500" : "bg-green-500"
                              )}
                              style={{ width: `${Math.min(100, ((pool.active + pool.idle) / pool.max_connections) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chain Sync Status */}
                {systemHealth.backend_service.detailed?.checks?.sync?.chains && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs font-semibold mb-2">Chain Sync Status</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {systemHealth.backend_service.detailed.checks.sync.chains.map((chain) => (
                        <div key={chain.chain_id} className="p-3 bg-card rounded-lg border border-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm">{chain.chain_name || `Chain ${chain.chain_id}`}</span>
                            <Badge
                              variant={
                                chain.status === 'synced' ? 'success' :
                                chain.status === 'syncing' ? 'warning' :
                                chain.status === 'disabled' ? 'secondary' : 'error'
                              }
                              className="text-[10px]"
                            >
                              {chain.status.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Synced: <strong>{Number(chain.synced_block).toLocaleString()}</strong>
                            {' / '}Head: <strong>{Number(chain.head_block).toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between text-xs mb-2">
                            <span className={cn(
                              chain.blocks_behind > 1000 ? "text-red-500" :
                              chain.blocks_behind > 100 ? "text-yellow-500" : "text-green-500"
                            )}>
                              Behind: {chain.blocks_behind.toLocaleString()}
                            </span>
                            <span className={cn(
                              chain.sync_percentage >= 99 ? "text-green-500" :
                              chain.sync_percentage >= 90 ? "text-yellow-500" : "text-red-500"
                            )}>
                              {chain.sync_percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1 bg-border rounded-full">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                chain.sync_percentage >= 99 ? "bg-green-500" :
                                chain.sync_percentage >= 90 ? "bg-yellow-500" : "bg-gold"
                              )}
                              style={{ width: `${chain.sync_percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Database Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemHealth.frontend_db && (
                  <div className="p-4 bg-secondary rounded-lg">
                    <h4 className="font-semibold mb-3">{systemHealth.frontend_db.database}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Connections</div>
                        <div className={cn(
                          "text-xl font-bold",
                          systemHealth.frontend_db.connections.usagePercent > 80 ? "text-red-500" : ""
                        )}>
                          {systemHealth.frontend_db.connections.active + systemHealth.frontend_db.connections.idle}/{systemHealth.frontend_db.connections.max}
                        </div>
                        <div className="h-1 bg-border rounded-full mt-1">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              systemHealth.frontend_db.connections.usagePercent > 80 ? "bg-red-500" : "bg-green-500"
                            )}
                            style={{ width: `${systemHealth.frontend_db.connections.usagePercent}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Cache Hit Ratio</div>
                        <div className={cn(
                          "text-xl font-bold",
                          systemHealth.frontend_db.cacheHitRatio < 90 ? "text-yellow-500" : "text-green-500"
                        )}>
                          {systemHealth.frontend_db.cacheHitRatio}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Size</div>
                        <div className="text-lg font-bold">{systemHealth.frontend_db.size}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Deadlocks</div>
                        <div className={cn(
                          "text-lg font-bold",
                          systemHealth.frontend_db.deadlocks > 0 ? "text-red-500" : ""
                        )}>
                          {systemHealth.frontend_db.deadlocks}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {systemHealth.backend_db && (
                  <div className="p-4 bg-secondary rounded-lg">
                    <h4 className="font-semibold mb-3">{systemHealth.backend_db.database}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Connections</div>
                        <div className={cn(
                          "text-xl font-bold",
                          systemHealth.backend_db.connections.usagePercent > 80 ? "text-red-500" : ""
                        )}>
                          {systemHealth.backend_db.connections.active + systemHealth.backend_db.connections.idle}/{systemHealth.backend_db.connections.max}
                        </div>
                        <div className="h-1 bg-border rounded-full mt-1">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              systemHealth.backend_db.connections.usagePercent > 80 ? "bg-red-500" : "bg-green-500"
                            )}
                            style={{ width: `${systemHealth.backend_db.connections.usagePercent}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Cache Hit Ratio</div>
                        <div className={cn(
                          "text-xl font-bold",
                          systemHealth.backend_db.cacheHitRatio < 90 ? "text-yellow-500" : "text-green-500"
                        )}>
                          {systemHealth.backend_db.cacheHitRatio}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Size</div>
                        <div className="text-lg font-bold">{systemHealth.backend_db.size}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Deadlocks</div>
                        <div className={cn(
                          "text-lg font-bold",
                          systemHealth.backend_db.deadlocks > 0 ? "text-red-500" : ""
                        )}>
                          {systemHealth.backend_db.deadlocks}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground text-right">
                Last updated: {new Date(systemHealth.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Loading infrastructure health...</p>
          )}
        </CardContent>
      </Card>

      {/* Sync Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sync Progress
          </CardTitle>
          <Button onClick={fetchSyncHistory} size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {syncHistory?.current && syncHistory.current.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {syncHistory.current.map(chain => {
                const status = syncHistory.syncStatus?.[chain.chain]
                const rates = syncHistory.syncRates?.[chain.chain]
                const chartData = syncHistory.chartData?.[chain.chain]
                const remoteBlock = syncHistory.rpcBlocks?.[chain.chain]

                return (
                  <div key={chain.chain} className="p-4 bg-secondary rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold">{chain.name}</span>
                      {status && (
                        <Badge
                          variant={status.percentSynced >= 99 ? 'success' : status.percentSynced >= 90 ? 'warning' : 'error'}
                        >
                          {status.percentSynced}% synced
                        </Badge>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-border rounded-full mb-3">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          status?.percentSynced && status.percentSynced >= 99 ? "bg-green-500" : "bg-gold"
                        )}
                        style={{ width: `${status?.percentSynced || 0}%` }}
                      />
                    </div>

                    {/* Sparkline */}
                    {chartData && chartData.blocks.length > 1 && (
                      <div className="flex items-end h-10 gap-0.5 mb-3">
                        {chartData.blocks.map((val, i, arr) => {
                          const min = Math.min(...arr)
                          const max = Math.max(...arr)
                          const range = max - min || 1
                          const height = ((val - min) / range) * 100
                          return (
                            <div
                              key={i}
                              className={cn(
                                "flex-1 rounded-sm",
                                i === arr.length - 1 ? "bg-gold" : "bg-blue-400/50"
                              )}
                              style={{ height: `${Math.max(10, height)}%` }}
                              title={`${val.toLocaleString()} blocks`}
                            />
                          )
                        })}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Local Block:</span>
                        <strong className="text-foreground">{chain.latest_block.toLocaleString()}</strong>
                      </div>
                      {remoteBlock && (
                        <div className="flex justify-between">
                          <span>Remote Block:</span>
                          <strong className="text-foreground">{remoteBlock.toLocaleString()}</strong>
                        </div>
                      )}
                      {status && status.behind > 0 && (
                        <div className={cn(
                          "flex justify-between",
                          status.behind > 100 ? "text-red-500" : "text-yellow-500"
                        )}>
                          <span>Behind:</span>
                          <strong>{status.behind.toLocaleString()} blocks</strong>
                        </div>
                      )}
                      {rates && (
                        <div className="flex justify-between">
                          <span>Speed:</span>
                          <strong className="text-foreground">{rates.blocksPerHour.toLocaleString()} blocks/hr</strong>
                        </div>
                      )}
                      {status && status.estimatedTimeToSync && (
                        <div className="flex justify-between">
                          <span>ETA:</span>
                          <strong className={status.estimatedTimeToSync === 'Synced' ? "text-green-500" : "text-foreground"}>
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
            <p className="text-muted-foreground">Loading sync progress...</p>
          )}
        </CardContent>
      </Card>

      {/* Container Logs */}
      <LogsViewer />
    </div>
  )
})
