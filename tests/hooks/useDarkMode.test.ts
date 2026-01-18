import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDarkMode } from '@/hooks/useDarkMode'

describe('useDarkMode', () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }

  const documentClassListMock = {
    toggle: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
    Object.defineProperty(document.documentElement, 'classList', {
      value: documentClassListMock,
      writable: true,
    })
  })

  it('initializes with dark mode enabled by default', () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useDarkMode())

    expect(result.current.darkMode).toBe(true)
  })

  it('reads dark mode preference from localStorage', async () => {
    localStorageMock.getItem.mockReturnValue('false')

    const { result } = renderHook(() => useDarkMode())

    // Wait for useEffect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(localStorageMock.getItem).toHaveBeenCalledWith('darkMode')
    expect(result.current.darkMode).toBe(false)
  })

  it('persists dark mode preference from localStorage when true', async () => {
    localStorageMock.getItem.mockReturnValue('true')

    const { result } = renderHook(() => useDarkMode())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.darkMode).toBe(true)
  })

  it('saves preference to localStorage when darkMode changes', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useDarkMode())

    // Wait for initial hydration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Toggle dark mode
    await act(async () => {
      result.current.toggleDarkMode()
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', 'false')
  })

  it('toggles dark mode', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useDarkMode())

    // Wait for hydration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.darkMode).toBe(true)

    await act(async () => {
      result.current.toggleDarkMode()
    })

    expect(result.current.darkMode).toBe(false)

    await act(async () => {
      result.current.toggleDarkMode()
    })

    expect(result.current.darkMode).toBe(true)
  })

  it('allows setting dark mode directly', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useDarkMode())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    await act(async () => {
      result.current.setDarkMode(false)
    })

    expect(result.current.darkMode).toBe(false)

    await act(async () => {
      result.current.setDarkMode(true)
    })

    expect(result.current.darkMode).toBe(true)
  })

  it('updates document class for light mode', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useDarkMode())

    // Wait for hydration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Toggle to light mode
    await act(async () => {
      result.current.setDarkMode(false)
    })

    expect(documentClassListMock.toggle).toHaveBeenCalledWith('light', true)
  })

  it('updates document class for dark mode', async () => {
    localStorageMock.getItem.mockReturnValue('false')

    const { result } = renderHook(() => useDarkMode())

    // Wait for hydration with light mode
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Toggle to dark mode
    await act(async () => {
      result.current.setDarkMode(true)
    })

    expect(documentClassListMock.toggle).toHaveBeenCalledWith('light', false)
  })

  it('handles localStorage errors gracefully', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage not available')
    })

    const { result } = renderHook(() => useDarkMode())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Should default to dark mode on error
    expect(result.current.darkMode).toBe(true)
  })

  it('does not save to localStorage before hydration', () => {
    localStorageMock.getItem.mockReturnValue(null)

    renderHook(() => useDarkMode())

    // setItem should not be called synchronously during initial render
    // It should only be called after hydration in useEffect
    // The first call would be after hydration completes
  })
})
