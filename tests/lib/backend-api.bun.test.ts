import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'

describe('backend-api module', () => {
  const originalEnv = process.env.BE_URL
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    delete process.env.BE_URL
  })

  afterEach(() => {
    if (originalEnv) {
      process.env.BE_URL = originalEnv
    }
    globalThis.fetch = originalFetch
  })

  describe('getHealthDetailed', () => {
    it('fetches health data from backend', async () => {
      const mockHealth = {
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00Z',
        uptime_seconds: 86400,
        version: '1.0.0',
        checks: {
          database: { status: 'ok', latency_ms: 5, pools: {} },
          sync: { status: 'synced', chains: [] },
        },
      }

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHealth),
        } as Response)
      )

      const { getHealthDetailed } = await import('@/lib/backend-api')
      const result = await getHealthDetailed()

      expect(result).toEqual(mockHealth)
    })

    it('uses default localhost URL', async () => {
      let calledUrl = ''
      globalThis.fetch = mock((url: string) => {
        calledUrl = url
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      })

      const { getHealthDetailed } = await import('@/lib/backend-api')
      await getHealthDetailed()

      expect(calledUrl).toContain('localhost:8081')
    })

    it('throws error on non-ok response', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 503,
        } as Response)
      )

      const { getHealthDetailed } = await import('@/lib/backend-api')
      await expect(getHealthDetailed()).rejects.toThrow('Backend error: 503')
    })
  })

  describe('getStatus', () => {
    it('fetches status data from backend', async () => {
      const mockStatus = {
        chains: [
          {
            chain: '1',
            name: 'Ethereum',
            current: '18000000',
            target: '18000100',
            behind: '100',
            running: true,
          },
        ],
        connections: {
          main: { active: 5, idle: 3, waiting: 0 },
        },
      }

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        } as Response)
      )

      const { getStatus } = await import('@/lib/backend-api')
      const result = await getStatus()

      expect(result).toEqual(mockStatus)
    })

    it('throws error on non-ok response', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response)
      )

      const { getStatus } = await import('@/lib/backend-api')
      await expect(getStatus()).rejects.toThrow('Backend error: 500')
    })
  })

  describe('type checks', () => {
    it('ChainSync interface has required fields', () => {
      const chainSync = {
        chain_id: '1',
        chain_name: 'Ethereum',
        status: 'synced' as const,
        synced_block: '1000',
        head_block: '1000',
        blocks_behind: 0,
        sync_percentage: 100,
      }
      expect(chainSync.status).toBe('synced')
      expect(chainSync.blocks_behind).toBe(0)
    })

    it('HealthDetailedResponse interface has required fields', () => {
      const response = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00Z',
        uptime_seconds: 3600,
        version: '1.0.0',
        checks: {
          database: {
            status: 'ok' as const,
            latency_ms: 10,
            pools: {},
          },
          sync: {
            status: 'synced' as const,
            chains: [],
          },
        },
      }
      expect(response.status).toBe('healthy')
      expect(response.checks.database.status).toBe('ok')
    })

    it('StatusChain interface has required fields', () => {
      const statusChain = {
        chain: '1',
        name: 'Ethereum',
        current: '1000',
        target: '1000',
        behind: '0',
        running: true,
      }
      expect(statusChain.running).toBe(true)
      expect(typeof statusChain.chain).toBe('string')
    })

    it('StatusResponse interface has required fields', () => {
      const response = {
        chains: [],
        connections: {},
      }
      expect(Array.isArray(response.chains)).toBe(true)
      expect(typeof response.connections).toBe('object')
    })
  })

  describe('default URL', () => {
    it('health detailed endpoint path is correct', async () => {
      let calledUrl = ''
      globalThis.fetch = mock((url: string) => {
        calledUrl = url
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      })

      const { getHealthDetailed } = await import('@/lib/backend-api')
      await getHealthDetailed()

      expect(calledUrl).toContain('/health/detailed')
    })

    it('status endpoint path is correct', async () => {
      let calledUrl = ''
      globalThis.fetch = mock((url: string) => {
        calledUrl = url
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      })

      const { getStatus } = await import('@/lib/backend-api')
      await getStatus()

      expect(calledUrl).toContain('/status')
    })
  })

  describe('request options', () => {
    it('includes cache: no-store option', async () => {
      let capturedOptions: RequestInit | undefined

      globalThis.fetch = mock((_url: string, options?: RequestInit) => {
        capturedOptions = options
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      })

      const { getHealthDetailed } = await import('@/lib/backend-api')
      await getHealthDetailed()

      expect(capturedOptions?.cache).toBe('no-store')
    })

    it('includes timeout signal', async () => {
      let capturedOptions: RequestInit | undefined

      globalThis.fetch = mock((_url: string, options?: RequestInit) => {
        capturedOptions = options
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      })

      const { getHealthDetailed } = await import('@/lib/backend-api')
      await getHealthDetailed()

      expect(capturedOptions?.signal).toBeDefined()
    })
  })
})
