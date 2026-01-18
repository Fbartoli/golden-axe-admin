import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useApi, useMutation } from '@/hooks/useApi'

describe('useApi', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = mockFetch
  })

  it('initializes with null data and no loading state', () => {
    const { result } = renderHook(() => useApi('/api/test'))

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches data successfully', async () => {
    const mockData = { items: [1, 2, 3] }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { result } = renderHook(() => useApi<typeof mockData>('/api/test'))

    await act(async () => {
      await result.current.fetch()
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockFetch).toHaveBeenCalledWith('/api/test')
  })

  it('sets loading state during fetch', async () => {
    let resolvePromise: (value: unknown) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })
    mockFetch.mockReturnValue(promise)

    const { result } = renderHook(() => useApi('/api/test'))

    act(() => {
      result.current.fetch()
    })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      })
    })

    expect(result.current.loading).toBe(false)
  })

  it('handles HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    })

    const { result } = renderHook(() => useApi('/api/test'))

    await act(async () => {
      await result.current.fetch()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('HTTP 404')
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useApi('/api/test'))

    await act(async () => {
      await result.current.fetch()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Network error')
  })

  it('calls onSuccess callback on successful fetch', async () => {
    const mockData = { success: true }
    const onSuccess = vi.fn()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { result } = renderHook(() =>
      useApi<typeof mockData>('/api/test', { onSuccess })
    )

    await act(async () => {
      await result.current.fetch()
    })

    expect(onSuccess).toHaveBeenCalledWith(mockData)
  })

  it('calls onError callback on failed fetch', async () => {
    const onError = vi.fn()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() =>
      useApi('/api/test', { onError })
    )

    await act(async () => {
      await result.current.fetch()
    })

    expect(onError).toHaveBeenCalledWith('HTTP 500')
  })

  it('allows manually setting data', () => {
    const { result } = renderHook(() => useApi<{ value: number }>('/api/test'))

    act(() => {
      result.current.setData({ value: 42 })
    })

    expect(result.current.data).toEqual({ value: 42 })
  })

  it('clears previous error on new fetch', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      })

    const { result } = renderHook(() => useApi('/api/test'))

    await act(async () => {
      await result.current.fetch()
    })
    expect(result.current.error).toBe('HTTP 500')

    await act(async () => {
      await result.current.fetch()
    })
    expect(result.current.error).toBeNull()
  })
})

describe('useMutation', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = mockFetch
  })

  it('initializes with no loading state and no error', () => {
    const { result } = renderHook(() => useMutation('/api/test'))

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('performs POST request by default', async () => {
    const mockResponse = { id: 1 }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const { result } = renderHook(() => useMutation<typeof mockResponse>('/api/test'))

    let response: typeof mockResponse | null = null
    await act(async () => {
      response = await result.current.mutate({ name: 'Test' })
    })

    expect(response).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })
  })

  it('performs DELETE request when specified', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ deleted: true }),
    })

    const { result } = renderHook(() =>
      useMutation('/api/test/1', 'DELETE')
    )

    await act(async () => {
      await result.current.mutate()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/test/1', {
      method: 'DELETE',
      headers: undefined,
      body: undefined,
    })
  })

  it('handles HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
    })

    const { result } = renderHook(() => useMutation('/api/test'))

    let response: unknown = 'initial'
    await act(async () => {
      response = await result.current.mutate({ data: 'test' })
    })

    expect(response).toBeNull()
    expect(result.current.error).toBe('HTTP 403')
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Connection failed'))

    const { result } = renderHook(() => useMutation('/api/test'))

    let response: unknown = 'initial'
    await act(async () => {
      response = await result.current.mutate({ data: 'test' })
    })

    expect(response).toBeNull()
    expect(result.current.error).toBe('Connection failed')
  })

  it('calls onSuccess callback on successful mutation', async () => {
    const mockResponse = { created: true }
    const onSuccess = vi.fn()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const { result } = renderHook(() =>
      useMutation<typeof mockResponse>('/api/test', 'POST', { onSuccess })
    )

    await act(async () => {
      await result.current.mutate({ data: 'test' })
    })

    expect(onSuccess).toHaveBeenCalledWith(mockResponse)
  })

  it('calls onError callback on failed mutation', async () => {
    const onError = vi.fn()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
    })

    const { result } = renderHook(() =>
      useMutation('/api/test', 'POST', { onError })
    )

    await act(async () => {
      await result.current.mutate({ data: 'test' })
    })

    expect(onError).toHaveBeenCalledWith('HTTP 422')
  })

  it('sets loading state during mutation', async () => {
    let resolvePromise: (value: unknown) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })
    mockFetch.mockReturnValue(promise)

    const { result } = renderHook(() => useMutation('/api/test'))

    act(() => {
      result.current.mutate({ data: 'test' })
    })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })

    expect(result.current.loading).toBe(false)
  })

  it('clears previous error on new mutation', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

    const { result } = renderHook(() => useMutation('/api/test'))

    await act(async () => {
      await result.current.mutate({ first: 'call' })
    })
    expect(result.current.error).toBe('HTTP 500')

    await act(async () => {
      await result.current.mutate({ second: 'call' })
    })
    expect(result.current.error).toBeNull()
  })
})
