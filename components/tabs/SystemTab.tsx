'use client'

import { useAdmin } from '@/components/AdminContext'

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
import { MonitoringData, RpcHealth, Alert, SystemHealth, SyncHistory } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

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

export function SystemTab({
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
  const { colors, styles } = useAdmin()

  return (
    <>
      {/* Database Size */}
      <Card colors={colors} darkMode={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Database Size</h3>
          <Button onClick={fetchMonitoring}>Refresh</Button>
        </div>

        {monitoringData?.dbSize && (
          <div style={{ marginBottom: '20px', padding: '15px', background: colors.statBg, borderRadius: '4px' }}>
            <strong>Total Database Size:</strong>{' '}
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: colors.primary }}>
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
                      <div style={{ width: '100px', height: '10px', background: colors.borderLight, borderRadius: '5px' }}>
                        <div
                          style={{
                            width: `${Math.min(100, (t.size_bytes / (monitoringData.dbSize?.size_bytes || 1)) * 100)}%`,
                            height: '100%',
                            background: colors.primary,
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
          <p style={{ color: colors.textMuted }}>No table data available</p>
        )}
      </Card>

      {/* RPC Health */}
      <Card colors={colors} darkMode={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>RPC Health Check</h3>
          <Button onClick={checkRpcHealth} disabled={rpcLoading}>
            {rpcLoading ? 'Checking...' : 'Check Health'}
          </Button>
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
                      <Badge variant="danger" title={r.error}>Error</Badge>
                    ) : (
                      <Badge variant="success">Healthy</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: colors.textMuted }}>Click "Check Health" to test RPC endpoints</p>
        )}
      </Card>

      {/* API Usage per User */}
      <Card colors={colors} darkMode={false} title="API Usage (Last 30 Days)">
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
          <p style={{ color: colors.textMuted }}>No usage data available (query_log table may not exist)</p>
        )}
      </Card>

      {/* Query History */}
      <Card colors={colors} darkMode={false} title="Recent Queries">
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
                      <Badge variant="danger" title={q.error}>Error</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: colors.textMuted }}>No query history available (query_log table may not exist)</p>
        )}
      </Card>

      {/* Alerts Panel */}
      <Card
        colors={colors}
        darkMode={false}
        style={{
          borderLeft: alerts.some(a => !a.acknowledged && a.severity === 'critical') ? '4px solid #dc3545' : alerts.some(a => !a.acknowledged) ? '4px solid #ffc107' : '4px solid #28a745'
        }}
      >
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
            <Button onClick={fetchAlerts}>Refresh</Button>
            {unacknowledgedAlerts > 0 && (
              <Button variant="secondary" onClick={acknowledgeAllAlerts}>Acknowledge All</Button>
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
                      {alert.chainName && <span style={{ color: colors.textMuted, marginRight: '8px' }}>[{alert.chainName}]</span>}
                      {alert.message}
                    </div>
                    {alert.details && <div style={{ fontSize: '12px', color: colors.textMuted }}>{alert.details}</div>}
                    <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <Button size="sm" onClick={() => acknowledgeAlert(alert.id)}>Dismiss</Button>
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
      </Card>

      {/* System Health - Database & Backend */}
      <Card colors={colors} darkMode={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Infrastructure Health</h3>
          <Button onClick={fetchSystemHealth}>Refresh</Button>
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
                  background: systemHealth.backend_service.status === 'healthy' ? '#28a745' : systemHealth.backend_service.status === 'degraded' ? '#ffc107' : systemHealth.backend_service.status === 'unhealthy' ? '#dc3545' : '#6c757d',
                  color: systemHealth.backend_service.status === 'degraded' ? '#000' : '#fff'
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

              {/* Detailed Backend Metrics */}
              {systemHealth.backend_service.detailed && (
                <>
                  {/* Version & Uptime */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${colors.border}` }}>
                    {systemHealth.backend_service.detailed.version && (
                      <div>
                        <div style={{ fontSize: '11px', color: colors.textMuted }}>Version</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          {systemHealth.backend_service.detailed.version}
                        </div>
                      </div>
                    )}
                    {systemHealth.backend_service.detailed.uptime_seconds !== undefined && (
                      <div>
                        <div style={{ fontSize: '11px', color: colors.textMuted }}>Uptime</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          {formatUptime(systemHealth.backend_service.detailed.uptime_seconds)}
                        </div>
                      </div>
                    )}
                    {systemHealth.backend_service.detailed.checks?.database && (
                      <>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>DB Status</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: systemHealth.backend_service.detailed.checks.database.status === 'ok' ? '#28a745' : '#dc3545' }}>
                            {systemHealth.backend_service.detailed.checks.database.status.toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>DB Latency</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: systemHealth.backend_service.detailed.checks.database.latency_ms > 100 ? '#ffc107' : colors.text }}>
                            {systemHealth.backend_service.detailed.checks.database.latency_ms}ms
                          </div>
                        </div>
                      </>
                    )}
                    {systemHealth.backend_service.detailed.checks?.sync && (
                      <div>
                        <div style={{ fontSize: '11px', color: colors.textMuted }}>Sync Status</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: systemHealth.backend_service.detailed.checks.sync.status === 'synced' ? '#28a745' : systemHealth.backend_service.detailed.checks.sync.status === 'syncing' ? '#ffc107' : '#dc3545' }}>
                          {systemHealth.backend_service.detailed.checks.sync.status.toUpperCase()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Database Pools */}
                  {systemHealth.backend_service.detailed.checks?.database?.pools && Object.keys(systemHealth.backend_service.detailed.checks.database.pools).length > 0 && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>Database Pools</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                        {Object.entries(systemHealth.backend_service.detailed.checks.database.pools).map(([poolName, pool]) => (
                          <div key={poolName} style={{ padding: '10px', background: colors.cardBg, borderRadius: '6px', border: `1px solid ${colors.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>{poolName}</span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                background: pool.connected ? '#28a745' : '#dc3545',
                                color: '#fff'
                              }}>
                                {pool.connected ? 'CONNECTED' : 'DISCONNECTED'}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                              <div>
                                <span style={{ color: colors.textMuted }}>Active: </span>
                                <strong>{pool.active}</strong>
                              </div>
                              <div>
                                <span style={{ color: colors.textMuted }}>Idle: </span>
                                <strong>{pool.idle}</strong>
                              </div>
                              <div>
                                <span style={{ color: colors.textMuted }}>Waiting: </span>
                                <strong style={{ color: pool.waiting > 0 ? '#ffc107' : colors.text }}>{pool.waiting}</strong>
                              </div>
                              <div>
                                <span style={{ color: colors.textMuted }}>Max: </span>
                                <strong>{pool.max_connections}</strong>
                              </div>
                            </div>
                            {/* Pool usage bar */}
                            <div style={{ height: '4px', background: colors.borderLight, borderRadius: '2px', marginTop: '8px' }}>
                              <div style={{
                                width: `${Math.min(100, ((pool.active + pool.idle) / pool.max_connections) * 100)}%`,
                                height: '100%',
                                background: ((pool.active + pool.idle) / pool.max_connections) > 0.8 ? '#dc3545' : '#28a745',
                                borderRadius: '2px',
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chain Sync Status */}
                  {systemHealth.backend_service.detailed.checks?.sync?.chains && systemHealth.backend_service.detailed.checks.sync.chains.length > 0 && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>Chain Sync Status</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                        {systemHealth.backend_service.detailed.checks.sync.chains.map((chain) => (
                          <div key={chain.chain_id} style={{ padding: '10px', background: colors.cardBg, borderRadius: '6px', border: `1px solid ${colors.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{chain.chain_name || `Chain ${chain.chain_id}`}</span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                background: chain.status === 'synced' ? '#28a745' : chain.status === 'syncing' ? '#ffc107' : chain.status === 'disabled' ? '#6c757d' : '#dc3545',
                                color: chain.status === 'syncing' ? '#000' : '#fff'
                              }}>
                                {chain.status.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>
                              <span>Synced: </span>
                              <strong style={{ color: colors.text }}>{Number(chain.synced_block).toLocaleString()}</strong>
                              <span> / Head: </span>
                              <strong style={{ color: colors.text }}>{Number(chain.head_block).toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>Behind: </span>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: chain.blocks_behind > 1000 ? '#dc3545' : chain.blocks_behind > 100 ? '#ffc107' : '#28a745' }}>
                                  {chain.blocks_behind.toLocaleString()} blocks
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>Synced: </span>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: chain.sync_percentage >= 99 ? '#28a745' : chain.sync_percentage >= 90 ? '#ffc107' : '#dc3545' }}>
                                  {chain.sync_percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            {/* Sync progress bar */}
                            <div style={{ height: '4px', background: colors.borderLight, borderRadius: '2px', marginTop: '6px' }}>
                              <div style={{
                                width: `${chain.sync_percentage}%`,
                                height: '100%',
                                background: chain.sync_percentage >= 99 ? '#28a745' : chain.sync_percentage >= 90 ? '#ffc107' : colors.primary,
                                borderRadius: '2px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            {chain.estimated_time_to_sync && chain.status !== 'synced' && (
                              <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                                ETA: <strong>{chain.estimated_time_to_sync}</strong>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
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
                      <div style={{ height: '4px', background: colors.borderLight, borderRadius: '2px', marginTop: '4px' }}>
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
                      <div style={{ height: '4px', background: colors.borderLight, borderRadius: '2px', marginTop: '4px' }}>
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
          <p style={{ color: colors.textMuted }}>Loading infrastructure health...</p>
        )}
      </Card>

      {/* Sync Progress Charts */}
      <Card colors={colors} darkMode={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Sync Progress</h3>
          <Button onClick={fetchSyncHistory}>Refresh</Button>
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
                      <Badge
                        color={status.percentSynced >= 99 ? '#28a745' : status.percentSynced >= 90 ? '#ffc107' : '#dc3545'}
                      >
                        {status.percentSynced}% synced
                      </Badge>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '8px', background: colors.borderLight, borderRadius: '4px', marginBottom: '10px' }}>
                    <div style={{
                      width: `${status?.percentSynced || 0}%`,
                      height: '100%',
                      background: status?.percentSynced && status.percentSynced >= 99 ? '#28a745' : colors.primary,
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
                              background: i === arr.length - 1 ? colors.primary : '#b8daff',
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
          <p style={{ color: colors.textMuted }}>Loading sync progress...</p>
        )}
      </Card>
    </>
  )
}
