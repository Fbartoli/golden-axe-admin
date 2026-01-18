'use client'

import { useState, memo } from 'react'
import { RefreshCw, Play, Square, Trash2 } from 'lucide-react'
import { SyncStatus, SyncEvent } from '@/types'
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
  Label,
} from '@/components/ui'
import { cn } from '@/lib/utils'

type ViewMode = 'status' | 'live'

interface SyncTabProps {
  syncStatus: SyncStatus | null
  syncSpeed: Record<number, number>
  autoRefresh: boolean
  setAutoRefresh: (value: boolean) => void
  onRefresh: () => void
  sseConnected: boolean
  syncEvents: SyncEvent[]
  setSyncEvents: (events: SyncEvent[]) => void
  startSyncStream: () => void
  stopSyncStream: () => void
}

export const SyncTab = memo(function SyncTab({
  syncStatus,
  syncSpeed,
  autoRefresh,
  setAutoRefresh,
  onRefresh,
  sseConnected,
  syncEvents,
  setSyncEvents,
  startSyncStream,
  stopSyncStream,
}: SyncTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('status')

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'status' ? 'gold' : 'outline'}
          onClick={() => setViewMode('status')}
        >
          Status Overview
        </Button>
        <Button
          variant={viewMode === 'live' ? 'gold' : 'outline'}
          onClick={() => setViewMode('live')}
          className="gap-2"
        >
          Live Stream
          {sseConnected && (
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </Button>
      </div>

      {/* Status View */}
      {viewMode === 'status' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sync Status</CardTitle>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh (5s)
              </label>
              <Button onClick={onRefresh} size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!syncStatus ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <span className="font-medium">Database:</span>
                  {syncStatus.dbConnected ? (
                    <Badge variant="success">Connected - Syncing</Badge>
                  ) : (
                    <Badge variant="warning">No sync data yet</Badge>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">
                    Enabled Chains ({syncStatus.config.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Chain</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Batch Size</TableHead>
                          <TableHead>Concurrency</TableHead>
                          <TableHead>Start Block</TableHead>
                          <TableHead>Synced Block</TableHead>
                          <TableHead>Blocks</TableHead>
                          <TableHead>Txs</TableHead>
                          <TableHead>Logs</TableHead>
                          <TableHead>Speed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncStatus.config.map((c) => {
                          const status = syncStatus.chainStatus[c.chain]
                          return (
                            <TableRow key={c.chain}>
                              <TableCell className="font-mono">{c.chain}</TableCell>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell>{c.batch_size}</TableCell>
                              <TableCell>{c.concurrency}</TableCell>
                              <TableCell>{c.start_block?.toLocaleString() || '-'}</TableCell>
                              <TableCell>
                                {status?.latest_synced_block ? (
                                  <strong className="text-gold">{status.latest_synced_block.toLocaleString()}</strong>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {status?.total_blocks?.toLocaleString() || <span className="text-muted-foreground">0</span>}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {status?.total_txs?.toLocaleString() || <span className="text-muted-foreground">0</span>}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {status?.total_logs?.toLocaleString() || <span className="text-muted-foreground">0</span>}
                              </TableCell>
                              <TableCell>
                                {syncSpeed[c.chain] ? (
                                  <span className="text-green-500 font-bold">
                                    {syncSpeed[c.chain]} blk/s
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {Object.keys(syncStatus.chainStatus).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Sync Summary</h4>
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(syncStatus.chainStatus).map(([chain, status]) => {
                        const config = syncStatus.config.find((c) => c.chain === Number(chain))
                        return (
                          <div key={chain} className="min-w-[200px] p-4 bg-secondary rounded-lg">
                            <div className="font-bold mb-2">
                              {config?.name || `Chain ${chain}`}
                            </div>
                            <div className="text-sm space-y-1 text-muted-foreground">
                              <div>Block: <span className="text-foreground">{status.latest_synced_block?.toLocaleString() || '-'}</span></div>
                              <div>Blocks: <span className="text-foreground">{status.total_blocks?.toLocaleString() || 0}</span></div>
                              <div>Txs: <span className="text-foreground">{status.total_txs?.toLocaleString() || 0}</span></div>
                              <div>Logs: <span className="text-foreground">{status.total_logs?.toLocaleString() || 0}</span></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live View */}
      {viewMode === 'live' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              Live Sync Monitor
              {sseConnected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="error">Disconnected</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={startSyncStream} size="sm">
                <Play className="h-4 w-4 mr-1" />
                Reconnect
              </Button>
              <Button variant="danger" onClick={stopSyncStream} size="sm">
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
              <Button variant="secondary" onClick={() => setSyncEvents([])} size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chain Status Cards */}
            {(() => {
              const latestEvent = syncEvents[syncEvents.length - 1]
              const chains = latestEvent?.chains || []
              const connections = latestEvent?.connections || {}
              const totalConnections = Object.values(connections).reduce(
                (sum: number, pool: any) => sum + (pool?.active || 0) + (pool?.idle || 0),
                0
              )

              return (
                <div className="flex flex-wrap gap-4">
                  {chains.map((chain: any) => {
                    const behind = parseInt(chain.behind) || 0
                    const current = parseInt(chain.current) || 0
                    const target = parseInt(chain.target) || 0
                    const progress = target > 0 ? ((current / target) * 100).toFixed(2) : 0

                    return (
                      <div key={chain.chain} className="min-w-[220px] p-4 bg-secondary rounded-lg">
                        <div className="flex items-center gap-2 font-bold mb-2">
                          {chain.name || `Chain ${chain.chain}`}
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            chain.running ? "bg-green-500" : "bg-red-500"
                          )} />
                        </div>
                        <div className="text-sm space-y-1">
                          <div>Current: <span className="font-mono">{current.toLocaleString()}</span></div>
                          <div>Target: <span className="font-mono">{target.toLocaleString()}</span></div>
                          <div className={cn(
                            behind > 1000 ? "text-red-500" : behind > 100 ? "text-yellow-500" : "text-green-500"
                          )}>
                            Behind: {behind.toLocaleString()}
                          </div>
                          <div className="mt-2">
                            <div className="h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-300"
                                style={{ width: `${Math.min(100, Number(progress))}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{progress}% synced</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="min-w-[180px] p-4 bg-secondary rounded-lg">
                    <div className="font-bold mb-2">Connections</div>
                    <div className="text-3xl font-bold text-gold">{totalConnections}</div>
                    {Object.entries(connections).map(([pool, stats]: [string, any]) => (
                      <div key={pool} className="text-xs text-muted-foreground">
                        {pool}: {stats?.active || 0} active, {stats?.idle || 0} idle
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Log output */}
            <div className="bg-dark-black rounded-lg p-4 h-[400px] overflow-auto font-mono text-xs">
              {syncEvents.slice().reverse().map((event, i) => (
                <div key={i} className="mb-1">
                  <span className="text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  {event.chains?.map((chain: any) => (
                    <span key={chain.chain}>
                      <span className="text-blue-400"> [{chain.name || chain.chain}]</span>
                      <span className="text-cyan-400"> #{parseInt(chain.current).toLocaleString()}</span>
                      <span className={parseInt(chain.behind) > 100 ? "text-orange-400" : "text-green-400"}>
                        {' '}(-{parseInt(chain.behind).toLocaleString()})
                      </span>
                    </span>
                  ))}
                </div>
              ))}
              {syncEvents.length === 0 && (
                <div className="text-muted-foreground">Waiting for events...</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
})
