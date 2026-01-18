import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock auth module
const mockValidatePassword = vi.fn()
const mockCreateSession = vi.fn()
const mockDestroySession = vi.fn()

vi.mock('@/lib/auth', () => ({
  validatePassword: (...args: unknown[]) => mockValidatePassword(...args),
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  destroySession: (...args: unknown[]) => mockDestroySession(...args),
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when password is missing', async () => {
    const { POST } = await import('@/app/api/auth/login/route')

    const request = {
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Password required')
  })

  it('returns 401 when password is invalid', async () => {
    mockValidatePassword.mockReturnValue(false)

    const { POST } = await import('@/app/api/auth/login/route')

    const request = {
      json: vi.fn().mockResolvedValue({ password: 'wrong-password' }),
    } as unknown as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid password')
    expect(mockValidatePassword).toHaveBeenCalledWith('wrong-password')
  })

  it('creates session and returns success for valid password', async () => {
    mockValidatePassword.mockReturnValue(true)
    mockCreateSession.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/auth/login/route')

    const request = {
      json: vi.fn().mockResolvedValue({ password: 'correct-password' }),
    } as unknown as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockCreateSession).toHaveBeenCalled()
  })

  it('returns 500 on unexpected error', async () => {
    const { POST } = await import('@/app/api/auth/login/route')

    const request = {
      json: vi.fn().mockRejectedValue(new Error('Parse error')),
    } as unknown as Request

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('An error occurred')
  })
})

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('destroys session and returns success', async () => {
    mockDestroySession.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/auth/logout/route')

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockDestroySession).toHaveBeenCalled()
  })
})
