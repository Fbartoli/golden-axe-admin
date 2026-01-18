import { mock } from 'bun:test'

// Mock next/headers for server-side tests
mock.module('next/headers', () => ({
  cookies: () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}))

// Mock localStorage for client-side tests
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })
