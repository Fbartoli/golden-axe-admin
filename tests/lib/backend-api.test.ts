import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('backend-api module', () => {
  const originalEnv = process.env
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    globalThis.fetch = mockFetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
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

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHealth),
      })

      const { getHealthDetailed } = await import('@/lib/backend-api')
      const result = await getHealthDetailed()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8081/health/detailed',
        expect.objectContaining({
          cache: 'no-store',
        })
      )
      expect(result).toEqual(mockHealth)
    })

    it('uses custom BE_URL from environment', async () => {
      process.env.BE_URL = 'https://custom-backend.example.com'
      vi.resetModules()

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { getHealthDetailed } = await import('@/lib/backend-api')
      await getHealthDetailed()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-backend.example.com/health/detailed',
        expect.any(Object)
      )
    })

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      })

      const { getHealthDetailed } = await import('@/lib/backend-api')
      await expect(getHealthDetailed()).rejects.toThrow('Backend error: 503')
    })

    it('includes timeout signal', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { getHealthDetailed } = await import('@/lib/backend-api')
      await getHealthDetailed()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      )
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

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      })

      const { getStatus } = await import('@/lib/backend-api')
      const result = await getStatus()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8081/status',
        expect.objectContaining({
          cache: 'no-store',
        })
      )
      expect(result).toEqual(mockStatus)
    })

    it('uses custom BE_URL from environment', async () => {
      process.env.BE_URL = 'https://api.example.com'
      vi.resetModules()

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ chains: [], connections: {} }),
      })

      const { getStatus } = await import('@/lib/backend-api')
      await getStatus()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/status',
        expect.any(Object)
      )
    })

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { getStatus } = await import('@/lib/backend-api')
      await expect(getStatus()).rejects.toThrow('Backend error: 500')
    })
  })

  describe('type exports', () => {
    it('exports ChainSync interface', async () => {
      const { getHealthDetailed } = await import('@/lib/backend-api')
      // Type check - this should compile without errors
      const mockChainSync = {
        chain_id: '1',
        chain_name: 'Ethereum',
        status: 'synced' as const,
        synced_block: '1000',
        head_block: '1000',
        blocks_behind: 0,
        sync_percentage: 100,
      }
      expect(mockChainSync.status).toBe('synced')
    })

    it('exports HealthDetailedResponse interface', async () => {
      const mockResponse = {
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
      expect(mockResponse.status).toBe('healthy')
    })

    it('exports StatusChain interface', async () => {
      const mockStatusChain = {
        chain: '1',
        name: 'Ethereum',
        current: '1000',
        target: '1000',
        behind: '0',
        running: true,
      }
      expect(mockStatusChain.running).toBe(true)
    })

    it('exports StatusResponse interface', async () => {
      const mockStatusResponse = {
        chains: [],
        connections: {},
      }
      expect(Array.isArray(mockStatusResponse.chains)).toBe(true)
    })
  })
})
