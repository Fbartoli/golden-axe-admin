'use client'

import { useState } from 'react'
import { useAdmin } from '@/components/AdminContext'
import { Network, SchemaData, QueryResult, DecodedResult } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type ViewMode = 'query' | 'decoder'

interface QueryTabProps {
  // Query data
  networks: Network[]
  queryChain: string
  setQueryChain: (chain: string) => void
  eventSignatures: string
  setEventSignatures: (sigs: string) => void
  queryText: string
  setQueryText: (text: string | ((prev: string) => string)) => void
  queryErrors: string[]
  queryLoading: boolean
  queryTime: number | null
  queryResult: QueryResult | null
  liveQueryEnabled: boolean
  setLiveQueryEnabled: (enabled: boolean) => void
  liveQueryConnected: boolean
  liveQueryResults: any[]
  setLiveQueryResults: (results: any[]) => void
  liveQueryError: string | null
  apiKey: string
  setApiKey: (key: string) => void
  executeQuery: () => void
  stopLiveQuery: () => void
  showHelper: boolean
  setShowHelper: (show: boolean) => void
  schemaData: SchemaData | null
  // Decoder data
  abiInput: string
  setAbiInput: (abi: string) => void
  topicsInput: string
  setTopicsInput: (topics: string) => void
  dataInput: string
  setDataInput: (data: string) => void
  decodedResult: DecodedResult | null
  decodeEvent: () => void
}

