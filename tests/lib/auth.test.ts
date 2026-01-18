import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cookies } from 'next/headers'

// We need to mock environment and modules before importing the module under test
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

describe('auth module', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv, ADMIN_PASSWORD: 'test-secret-password' }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('validatePassword', () => {
    it('returns true for correct password', async () => {
      const { validatePassword } = await import('@/lib/auth')
      const result = validatePassword('test-secret-password')
      expect(result).toBe(true)
    })

    it('returns false for incorrect password', async () => {
      const { validatePassword } = await import('@/lib/auth')
      const result = validatePassword('wrong-password')
      expect(result).toBe(false)
    })

    it('returns false for empty password', async () => {
      const { validatePassword } = await import('@/lib/auth')
      const result = validatePassword('')
      expect(result).toBe(false)
    })

    it('returns false when ADMIN_PASSWORD is not set', async () => {
      delete process.env.ADMIN_PASSWORD
      vi.resetModules()
      const { validatePassword } = await import('@/lib/auth')
      const result = validatePassword('any-password')
      expect(result).toBe(false)
    })

    it('handles password with different length (timing attack protection)', async () => {
      const { validatePassword } = await import('@/lib/auth')
      // Short password
      expect(validatePassword('a')).toBe(false)
      // Long password
      expect(validatePassword('a'.repeat(100))).toBe(false)
    })
  })

  describe('createSession', () => {
    it('creates a signed session cookie', async () => {
      const { createSession } = await import('@/lib/auth')
      await createSession()

      expect(mockCookieStore.set).toHaveBeenCalledTimes(1)
      const [cookieName, cookieValue, options] = mockCookieStore.set.mock.calls[0]

      expect(cookieName).toBe('admin_session')
      expect(cookieValue).toMatch(/^\d+\.[a-f0-9]{64}$/) // timestamp.hmac
      expect(options.httpOnly).toBe(true)
      expect(options.sameSite).toBe('lax')
      expect(options.path).toBe('/')
    })

    it('throws error if ADMIN_PASSWORD is not set', async () => {
      delete process.env.ADMIN_PASSWORD
      vi.resetModules()
      const { createSession } = await import('@/lib/auth')

      await expect(createSession()).rejects.toThrow('ADMIN_PASSWORD environment variable is required')
    })
  })

  describe('destroySession', () => {
    it('deletes the session cookie', async () => {
      const { destroySession } = await import('@/lib/auth')
      await destroySession()

      expect(mockCookieStore.delete).toHaveBeenCalledWith('admin_session')
    })
  })

  describe('isAuthenticated', () => {
    it('returns false when no session cookie exists', async () => {
      mockCookieStore.get.mockReturnValue(undefined)
      const { isAuthenticated } = await import('@/lib/auth')

      const result = await isAuthenticated()
      expect(result).toBe(false)
    })

    it('returns false for invalid signature', async () => {
      mockCookieStore.get.mockReturnValue({ value: '123456.invalidsignature' })
      const { isAuthenticated } = await import('@/lib/auth')

      const result = await isAuthenticated()
      expect(result).toBe(false)
    })

    it('returns false for malformed cookie value', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'no-dot-separator' })
      const { isAuthenticated } = await import('@/lib/auth')

      const result = await isAuthenticated()
      expect(result).toBe(false)
    })

    it('returns false for empty cookie value', async () => {
      mockCookieStore.get.mockReturnValue({ value: '' })
      const { isAuthenticated } = await import('@/lib/auth')

      const result = await isAuthenticated()
      expect(result).toBe(false)
    })

    it('returns true for valid session within expiry', async () => {
      // First create a valid session to get the signature format
      const { createSession, isAuthenticated } = await import('@/lib/auth')
      await createSession()

      // Get the signed value that was set
      const signedValue = mockCookieStore.set.mock.calls[0][1]
      mockCookieStore.get.mockReturnValue({ value: signedValue })

      const result = await isAuthenticated()
      expect(result).toBe(true)
    })

    it('returns false for expired session', async () => {
      // Create a session with old timestamp
      const { createHmac } = await import('crypto')
      const oldTimestamp = (Date.now() - 8 * 24 * 60 * 60 * 1000).toString() // 8 days ago
      const signature = createHmac('sha256', 'test-secret-password')
        .update(oldTimestamp)
        .digest('hex')

      mockCookieStore.get.mockReturnValue({ value: `${oldTimestamp}.${signature}` })
      const { isAuthenticated } = await import('@/lib/auth')

      const result = await isAuthenticated()
      expect(result).toBe(false)
    })
  })
})
