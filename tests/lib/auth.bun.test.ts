import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'
import { createHmac, timingSafeEqual } from 'crypto'

describe('auth module', () => {
  const originalEnv = process.env.ADMIN_PASSWORD

  beforeEach(() => {
    process.env.ADMIN_PASSWORD = 'test-secret-password'
  })

  afterEach(() => {
    if (originalEnv) {
      process.env.ADMIN_PASSWORD = originalEnv
    } else {
      delete process.env.ADMIN_PASSWORD
    }
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

    it('handles password with different length (timing attack protection)', async () => {
      const { validatePassword } = await import('@/lib/auth')
      // Short password
      expect(validatePassword('a')).toBe(false)
      // Long password
      expect(validatePassword('a'.repeat(100))).toBe(false)
    })
  })

  describe('HMAC signing', () => {
    it('creates consistent signatures', () => {
      const secret = 'test-secret-password'
      const value = '1234567890'
      const signature1 = createHmac('sha256', secret).update(value).digest('hex')
      const signature2 = createHmac('sha256', secret).update(value).digest('hex')
      expect(signature1).toBe(signature2)
    })

    it('different values produce different signatures', () => {
      const secret = 'test-secret-password'
      const sig1 = createHmac('sha256', secret).update('value1').digest('hex')
      const sig2 = createHmac('sha256', secret).update('value2').digest('hex')
      expect(sig1).not.toBe(sig2)
    })

    it('signature is 64 characters (SHA-256 hex)', () => {
      const secret = 'test-secret-password'
      const signature = createHmac('sha256', secret).update('test').digest('hex')
      expect(signature.length).toBe(64)
    })
  })

  describe('timingSafeEqual', () => {
    it('returns true for equal buffers', () => {
      const buf1 = Buffer.from('hello')
      const buf2 = Buffer.from('hello')
      expect(timingSafeEqual(buf1, buf2)).toBe(true)
    })

    it('returns false for different buffers of same length', () => {
      const buf1 = Buffer.from('hello')
      const buf2 = Buffer.from('world')
      expect(timingSafeEqual(buf1, buf2)).toBe(false)
    })

    it('throws for buffers of different lengths', () => {
      const buf1 = Buffer.from('hello')
      const buf2 = Buffer.from('hi')
      expect(() => timingSafeEqual(buf1, buf2)).toThrow()
    })
  })

  describe('session expiry calculation', () => {
    it('correctly identifies non-expired session', () => {
      const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds
      const created = Date.now()
      const now = Date.now()
      const isExpired = now - created > SESSION_MAX_AGE * 1000
      expect(isExpired).toBe(false)
    })

    it('correctly identifies expired session', () => {
      const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds
      const created = Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days ago
      const now = Date.now()
      const isExpired = now - created > SESSION_MAX_AGE * 1000
      expect(isExpired).toBe(true)
    })

    it('session at exactly 7 days is not expired', () => {
      const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds
      const created = Date.now() - (7 * 24 * 60 * 60 * 1000) // Exactly 7 days ago
      const now = Date.now()
      const isExpired = now - created > SESSION_MAX_AGE * 1000
      // At exactly 7 days, it should not be expired (> not >=)
      expect(isExpired).toBe(false)
    })

    it('session at 7 days + 1 second is expired', () => {
      const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds
      const created = Date.now() - (7 * 24 * 60 * 60 * 1000 + 1000) // 7 days + 1 second ago
      const now = Date.now()
      const isExpired = now - created > SESSION_MAX_AGE * 1000
      expect(isExpired).toBe(true)
    })
  })

  describe('signed cookie format', () => {
    it('creates value.signature format', () => {
      const timestamp = Date.now().toString()
      const secret = 'test-secret-password'
      const signature = createHmac('sha256', secret).update(timestamp).digest('hex')
      const signed = `${timestamp}.${signature}`

      expect(signed).toMatch(/^\d+\.[a-f0-9]{64}$/)
    })

    it('can be split back into parts', () => {
      const timestamp = '1234567890'
      const secret = 'test-secret-password'
      const signature = createHmac('sha256', secret).update(timestamp).digest('hex')
      const signed = `${timestamp}.${signature}`

      const [value, sig] = signed.split('.')
      expect(value).toBe(timestamp)
      expect(sig).toBe(signature)
    })

    it('rejects tampered signatures', () => {
      const timestamp = '1234567890'
      const secret = 'test-secret-password'
      const signature = createHmac('sha256', secret).update(timestamp).digest('hex')
      const tamperedSig = signature.replace('a', 'b') // tamper with one character

      const expected = createHmac('sha256', secret).update(timestamp).digest('hex')
      expect(tamperedSig).not.toBe(expected)
    })
  })
})