export function QueryTab({
  networks,
  queryChain,
  setQueryChain,
  eventSignatures,
  setEventSignatures,
  queryText,
  setQueryText,
  queryErrors,
  queryLoading,
  queryTime,
  queryResult,
  liveQueryEnabled,
  setLiveQueryEnabled,
  liveQueryConnected,
  liveQueryResults,
  setLiveQueryResults,
  liveQueryError,
  apiKey,
  setApiKey,
  executeQuery,
  stopLiveQuery,
  showHelper,
  setShowHelper,
  schemaData,
  abiInput,
  setAbiInput,
  topicsInput,
  setTopicsInput,
  dataInput,
  setDataInput,
  decodedResult,
  decodeEvent,
}: QueryTabProps) {
  const { colors, styles, darkMode } = useAdmin()
  const [viewMode, setViewMode] = useState<ViewMode>('query')

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
        <button style={viewModeStyle('query')} onClick={() => setViewMode('query')}>
          SQL Query
        </button>
        <button style={viewModeStyle('decoder')} onClick={() => setViewMode('decoder')}>
          Event Decoder
        </button>
      </div>

      {/* Query View */}
      {viewMode === 'query' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Main Query Panel */}
          <div style={{ flex: '1 1 600px', minWidth: '300px' }}>
            <Card colors={colors} darkMode={darkMode}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>SQL Query</h3>
                <Button variant="secondary" size="sm" onClick={() => setShowHelper(!showHelper)}>
                  {showHelper ? 'Hide Helper' : 'Show Helper'}
                </Button>
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
                  Event Signatures <span style={{ fontWeight: 'normal', color: colors.textMuted }}>(one per line, enables ABI decoding)</span>
                </label>
                <textarea
                  name="eventSignatures"
                  spellCheck={false}
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
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    resize: 'vertical',
                    background: colors.inputBg,
                    color: colors.text,
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>SQL Query</label>
                <textarea
                  name="queryText"
                  spellCheck={false}
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  style={{
                    width: '100%',
                    height: '200px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    padding: '10px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    resize: 'vertical',
                    background: colors.inputBg,
                    color: colors.text,
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
                <Button onClick={executeQuery} disabled={queryLoading}>
                  {liveQueryEnabled ? (liveQueryConnected ? 'Streaming...' : 'Start Live') : (queryLoading ? 'Running...' : 'Run Query')}
                </Button>
                {liveQueryEnabled && liveQueryConnected && (
                  <Button variant="danger" onClick={stopLiveQuery}>Stop</Button>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="liveQueryEnabled"
                    checked={liveQueryEnabled}
                    onChange={e => {
                      setLiveQueryEnabled(e.target.checked)
                      if (!e.target.checked) stopLiveQuery()
                    }}
                  />
                  <strong>Live Mode</strong>
                  <span style={{ color: colors.textMuted, fontSize: '12px' }}>(streams new results as blocks sync)</span>
                </label>
                {liveQueryEnabled && (
                  <input
                    type="text"
                    name="apiKey"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="API Key (optional, bypasses rate limits)"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    style={{ ...styles.input, width: '280px', marginBottom: 0 }}
                  />
                )}
                {!liveQueryEnabled && queryTime !== null && (
                  <span style={{ color: colors.textMuted }}>Completed in {queryTime}ms</span>
                )}
                {liveQueryEnabled && liveQueryConnected && (
                  <Badge variant="success">Connected - {liveQueryResults.length} results</Badge>
                )}
                {liveQueryEnabled && liveQueryError && (
                  <Badge variant="danger">{liveQueryError}</Badge>
                )}
              </div>
            </Card>

            {/* Live Results */}
            {liveQueryEnabled && liveQueryResults.length > 0 && (
              <Card colors={colors} darkMode={darkMode}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0 }}>
                    Live Results
                    <Badge variant="primary" style={{ marginLeft: '10px' }}>{liveQueryResults.length} rows</Badge>
                  </h3>
                  <Button variant="secondary" onClick={() => setLiveQueryResults([])}>Clear</Button>
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
              </Card>
            )}

            {/* Query Results */}
            {queryResult && !liveQueryEnabled && (
              <Card colors={colors} darkMode={darkMode}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0 }}>
                    Results
                    {queryResult.success ? (
                      <Badge variant="success" style={{ marginLeft: '10px' }}>Success</Badge>
                    ) : (
                      <Badge variant="danger" style={{ marginLeft: '10px' }}>Error</Badge>
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
              </Card>
            )}
          </div>

          {/* Query Helper Sidebar */}
          {showHelper && (
            <div style={{ flex: '0 0 320px', minWidth: '280px' }}>
              {/* Schema Explorer */}
              <Card colors={colors} darkMode={darkMode} title="Schema Explorer">
                {schemaData?.schema ? (
                  <div style={{ fontSize: '13px' }}>
                    {Object.entries(schemaData.schema).map(([table, columns]) => (
                      <div key={table} style={{ marginBottom: '15px' }}>
                        <div
                          role="button"
                          tabIndex={0}
                          style={{ fontWeight: 'bold', cursor: 'pointer', padding: '5px', background: colors.statBg, borderRadius: '4px', marginBottom: '5px' }}
                          onClick={() => setQueryText((prev: string) => prev + (prev ? '\n' : '') + table)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setQueryText((prev: string) => prev + (prev ? '\n' : '') + table)
                            }
                          }}
                        >
                          📋 {table}
                        </div>
                        <div style={{ paddingLeft: '10px' }}>
                          {columns.map(col => (
                            <div
                              key={col.name}
                              role="button"
                              tabIndex={0}
                              style={{ padding: '3px 5px', cursor: 'pointer', borderRadius: '3px', display: 'flex', justifyContent: 'space-between' }}
                              onClick={() => setQueryText((prev: string) => prev + col.name)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setQueryText((prev: string) => prev + col.name)
                                }
                              }}
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
              </Card>

              {/* Query Templates */}
              <Card colors={colors} darkMode={darkMode} title="Query Templates">
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
              </Card>

              {/* Quick Reference */}
              <Card colors={colors} darkMode={darkMode} title="Quick Reference">
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
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Decoder View */}
      {viewMode === 'decoder' && (
        <>
          <Card colors={colors} darkMode={darkMode}>
            <h3>Event Decoder</h3>
            <p style={{ color: colors.textMuted, marginBottom: '20px' }}>Decode raw event logs using an ABI signature</p>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ABI (event signature or JSON)</label>
              <textarea
                name="abiInput"
                spellCheck={false}
                value={abiInput}
                onChange={e => setAbiInput(e.target.value)}
                placeholder="event Transfer(address indexed from, address indexed to, uint256 value)"
                style={{
                  width: '100%',
                  height: '80px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '10px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  resize: 'vertical',
                  background: colors.inputBg,
                  color: colors.text,
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Topics (one per line)</label>
              <textarea
                name="topicsInput"
                spellCheck={false}
                value={topicsInput}
                onChange={e => setTopicsInput(e.target.value)}
                placeholder={`0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
0x000000000000000000000000abc...
0x000000000000000000000000def...`}
                style={{
                  width: '100%',
                  height: '100px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '10px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  resize: 'vertical',
                  background: colors.inputBg,
                  color: colors.text,
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Data (hex)</label>
              <textarea
                name="dataInput"
                spellCheck={false}
                value={dataInput}
                onChange={e => setDataInput(e.target.value)}
                placeholder="0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"
                style={{
                  width: '100%',
                  height: '60px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '10px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  resize: 'vertical',
                  background: colors.inputBg,
                  color: colors.text,
                }}
              />
            </div>

            <Button onClick={decodeEvent}>Decode Event</Button>
          </Card>

          {decodedResult && (
            <Card colors={colors} darkMode={darkMode}>
              <h4>
                Result
                {decodedResult.success ? (
                  <Badge variant="success" style={{ marginLeft: '10px' }}>Decoded</Badge>
                ) : (
                  <Badge variant="danger" style={{ marginLeft: '10px' }}>Error</Badge>
                )}
              </h4>

              {decodedResult.error && (
                <div style={{ background: darkMode ? '#4a1c1c' : '#f8d7da', color: darkMode ? '#f8d7da' : '#721c24', padding: '15px', borderRadius: '4px' }}>
                  {decodedResult.error}
                </div>
              )}

              {decodedResult.success && (
                <div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Event:</strong> <code style={{ background: colors.statBg, padding: '2px 6px', borderRadius: '3px' }}>{decodedResult.eventName}</code>
                  </div>
                  <div>
                    <strong>Arguments:</strong>
                    <pre style={{ background: colors.statBg, padding: '15px', borderRadius: '4px', overflow: 'auto', fontSize: '13px' }}>
                      {JSON.stringify(decodedResult.args, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card colors={colors} darkMode={darkMode}>
            <h4>Example: ERC-20 Transfer</h4>
            <Button
              variant="secondary"
              onClick={() => {
                setAbiInput('event Transfer(address indexed from, address indexed to, uint256 value)')
                setTopicsInput(`0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
0x000000000000000000000000a9d1e08c7793af67e9d92fe308d5697fb81d3e43
0x00000000000000000000000028c6c06298d514db089934071355e5743bf21d60`)
                setDataInput('0x00000000000000000000000000000000000000000000000000000000773594d8')
              }}
            >
              Load Example
            </Button>
          </Card>
        </>
      )}
    </>
  )
}
