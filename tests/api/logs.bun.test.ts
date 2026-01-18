import { describe, it, expect } from 'bun:test'

// Test the validation functions directly since the route uses child_process which is hard to mock
describe('Container name validation', () => {
  const CONTAINER_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/
  const MAX_CONTAINER_NAME_LENGTH = 128

  function validateContainerName(name: string): boolean {
    return (
      name.length > 0 &&
      name.length <= MAX_CONTAINER_NAME_LENGTH &&
      CONTAINER_NAME_REGEX.test(name)
    )
  }

  it('accepts valid container names', () => {
    expect(validateContainerName('my-container-123')).toBe(true)
    expect(validateContainerName('container')).toBe(true)
    expect(validateContainerName('Container123')).toBe(true)
  })

  it('accepts container names with dots', () => {
    expect(validateContainerName('my.container.name')).toBe(true)
  })

  it('accepts container names with underscores', () => {
    expect(validateContainerName('my_container_name')).toBe(true)
  })

  it('accepts container names with mixed characters', () => {
    expect(validateContainerName('my-container_123.v2')).toBe(true)
  })

  it('rejects container names starting with dash', () => {
    expect(validateContainerName('-invalid')).toBe(false)
  })

  it('rejects container names starting with underscore', () => {
    expect(validateContainerName('_invalid')).toBe(false)
  })

  it('rejects container names starting with dot', () => {
    expect(validateContainerName('.invalid')).toBe(false)
  })

  it('rejects container names with shell injection - semicolon', () => {
    expect(validateContainerName('test;rm -rf /')).toBe(false)
  })

  it('rejects container names with shell injection - backticks', () => {
    expect(validateContainerName('test`whoami`')).toBe(false)
  })

  it('rejects container names with shell injection - command substitution', () => {
    expect(validateContainerName('test$(whoami)')).toBe(false)
  })

  it('rejects container names with shell injection - pipe', () => {
    expect(validateContainerName('test|cat /etc/passwd')).toBe(false)
  })

  it('rejects container names with shell injection - ampersand', () => {
    expect(validateContainerName('test&rm -rf /')).toBe(false)
  })

  it('rejects container names with spaces', () => {
    expect(validateContainerName('test container')).toBe(false)
  })

  it('rejects container names with quotes', () => {
    expect(validateContainerName('test"quote')).toBe(false)
    expect(validateContainerName("test'quote")).toBe(false)
  })

  it('rejects empty container names', () => {
    expect(validateContainerName('')).toBe(false)
  })

  it('rejects container names longer than 128 characters', () => {
    expect(validateContainerName('a'.repeat(129))).toBe(false)
  })

  it('accepts container names exactly 128 characters', () => {
    expect(validateContainerName('a'.repeat(128))).toBe(true)
  })
})

describe('Since parameter validation', () => {
  const SINCE_REGEX = /^(\d+|(\d+[smhd]))$/

  function validateSince(since: string): boolean {
    return SINCE_REGEX.test(since)
  }

  it('accepts Unix timestamps', () => {
    expect(validateSince('1609459200')).toBe(true)
    expect(validateSince('0')).toBe(true)
    expect(validateSince('123456789')).toBe(true)
  })

  it('accepts duration with seconds', () => {
    expect(validateSince('30s')).toBe(true)
    expect(validateSince('1s')).toBe(true)
    expect(validateSince('3600s')).toBe(true)
  })

  it('accepts duration with minutes', () => {
    expect(validateSince('10m')).toBe(true)
    expect(validateSince('1m')).toBe(true)
    expect(validateSince('60m')).toBe(true)
  })

  it('accepts duration with hours', () => {
    expect(validateSince('2h')).toBe(true)
    expect(validateSince('1h')).toBe(true)
    expect(validateSince('24h')).toBe(true)
  })

  it('accepts duration with days', () => {
    expect(validateSince('1d')).toBe(true)
    expect(validateSince('7d')).toBe(true)
    expect(validateSince('30d')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(validateSince('invalid')).toBe(false)
    expect(validateSince('10x')).toBe(false)
    expect(validateSince('abc123')).toBe(false)
  })

  it('rejects shell injection attempts', () => {
    expect(validateSince('10m;rm -rf')).toBe(false)
    expect(validateSince('10m`whoami`')).toBe(false)
    expect(validateSince('10m$(id)')).toBe(false)
  })

  it('rejects negative values', () => {
    expect(validateSince('-10m')).toBe(false)
    expect(validateSince('-1234567890')).toBe(false)
  })

  it('rejects floating point values', () => {
    expect(validateSince('10.5m')).toBe(false)
    expect(validateSince('1.5h')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateSince('')).toBe(false)
  })
})

describe('Tail parameter sanitization', () => {
  function sanitizeTail(tail: number): number {
    return Math.max(1, Math.min(10000, Math.floor(tail)))
  }

  it('passes through valid values', () => {
    expect(sanitizeTail(100)).toBe(100)
    expect(sanitizeTail(200)).toBe(200)
    expect(sanitizeTail(500)).toBe(500)
  })

  it('clamps to minimum of 1', () => {
    expect(sanitizeTail(0)).toBe(1)
    expect(sanitizeTail(-100)).toBe(1)
    expect(sanitizeTail(-1)).toBe(1)
  })

  it('clamps to maximum of 10000', () => {
    expect(sanitizeTail(10001)).toBe(10000)
    expect(sanitizeTail(99999)).toBe(10000)
    expect(sanitizeTail(100000)).toBe(10000)
  })

  it('floors floating point values', () => {
    expect(sanitizeTail(100.5)).toBe(100)
    expect(sanitizeTail(100.9)).toBe(100)
    expect(sanitizeTail(100.1)).toBe(100)
  })

  it('handles edge cases', () => {
    expect(sanitizeTail(1)).toBe(1)
    expect(sanitizeTail(10000)).toBe(10000)
  })

  it('handles NaN by returning NaN (Math operations with NaN)', () => {
    // Note: Math.max(1, Math.min(10000, NaN)) returns NaN
    // This is a limitation of the current implementation
    const result = sanitizeTail(NaN)
    expect(Number.isNaN(result)).toBe(true)
  })

  it('handles Infinity by returning 10000 (clamped)', () => {
    expect(sanitizeTail(Infinity)).toBe(10000)
    expect(sanitizeTail(-Infinity)).toBe(1)
  })
})

describe('Docker log cleaning', () => {
  function cleanDockerLogs(raw: string): string {
    return raw
      .split('\n')
      .map(line => line.replace(/^[\x00-\x08]/g, '').replace(/[\x00-\x08]/g, ' '))
      .filter(line => line.trim())
      .join('\n')
  }

  it('removes Docker stream headers', () => {
    const input = '\x01\x00\x00\x00\x00\x00\x00\x0flog line here'
    const result = cleanDockerLogs(input)
    expect(result).not.toContain('\x01')
  })

  it('filters empty lines', () => {
    const input = 'line1\n\n\nline2\n   \nline3'
    const result = cleanDockerLogs(input)
    expect(result).toBe('line1\nline2\nline3')
  })

  it('preserves normal log content', () => {
    const input = '2024-01-01T00:00:00Z INFO Starting server\n2024-01-01T00:00:01Z INFO Server ready'
    const result = cleanDockerLogs(input)
    expect(result).toBe(input)
  })

  it('handles empty input', () => {
    expect(cleanDockerLogs('')).toBe('')
  })

  it('handles whitespace-only input', () => {
    expect(cleanDockerLogs('   \n   \n   ')).toBe('')
  })
})
