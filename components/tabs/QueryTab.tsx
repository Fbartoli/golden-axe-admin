'use client'

import { useState, memo } from 'react'
import { Database, Code, Play, Square, Trash2, HelpCircle, X } from 'lucide-react'
import { Network, SchemaData, QueryResult, DecodedResult } from '@/types'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Textarea,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ScrollArea,
} from '@/components/ui'
import { cn } from '@/lib/utils'

type ViewMode = 'query' | 'decoder'

interface QueryTabProps {
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
  abiInput: string
  setAbiInput: (abi: string) => void
  topicsInput: string
  setTopicsInput: (topics: string) => void
  dataInput: string
  setDataInput: (data: string) => void
  decodedResult: DecodedResult | null
  decodeEvent: () => void
}

export const QueryTab = memo(function QueryTab({
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
  const [viewMode, setViewMode] = useState<ViewMode>('query')

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'query' ? 'gold' : 'outline'}
          onClick={() => setViewMode('query')}
          className="gap-2"
        >
          <Database className="h-4 w-4" />
          SQL Query
        </Button>
        <Button
          variant={viewMode === 'decoder' ? 'gold' : 'outline'}
          onClick={() => setViewMode('decoder')}
          className="gap-2"
        >
          <Code className="h-4 w-4" />
          Event Decoder
        </Button>
      </div>

      {/* Query View */}
      {viewMode === 'query' && (
        <div className="flex gap-6 flex-wrap">
          {/* Main Query Panel */}
          <div className="flex-1 min-w-[300px] space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>SQL Query</CardTitle>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowHelper(!showHelper)}
                >
                  {showHelper ? <X className="h-4 w-4 mr-1" /> : <HelpCircle className="h-4 w-4 mr-1" />}
                  {showHelper ? 'Hide Helper' : 'Show Helper'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="font-semibold">Chain:</Label>
                  <Select value={queryChain} onValueChange={setQueryChain}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.filter(n => n.enabled).map(n => (
                        <SelectItem key={n.chain} value={n.chain.toString()}>
                          {n.name} ({n.chain})
                        </SelectItem>
                      ))}
                      {networks.filter(n => n.enabled).length === 0 && (
                        <>
                          <SelectItem value="1">Main (1)</SelectItem>
                          <SelectItem value="7777777">Zora (7777777)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">
                    Event Signatures{' '}
                    <span className="font-normal text-muted-foreground">(one per line, enables ABI decoding)</span>
                  </Label>
                  <Textarea
                    className="font-mono text-xs h-20"
                    value={eventSignatures}
                    onChange={e => setEventSignatures(e.target.value)}
                    placeholder={`Transfer(address indexed from, address indexed to, uint256 value)\nApproval(address indexed owner, address indexed spender, uint256 value)`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">SQL Query</Label>
                  <Textarea
                    className="font-mono text-sm h-48"
                    value={queryText}
                    onChange={e => setQueryText(e.target.value)}
                    placeholder="Enter SQL query..."
                  />
                  {queryErrors.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
                      <strong>Validation Issues:</strong>
                      <ul className="list-disc ml-5 mt-1">
                        {queryErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {queryErrors.length === 0 && queryText.trim() && (
                    <div className="p-2 bg-green-500/10 text-green-500 rounded-lg text-sm">
                      Query looks valid
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={executeQuery} disabled={queryLoading} variant="gold">
                    {liveQueryEnabled ? (
                      liveQueryConnected ? 'Streaming...' : 'Start Live'
                    ) : (
                      queryLoading ? 'Running...' : 'Run Query'
                    )}
                    <Play className="h-4 w-4 ml-1" />
                  </Button>
                  {liveQueryEnabled && liveQueryConnected && (
                    <Button variant="danger" onClick={stopLiveQuery}>
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQueryEnabled}
                      onChange={e => {
                        setLiveQueryEnabled(e.target.checked)
                        if (!e.target.checked) stopLiveQuery()
                      }}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="font-semibold">Live Mode</span>
                    <span className="text-xs text-muted-foreground">(streams new results)</span>
                  </label>
                  {liveQueryEnabled && (
                    <Input
                      className="w-64"
                      placeholder="API Key (optional)"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                    />
                  )}
                  {!liveQueryEnabled && queryTime !== null && (
                    <span className="text-sm text-muted-foreground">Completed in {queryTime}ms</span>
                  )}
                  {liveQueryEnabled && liveQueryConnected && (
                    <Badge variant="success">{liveQueryResults.length} results</Badge>
                  )}
                  {liveQueryEnabled && liveQueryError && (
                    <Badge variant="error">{liveQueryError}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Live Results */}
            {liveQueryEnabled && liveQueryResults.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Live Results
                    <Badge variant="gold">{liveQueryResults.length} rows</Badge>
                  </CardTitle>
                  <Button variant="secondary" size="sm" onClick={() => setLiveQueryResults([])}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(liveQueryResults[0]).map(key => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {liveQueryResults.map((row, i) => (
                          <TableRow key={i} className={cn(i === 0 && "bg-green-500/10")}>
                            {Object.values(row).map((val: any, j) => (
                              <TableCell key={j} className="font-mono text-xs">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Query Results */}
            {queryResult && !liveQueryEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Results
                    {queryResult.success ? (
                      <Badge variant="success">Success</Badge>
                    ) : (
                      <Badge variant="error">Error</Badge>
                    )}
                    {queryResult.status && (
                      <span className="text-sm text-muted-foreground ml-auto">Status: {queryResult.status}</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {queryResult.error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                      {queryResult.error}
                    </div>
                  )}

                  {queryResult.data && (
                    <>
                      {Array.isArray(queryResult.data) ? (
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            {queryResult.data.length} rows returned
                          </div>
                          {queryResult.data.length > 0 && (
                            <ScrollArea className="max-h-[500px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {Object.keys(queryResult.data[0]).map(key => (
                                      <TableHead key={key}>{key}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {queryResult.data.map((row, i) => (
                                    <TableRow key={i}>
                                      {Object.values(row).map((val: any, j) => (
                                        <TableCell key={j} className="font-mono text-xs">
                                          {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          )}
                        </div>
                      ) : (
                        <pre className="p-4 bg-secondary rounded-lg overflow-auto text-xs font-mono">
                          {JSON.stringify(queryResult.data, null, 2)}
                        </pre>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Query Helper Sidebar */}
          {showHelper && (
            <div className="w-80 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Schema Explorer</CardTitle>
                </CardHeader>
                <CardContent>
                  {schemaData?.schema ? (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3 text-sm">
                        {Object.entries(schemaData.schema).map(([table, columns]) => (
                          <div key={table}>
                            <button
                              className="w-full text-left font-bold p-2 bg-secondary rounded hover:bg-muted cursor-pointer"
                              onClick={() => setQueryText((prev: string) => prev + (prev ? '\n' : '') + table)}
                            >
                              {table}
                            </button>
                            <div className="pl-2 mt-1 space-y-0.5">
                              {columns.map(col => (
                                <button
                                  key={col.name}
                                  className="w-full text-left px-2 py-1 rounded hover:bg-secondary flex justify-between text-xs cursor-pointer"
                                  onClick={() => setQueryText((prev: string) => prev + col.name)}
                                  title={`Click to insert "${col.name}"`}
                                >
                                  <span>{col.name}</span>
                                  <span className="text-muted-foreground">{col.type}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-muted-foreground text-sm">Loading schema...</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Query Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  {schemaData?.templates ? (
                    <div className="space-y-2">
                      {schemaData.templates.map((t, i) => (
                        <button
                          key={i}
                          className="w-full text-left p-3 bg-secondary hover:bg-muted rounded-lg cursor-pointer"
                          onClick={() => {
                            setQueryText(t.query)
                            if (t.eventSignature) setEventSignatures(t.eventSignature)
                          }}
                          title={t.description}
                        >
                          <div className="font-semibold text-sm">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.description}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Loading templates...</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Reference</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-3 text-muted-foreground">
                  <div>
                    <strong className="text-foreground">Hex literals:</strong>
                    <code className="block mt-1 p-2 bg-secondary rounded text-xs">{`'\\x1234...'`}</code>
                  </div>
                  <div>
                    <strong className="text-foreground">Array access:</strong>
                    <code className="block mt-1 p-2 bg-secondary rounded text-xs">topics[1], topics[2]</code>
                  </div>
                  <div>
                    <strong className="text-foreground">Count rows:</strong>
                    <code className="block mt-1 p-2 bg-secondary rounded text-xs">count(1) not count(*)</code>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Decoder View */}
      {viewMode === 'decoder' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Decoder</CardTitle>
              <CardDescription>Decode raw event logs using an ABI signature</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">ABI (event signature or JSON)</Label>
                <Textarea
                  className="font-mono text-xs h-20"
                  value={abiInput}
                  onChange={e => setAbiInput(e.target.value)}
                  placeholder="event Transfer(address indexed from, address indexed to, uint256 value)"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Topics (one per line)</Label>
                <Textarea
                  className="font-mono text-xs h-24"
                  value={topicsInput}
                  onChange={e => setTopicsInput(e.target.value)}
                  placeholder={`0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\n0x000000000000000000000000abc...\n0x000000000000000000000000def...`}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Data (hex)</Label>
                <Textarea
                  className="font-mono text-xs h-16"
                  value={dataInput}
                  onChange={e => setDataInput(e.target.value)}
                  placeholder="0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"
                />
              </div>

              <Button onClick={decodeEvent} variant="gold">
                <Code className="h-4 w-4 mr-1" />
                Decode Event
              </Button>
            </CardContent>
          </Card>

          {decodedResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Result
                  {decodedResult.success ? (
                    <Badge variant="success">Decoded</Badge>
                  ) : (
                    <Badge variant="error">Error</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {decodedResult.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    {decodedResult.error}
                  </div>
                )}

                {decodedResult.success && (
                  <div className="space-y-4">
                    <div>
                      <span className="font-semibold">Event:</span>{' '}
                      <code className="bg-secondary px-2 py-1 rounded">{decodedResult.eventName}</code>
                    </div>
                    <div>
                      <span className="font-semibold">Arguments:</span>
                      <pre className="mt-2 p-4 bg-secondary rounded-lg overflow-auto text-xs font-mono">
                        {JSON.stringify(decodedResult.args, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Example: ERC-20 Transfer</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="secondary"
                onClick={() => {
                  setAbiInput('event Transfer(address indexed from, address indexed to, uint256 value)')
                  setTopicsInput(`0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\n0x000000000000000000000000a9d1e08c7793af67e9d92fe308d5697fb81d3e43\n0x00000000000000000000000028c6c06298d514db089934071355e5743bf21d60`)
                  setDataInput('0x00000000000000000000000000000000000000000000000000000000773594d8')
                }}
              >
                Load Example
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
})
