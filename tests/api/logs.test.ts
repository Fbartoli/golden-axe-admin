import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock child_process before importing
const mockExecSync = vi.fn()
const mockSpawnSync = vi.fn()

vi.mock('child_process', () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
  spawnSync: (...args: unknown[]) => mockSpawnSync(...args),
}))

describe('GET /api/logs', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('container name validation', () => {
    it('accepts valid container names', async () => {
      mockExecSync.mockReturnValue('log line 1\nlog line 2')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=my-container-123')

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('accepts container names with dots', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=my.container.name')

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('accepts container names with underscores', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=my_container_name')

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('rejects container names starting with special characters', async () => {
      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=-invalid')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid container name')
    })

    it('rejects container names with shell injection attempts', async () => {
      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test;rm%20-rf%20/')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid container name')
    })

    it('rejects container names with backticks', async () => {
      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test`whoami`')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid container name')
    })

    it('rejects container names with $() command substitution', async () => {
      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test$(whoami)')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid container name')
    })

    it('rejects empty container names', async () => {
      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid container name')
    })

    it('rejects container names longer than 128 characters', async () => {
      const longName = 'a'.repeat(129)
      const { GET } = await import('@/app/api/logs/route')
      const request = new Request(`http://localhost/api/logs?container=${longName}`)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid container name')
    })
  })

  describe('since parameter validation', () => {
    it('accepts valid Unix timestamp', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test&since=1609459200')

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('accepts duration format with seconds', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test&since=30s')

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('accepts duration format with minutes', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test&since=10m')

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('accepts duration format with hours', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test&since=2h')

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('accepts duration format with days', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test&since=1d')

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('rejects invalid since format', async () => {
      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test&since=invalid')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid since parameter')
    })

    it('rejects since with shell injection', async () => {
      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test&since=10m;rm%20-rf')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid since parameter')
    })
  })

  describe('tail parameter', () => {
    it('uses default tail of 200', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test')

      await GET(request)

      // Check the command includes tail=200
      const call = mockExecSync.mock.calls[0]
      expect(call[0]).toContain('tail=200')
    })

    it('clamps tail to minimum of 1', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test&tail=-100')

      await GET(request)

      const call = mockExecSync.mock.calls[0]
      expect(call[0]).toContain('tail=1')
    })

    it('clamps tail to maximum of 10000', async () => {
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test&tail=99999')

      await GET(request)

      const call = mockExecSync.mock.calls[0]
      expect(call[0]).toContain('tail=10000')
    })
  })

  describe('action parameter', () => {
    it('returns logs by default', async () => {
      mockExecSync.mockReturnValue('log line 1\nlog line 2')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.logs).toBeDefined()
      expect(data.container).toBe('test')
    })

    it('returns 400 for invalid action', async () => {
      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?action=invalid')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })

    it('lists containers when action=list', async () => {
      const mockContainers = [
        { Id: 'abc123456789', Names: ['/container1'], State: 'running' },
        { Id: 'def987654321', Names: ['/container2'], State: 'stopped' },
      ]
      mockExecSync.mockReturnValue(JSON.stringify(mockContainers))

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?action=list')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.containers).toHaveLength(2)
      expect(data.containers[0].name).toBe('container1')
      expect(data.containers[0].id).toBe('abc123456789')
    })
  })

  describe('Docker socket fallback', () => {
    it('falls back to docker CLI when socket fails', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Socket not available')
      })
      mockSpawnSync.mockReturnValue({
        stdout: 'fallback log line',
        stderr: '',
      })

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockSpawnSync).toHaveBeenCalledWith(
        'docker',
        expect.arrayContaining(['logs', '--tail=200', '--timestamps', 'test']),
        expect.any(Object)
      )
    })

    it('returns error when both socket and CLI fail', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Socket not available')
      })
      mockSpawnSync.mockReturnValue({
        error: new Error('Docker not installed'),
        stdout: '',
        stderr: '',
      })

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs?container=test')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to fetch logs')
    })
  })

  describe('environment variables', () => {
    it('uses default container name from BACKEND_CONTAINER env', async () => {
      process.env.BACKEND_CONTAINER = 'custom-container'
      vi.resetModules()
      mockExecSync.mockReturnValue('log line')

      const { GET } = await import('@/app/api/logs/route')
      const request = new Request('http://localhost/api/logs')

      const response = await GET(request)
      const data = await response.json()

      expect(data.container).toBe('custom-container')
    })
  })
})
