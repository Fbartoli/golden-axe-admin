'use client'

import { useState } from 'react'
import { useAdmin } from '@/components/AdminContext'
import { SyncStatus, SyncEvent } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type ViewMode = 'status' | 'live'

interface SyncTabProps {
  // Status data
  syncStatus: SyncStatus | null
  syncSpeed: Record<number, number>
  autoRefresh: boolean
  setAutoRefresh: (value: boolean) => void
  onRefresh: () => void
  // Live data
  sseConnected: boolean
  syncEvents: SyncEvent[]
  setSyncEvents: (events: SyncEvent[]) => void
  startSyncStream: () => void
  stopSyncStream: () => void
}

export function SyncTab({
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
  const { colors, styles, darkMode } = useAdmin()
  const [viewMode, setViewMode] = useState<ViewMode>('status')

  const viewModeStyle = (mode: ViewMode) => ({
    padding: '8px 16px',
    background: viewMode === mode ? colors.primary : colors.cardBg,
    color: viewMode === mode ? '#fff' : colors.text,
    border: `1px solid ${viewMode === mode ? colors.primary : colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  })

  return (
    <>
      {/* View Mode Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
        <button style={viewModeStyle('status')} onClick={() => setViewMode('status')}>
          Status Overview
        </button>
        <button style={viewModeStyle('live')} onClick={() => setViewMode('live')}>
          Live Stream
          {sseConnected && (
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              background: '#28a745',
              borderRadius: '50%',
              marginLeft: '8px',
              animation: 'pulse 2s infinite'
            }} />
          )}
        </button>
      </div>

      {/* Status View */}
      {viewMode === 'status' && (
        <Card colors={colors} darkMode={darkMode}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Sync Status</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                  type="checkbox"
                  name="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh (5s)
              </label>
              <Button onClick={onRefresh}>Refresh</Button>
            </div>
          </div>

          {!syncStatus ? (
            <p style={{ color: colors.textMuted }}>Loading...</p>
          ) : (
            <>
              <div style={{ marginBottom: '20px', padding: '10px', background: colors.statBg, borderRadius: '4px' }}>
                <strong>Database:</strong>
                {syncStatus.dbConnected ? (
                  <Badge variant="success" style={{ marginLeft: '10px' }}>Connected - Syncing</Badge>
                ) : (
                  <Badge variant="warning" style={{ marginLeft: '10px' }}>No sync data yet</Badge>
                )}
              </div>

              <h4>Enabled Chains ({syncStatus.config.length})</h4>
              <div style={{ overflowX: 'auto' }}>
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
                    {syncStatus.config.map((c) => {
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
                              <span style={{ color: colors.textMuted }}>-</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {status?.total_blocks ? (
                              status.total_blocks.toLocaleString()
                            ) : (
                              <span style={{ color: colors.textMuted }}>0</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {status?.total_logs ? (
                              status.total_logs.toLocaleString()
                            ) : (
                              <span style={{ color: colors.textMuted }}>0</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {syncSpeed[c.chain] ? (
                              <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                                {syncSpeed[c.chain]} blk/s
                              </span>
                            ) : (
                              <span style={{ color: colors.textMuted }}>-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {Object.keys(syncStatus.chainStatus).length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4>Sync Summary</h4>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {Object.entries(syncStatus.chainStatus).map(([chain, status]) => {
                      const config = syncStatus.config.find((c) => c.chain === Number(chain))
                      return (
                        <div key={chain} style={{ ...styles.stat, minWidth: '200px' }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                            {config?.name || `Chain ${chain}`}
                          </div>
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
        </Card>
      )}

      {/* Live View */}
      {viewMode === 'live' && (
        <Card colors={colors} darkMode={darkMode}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>
              Live Sync Monitor
              {sseConnected ? (
                <Badge variant="success" style={{ marginLeft: '10px' }}>Connected</Badge>
              ) : (
                <Badge variant="danger" style={{ marginLeft: '10px' }}>Disconnected</Badge>
              )}
            </h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={startSyncStream}>Reconnect</Button>
              <Button variant="danger" onClick={stopSyncStream}>Stop</Button>
              <Button variant="secondary" onClick={() => setSyncEvents([])}>Clear</Button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
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

          <div style={{
            background: darkMode ? '#1a1a2e' : '#1e1e1e',
            color: '#d4d4d4',
            padding: '15px',
            borderRadius: '4px',
            height: '400px',
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
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
            {syncEvents.length === 0 && <div style={{ color: '#888' }}>Waiting for events…</div>}
          </div>
        </Card>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  )
}
