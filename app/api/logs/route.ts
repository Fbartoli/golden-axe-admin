import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
const CONTAINER_NAME = process.env.BACKEND_CONTAINER || 'horusblock-be'

// Validate container name to prevent command injection
// Only allow alphanumeric, dashes, underscores, and dots
const CONTAINER_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/
const MAX_CONTAINER_NAME_LENGTH = 128

function validateContainerName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= MAX_CONTAINER_NAME_LENGTH &&
    CONTAINER_NAME_REGEX.test(name)
  )
}

// Validate since parameter (Unix timestamp or duration like "10m")
const SINCE_REGEX = /^(\d+|(\d+[smhd]))$/

function validateSince(since: string): boolean {
  return SINCE_REGEX.test(since)
}

// Fetch logs via Docker Engine API
async function fetchDockerLogs(container: string, tail: number = 500, since?: string): Promise<string> {
  // Validate container name to prevent command injection
  if (!validateContainerName(container)) {
    throw new Error('Invalid container name')
  }

  // Validate and sanitize tail parameter
  const safeTail = Math.max(1, Math.min(10000, Math.floor(tail)))

  // Validate since parameter if provided
  if (since && !validateSince(since)) {
    throw new Error('Invalid since parameter')
  }

  const params = new URLSearchParams({
    stdout: 'true',
    stderr: 'true',
    tail: safeTail.toString(),
    timestamps: 'true',
  })

  if (since) {
    params.set('since', since)
  }

  try {
    // Try Docker socket first
    const { execSync } = await import('child_process')
    // Use array-based command execution to prevent shell injection
    const url = `http://localhost/containers/${encodeURIComponent(container)}/logs?${params}`
    const cmd = `curl -s --unix-socket ${DOCKER_SOCKET} "${url}"`
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 10000 })
    return cleanDockerLogs(result)
  } catch (e) {
    // Fall back to docker CLI with safe argument passing
    try {
      const { spawnSync } = await import('child_process')
      const args = ['logs', `--tail=${safeTail}`, '--timestamps']
      if (since) {
        args.push(`--since=${since}`)
      }
      args.push(container)

      const result = spawnSync('docker', args, { encoding: 'utf-8', timeout: 10000 })
      if (result.error) {
        throw result.error
      }
      return result.stdout + result.stderr
    } catch (e2: any) {
      throw new Error(`Failed to fetch logs: ${e2.message}`)
    }
  }
}

// Clean Docker log output (remove stream headers)
function cleanDockerLogs(raw: string): string {
  // Docker multiplexed streams have 8-byte headers
  // For simplicity, just remove non-printable characters
  return raw
    .split('\n')
    .map(line => line.replace(/^[\x00-\x08]/g, '').replace(/[\x00-\x08]/g, ' '))
    .filter(line => line.trim())
    .join('\n')
}

// List available containers
async function listContainers(): Promise<Array<{ id: string; name: string; status: string }>> {
  try {
    const { execSync } = await import('child_process')
    const cmd = `curl -s --unix-socket ${DOCKER_SOCKET} "http://localhost/containers/json?all=true"`
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 })
    const containers = JSON.parse(result)
    return containers.map((c: any) => ({
      id: c.Id.substring(0, 12),
      name: c.Names[0]?.replace(/^\//, '') || c.Id.substring(0, 12),
      status: c.State,
    }))
  } catch {
    // Fall back to docker CLI
    try {
      const { execSync } = await import('child_process')
      const result = execSync('docker ps -a --format "{{.ID}}|{{.Names}}|{{.State}}"', { encoding: 'utf-8', timeout: 5000 })
      return result.trim().split('\n').filter(Boolean).map(line => {
        const [id, name, status] = line.split('|')
        return { id, name, status }
      })
    } catch {
      return []
    }
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'logs'
  const container = searchParams.get('container') || CONTAINER_NAME
  const tail = parseInt(searchParams.get('tail') || '200')
  const since = searchParams.get('since') || undefined

  try {
    if (action === 'list') {
      const containers = await listContainers()
      return NextResponse.json({ containers })
    }

    if (action === 'logs') {
      const logs = await fetchDockerLogs(container, tail, since)
      return NextResponse.json({
        container,
        logs: logs.split('\n'),
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
