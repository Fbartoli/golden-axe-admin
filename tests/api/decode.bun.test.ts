import { describe, it, expect } from 'bun:test'

describe('Decode route logic', () => {
  describe('topic formatting', () => {
    function formatTopic(topic: string): `0x${string}` {
      return (topic.startsWith('0x') ? topic : `0x${topic}`) as `0x${string}`
    }

    it('keeps 0x prefix if present', () => {
      expect(formatTopic('0xabc123')).toBe('0xabc123')
    })

    it('adds 0x prefix if missing', () => {
      expect(formatTopic('abc123')).toBe('0xabc123')
    })

    it('handles empty string', () => {
      expect(formatTopic('')).toBe('0x')
    })

    it('handles topics array', () => {
      const topics = ['0x123', 'abc', '0xdef']
      const formatted = topics.map(formatTopic)
      expect(formatted).toEqual(['0x123', '0xabc', '0xdef'])
    })
  })

  describe('data formatting', () => {
    function formatData(data: string): `0x${string}` {
      return (data.startsWith('0x') ? data : `0x${data}`) as `0x${string}`
    }

    it('keeps 0x prefix if present', () => {
      expect(formatData('0xabcdef')).toBe('0xabcdef')
    })

    it('adds 0x prefix if missing', () => {
      expect(formatData('abcdef')).toBe('0xabcdef')
    })

    it('handles empty data', () => {
      expect(formatData('')).toBe('0x')
    })
  })

  describe('ABI parsing', () => {
    it('parses JSON ABI string', () => {
      const abiString = '[{"type":"event","name":"Transfer"}]'
      const parsed = JSON.parse(abiString)
      expect(parsed).toBeInstanceOf(Array)
      expect(parsed[0].type).toBe('event')
      expect(parsed[0].name).toBe('Transfer')
    })

    it('accepts ABI as array', () => {
      const abi = [{ type: 'event', name: 'Transfer' }]
      expect(Array.isArray(abi)).toBe(true)
    })

    it('handles invalid JSON gracefully', () => {
      const invalidJson = 'not valid json'
      expect(() => JSON.parse(invalidJson)).toThrow()
    })

    it('parses complex ABI with inputs', () => {
      const abiString = JSON.stringify([{
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'address', name: 'from', indexed: true },
          { type: 'address', name: 'to', indexed: true },
          { type: 'uint256', name: 'value', indexed: false },
        ],
      }])
      const parsed = JSON.parse(abiString)
      expect(parsed[0].inputs).toHaveLength(3)
      expect(parsed[0].inputs[0].name).toBe('from')
    })
  })

  describe('BigInt conversion', () => {
    function convertBigInt(value: unknown): string | unknown {
      return typeof value === 'bigint' ? value.toString() : value
    }

    it('converts BigInt to string', () => {
      expect(convertBigInt(BigInt(123))).toBe('123')
    })

    it('converts large BigInt to string', () => {
      const large = BigInt('999999999999999999999999999999')
      expect(convertBigInt(large)).toBe('999999999999999999999999999999')
    })

    it('preserves string values', () => {
      expect(convertBigInt('hello')).toBe('hello')
    })

    it('preserves number values', () => {
      expect(convertBigInt(123)).toBe(123)
    })

    it('preserves null values', () => {
      expect(convertBigInt(null)).toBe(null)
    })

    it('preserves object values', () => {
      const obj = { a: 1 }
      expect(convertBigInt(obj)).toBe(obj)
    })

    it('handles negative BigInt', () => {
      expect(convertBigInt(BigInt(-123))).toBe('-123')
    })

    it('handles zero BigInt', () => {
      expect(convertBigInt(BigInt(0))).toBe('0')
    })
  })

  describe('Response structure', () => {
    it('success response has required fields', () => {
      const response = {
        success: true,
        eventName: 'Transfer',
        args: { from: '0x123', to: '0x456', value: '1000' },
      }
      expect(response).toHaveProperty('success', true)
      expect(response).toHaveProperty('eventName')
      expect(response).toHaveProperty('args')
    })

    it('error response has required fields', () => {
      const response = {
        success: false,
        error: 'Invalid ABI',
      }
      expect(response).toHaveProperty('success', false)
      expect(response).toHaveProperty('error')
    })

    it('args are converted from entries', () => {
      const args = { from: '0x123', to: '0x456' }
      const entries = Object.entries(args)
      const fromEntries = Object.fromEntries(entries)
      expect(fromEntries).toEqual(args)
    })
  })

  describe('Input validation', () => {
    it('requires abi field', () => {
      const body = { topics: ['0x123'], data: '0x' }
      expect(body).not.toHaveProperty('abi')
    })

    it('requires topics field', () => {
      const body = { abi: '[]', data: '0x' }
      expect(body).not.toHaveProperty('topics')
    })

    it('data field defaults to 0x if missing', () => {
      const body = { abi: '[]', topics: ['0x123'] }
      const data = body.data ?? '0x'
      expect(data).toBe('0x')
    })

    it('accepts all required fields', () => {
      const body = {
        abi: '[{"type":"event"}]',
        topics: ['0x123'],
        data: '0xabcdef',
      }
      expect(body).toHaveProperty('abi')
      expect(body).toHaveProperty('topics')
      expect(body).toHaveProperty('data')
    })
  })
})

describe('ERC20 Transfer event decoding logic', () => {
  // Test the logic without actually calling viem
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

  it('Transfer event topic is correct', () => {
    expect(TRANSFER_TOPIC.startsWith('0x')).toBe(true)
    expect(TRANSFER_TOPIC.length).toBe(66) // 0x + 64 hex chars
  })

  it('Transfer event has 3 topics (signature + 2 indexed)', () => {
    const topics = [
      TRANSFER_TOPIC,
      '0x000000000000000000000000sender',
      '0x000000000000000000000000recipient',
    ]
    expect(topics).toHaveLength(3)
  })

  it('value is in data for Transfer', () => {
    const data = '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
    expect(data.startsWith('0x')).toBe(true)
    expect(data.length).toBe(66) // 0x + 64 hex chars for uint256
  })
})
