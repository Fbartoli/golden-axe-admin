import { useState, useCallback } from 'react'

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
}

interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  setData: (data: T | null) => void
}

export function useApi<T>(
  url: string,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
      options.onSuccess?.(json)
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to fetch'
      setError(errorMsg)
      options.onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [url, options.onSuccess, options.onError])

  return { data, loading, error, fetch: fetchData, setData }
}

// Hook for POST/DELETE requests
interface UseMutationOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
}

export function useMutation<T, B = any>(
  url: string,
  method: 'POST' | 'DELETE' = 'POST',
  options: UseMutationOptions<T> = {}
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (body?: B): Promise<T | null> => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = await res.json()
        options.onSuccess?.(json)
        return json
      } catch (e: any) {
        const errorMsg = e.message || 'Request failed'
        setError(errorMsg)
        options.onError?.(errorMsg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [url, method, options.onSuccess, options.onError]
  )

  return { mutate, loading, error }
}
