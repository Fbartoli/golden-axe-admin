'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Terminal } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { cn } from '@/lib/utils'

interface Container {
  id: string
  name: string
  status: string
}

export function LogsViewer() {
  const [containers, setContainers] = useState<Container[]>([])
  const [selectedContainer, setSelectedContainer] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [tailLines, setTailLines] = useState('200')
  const [filter, setFilter] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Fetch container list
  useEffect(() => {
    async function fetchContainers() {
      try {
        const res = await fetch('/api/logs?action=list')
        if (res.ok) {
          const data = await res.json()
          setContainers(data.containers || [])
          if (data.containers?.length > 0 && !selectedContainer) {
            const defaultContainer = data.containers.find((c: Container) =>
              c.name.includes('horusblock') || c.name.includes('golden-axe') || c.name.includes('backend')
            ) || data.containers.find((c: Container) => c.status === 'running') || data.containers[0]
            setSelectedContainer(defaultContainer.name)
          }
        }
      } catch (e: any) {
        setError('Failed to fetch containers: ' + e.message)
      }
    }
    fetchContainers()
  }, [selectedContainer])

  const fetchLogs = async () => {
    if (!selectedContainer) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/logs?action=logs&container=${encodeURIComponent(selectedContainer)}&tail=${tailLines}`)
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs || [])
      } else {
        setError(data.error || 'Failed to fetch logs')
      }
    } catch (e: any) {
      setError('Failed to fetch logs: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedContainer) {
      fetchLogs()
    }
  }, [selectedContainer, tailLines])

  useEffect(() => {
    if (autoRefresh && selectedContainer) {
      const interval = setInterval(fetchLogs, 3000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, selectedContainer])

  useEffect(() => {
    if (autoRefresh) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoRefresh])

  const filteredLogs = filter
    ? logs.filter(line => line.toLowerCase().includes(filter.toLowerCase()))
    : logs

  const getLogLevel = (line: string): 'error' | 'warn' | 'info' | 'debug' | null => {
    const lower = line.toLowerCase()
    if (lower.includes('error') || lower.includes('fatal') || lower.includes('panic')) return 'error'
    if (lower.includes('warn')) return 'warn'
    if (lower.includes('debug') || lower.includes('trace')) return 'debug'
    if (lower.includes('info')) return 'info'
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Container Logs
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedContainer} onValueChange={setSelectedContainer}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select container..." />
            </SelectTrigger>
            <SelectContent>
              {containers.map(c => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name} ({c.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tailLines} onValueChange={setTailLines}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 lines</SelectItem>
              <SelectItem value="200">200 lines</SelectItem>
              <SelectItem value="500">500 lines</SelectItem>
              <SelectItem value="1000">1000 lines</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Auto-refresh
          </label>
          <Button onClick={fetchLogs} disabled={loading || !selectedContainer} size="sm">
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search/Filter */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="max-w-xs"
          />
          {filter && (
            <span className="text-xs text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length} lines
            </span>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Logs Display */}
        <div className="bg-dark-black rounded-lg p-4 h-[500px] overflow-auto font-mono text-xs">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((line, i) => {
              const level = getLogLevel(line)
              return (
                <div
                  key={i}
                  className={cn(
                    "py-0.5 border-b border-white/5",
                    level === 'error' && "text-red-400",
                    level === 'warn' && "text-yellow-400",
                    level === 'info' && "text-green-400",
                    level === 'debug' && "text-muted-foreground",
                    !level && "text-gray-300"
                  )}
                >
                  {line}
                </div>
              )
            })
          ) : (
            <div className="text-muted-foreground">
              {selectedContainer ? 'No logs available' : 'Select a container to view logs'}
            </div>
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Stats */}
        {logs.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Total lines: <strong className="text-foreground">{logs.length}</strong></span>
            <span>Errors: <strong className="text-red-400">{logs.filter(l => getLogLevel(l) === 'error').length}</strong></span>
            <span>Warnings: <strong className="text-yellow-400">{logs.filter(l => getLogLevel(l) === 'warn').length}</strong></span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
