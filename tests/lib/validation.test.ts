import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  networkSchema,
  deleteNetworkSchema,
  createKeySchema,
  deleteKeySchema,
  querySchema,
  decodeSchema,
  alertActionSchema,
  notificationActionSchema,
  validateBody,
  validateParams,
} from '@/lib/validation'

describe('networkSchema', () => {
  it('validates a valid network configuration', () => {
    const result = networkSchema.safeParse({
      chain: 1,
      name: 'Ethereum',
      url: 'https://eth-mainnet.example.com',
      enabled: true,
      batch_size: 2000,
      concurrency: 10,
      start_block: 0,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.chain).toBe(1)
      expect(result.data.name).toBe('Ethereum')
    }
  })

  it('coerces string numbers to integers', () => {
    const result = networkSchema.safeParse({
      chain: '1',
      name: 'Ethereum',
      url: 'https://eth-mainnet.example.com',
      batch_size: '2000',
      concurrency: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.chain).toBe(1)
      expect(result.data.batch_size).toBe(2000)
    }
  })

  it('applies defaults for optional fields', () => {
    const result = networkSchema.safeParse({
      chain: 1,
      name: 'Ethereum',
      url: 'https://eth-mainnet.example.com',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.enabled).toBe(false)
      expect(result.data.batch_size).toBe(2000)
      expect(result.data.concurrency).toBe(10)
      expect(result.data.start_block).toBe(null)
    }
  })

  it('rejects invalid URL', () => {
    const result = networkSchema.safeParse({
      chain: 1,
      name: 'Ethereum',
      url: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative chain ID', () => {
    const result = networkSchema.safeParse({
      chain: -1,
      name: 'Test',
      url: 'https://example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero chain ID', () => {
    const result = networkSchema.safeParse({
      chain: 0,
      name: 'Test',
      url: 'https://example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = networkSchema.safeParse({
      chain: 1,
      name: '',
      url: 'https://example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 characters', () => {
    const result = networkSchema.safeParse({
      chain: 1,
      name: 'a'.repeat(101),
      url: 'https://example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects concurrency above 100', () => {
    const result = networkSchema.safeParse({
      chain: 1,
      name: 'Test',
      url: 'https://example.com',
      concurrency: 101,
    })
    expect(result.success).toBe(false)
  })

  it('accepts nullable start_block', () => {
    const result = networkSchema.safeParse({
      chain: 1,
      name: 'Test',
      url: 'https://example.com',
      start_block: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.start_block).toBe(null)
    }
  })
})

describe('deleteNetworkSchema', () => {
  it('validates a valid chain ID', () => {
    const result = deleteNetworkSchema.safeParse({ chain: 1 })
    expect(result.success).toBe(true)
  })

  it('coerces string to number', () => {
    const result = deleteNetworkSchema.safeParse({ chain: '42' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.chain).toBe(42)
    }
  })

  it('rejects negative chain ID', () => {
    const result = deleteNetworkSchema.safeParse({ chain: -1 })
    expect(result.success).toBe(false)
  })
})

describe('createKeySchema', () => {
  it('validates a valid key creation request', () => {
    const result = createKeySchema.safeParse({
      owner_email: 'test@example.com',
      origins: ['https://app.example.com'],
    })
    expect(result.success).toBe(true)
  })

  it('applies default empty origins array', () => {
    const result = createKeySchema.safeParse({
      owner_email: 'test@example.com',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.origins).toEqual([])
    }
  })

  it('rejects invalid email', () => {
    const result = createKeySchema.safeParse({
      owner_email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid origin URLs', () => {
    const result = createKeySchema.safeParse({
      owner_email: 'test@example.com',
      origins: ['not-a-url'],
    })
    expect(result.success).toBe(false)
  })
})

describe('deleteKeySchema', () => {
  it('validates a valid secret', () => {
    const result = deleteKeySchema.safeParse({ secret: 'abc123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty secret', () => {
    const result = deleteKeySchema.safeParse({ secret: '' })
    expect(result.success).toBe(false)
  })
})

describe('querySchema', () => {
  it('validates a valid query', () => {
    const result = querySchema.safeParse({
      query: 'SELECT * FROM logs',
      chain: 1,
    })
    expect(result.success).toBe(true)
  })

  it('includes optional fields when provided', () => {
    const result = querySchema.safeParse({
      query: 'SELECT * FROM logs',
      chain: 1,
      event_signatures: '0x123',
      api_key: 'key123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.event_signatures).toBe('0x123')
      expect(result.data.api_key).toBe('key123')
    }
  })

  it('rejects empty query', () => {
    const result = querySchema.safeParse({
      query: '',
      chain: 1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects query longer than 10000 characters', () => {
    const result = querySchema.safeParse({
      query: 'a'.repeat(10001),
      chain: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('decodeSchema', () => {
  it('validates a valid decode request', () => {
    const result = decodeSchema.safeParse({
      abi: '[{"type":"event","name":"Transfer"}]',
      topics: ['0x123', '0x456'],
      data: '0xabcdef',
    })
    expect(result.success).toBe(true)
  })

  it('applies default data value', () => {
    const result = decodeSchema.safeParse({
      abi: '[{"type":"event"}]',
      topics: ['0x123'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBe('0x')
    }
  })

  it('rejects empty ABI', () => {
    const result = decodeSchema.safeParse({
      abi: '',
      topics: ['0x123'],
    })
    expect(result.success).toBe(false)
  })
})

describe('alertActionSchema', () => {
  it('validates acknowledge action', () => {
    const result = alertActionSchema.safeParse({
      action: 'acknowledge',
      alertId: 'alert-123',
    })
    expect(result.success).toBe(true)
  })

  it('validates acknowledge_all action', () => {
    const result = alertActionSchema.safeParse({
      action: 'acknowledge_all',
    })
    expect(result.success).toBe(true)
  })

  it('validates clear_acknowledged action', () => {
    const result = alertActionSchema.safeParse({
      action: 'clear_acknowledged',
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown action', () => {
    const result = alertActionSchema.safeParse({
      action: 'unknown_action',
    })
    expect(result.success).toBe(false)
  })
})

describe('notificationActionSchema', () => {
  it('validates add_webhook action', () => {
    const result = notificationActionSchema.safeParse({
      action: 'add_webhook',
      name: 'My Webhook',
      url: 'https://example.com/webhook',
    })
    expect(result.success).toBe(true)
  })

  it('validates toggle_webhook action', () => {
    const result = notificationActionSchema.safeParse({
      action: 'toggle_webhook',
      id: 1,
      enabled: true,
    })
    expect(result.success).toBe(true)
  })

  it('validates delete_webhook action', () => {
    const result = notificationActionSchema.safeParse({
      action: 'delete_webhook',
      id: 1,
    })
    expect(result.success).toBe(true)
  })

  it('validates add_email action', () => {
    const result = notificationActionSchema.safeParse({
      action: 'add_email',
      name: 'Admin',
      email: 'admin@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('validates add_rule action', () => {
    const result = notificationActionSchema.safeParse({
      action: 'add_rule',
      name: 'High blocks behind',
      type: 'sync_behind',
      chain: 1,
      threshold: 1000,
      comparison: 'gt',
      severity: 'warning',
    })
    expect(result.success).toBe(true)
  })

  it('validates add_rule with null chain', () => {
    const result = notificationActionSchema.safeParse({
      action: 'add_rule',
      name: 'Global rule',
      type: 'db_connections',
      chain: null,
      threshold: 80,
      comparison: 'gte',
      severity: 'critical',
    })
    expect(result.success).toBe(true)
  })

  it('rejects add_webhook with invalid URL', () => {
    const result = notificationActionSchema.safeParse({
      action: 'add_webhook',
      name: 'Invalid',
      url: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('rejects add_email with invalid email', () => {
    const result = notificationActionSchema.safeParse({
      action: 'add_email',
      name: 'Invalid',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects add_rule with invalid comparison', () => {
    const result = notificationActionSchema.safeParse({
      action: 'add_rule',
      name: 'Invalid',
      type: 'test',
      threshold: 100,
      comparison: 'invalid',
      severity: 'info',
    })
    expect(result.success).toBe(false)
  })

  it('rejects add_rule with invalid severity', () => {
    const result = notificationActionSchema.safeParse({
      action: 'add_rule',
      name: 'Invalid',
      type: 'test',
      threshold: 100,
      comparison: 'gt',
      severity: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('validateBody', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates and returns data on success', async () => {
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ chain: 1 }),
    } as unknown as Request

    const result = await validateBody(mockRequest, deleteNetworkSchema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.chain).toBe(1)
    }
  })

  it('returns error on validation failure', async () => {
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ chain: -1 }),
    } as unknown as Request

    const result = await validateBody(mockRequest, deleteNetworkSchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Validation failed')
    }
  })

  it('returns error on invalid JSON', async () => {
    const mockRequest = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    } as unknown as Request

    const result = await validateBody(mockRequest, deleteNetworkSchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Invalid JSON body')
    }
  })
})

describe('validateParams', () => {
  it('validates and returns data on success', () => {
    const params = new URLSearchParams({ chain: '1' })
    const result = validateParams(params, deleteNetworkSchema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.chain).toBe(1)
    }
  })

  it('returns error on validation failure', () => {
    const params = new URLSearchParams({ chain: '-1' })
    const result = validateParams(params, deleteNetworkSchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Validation failed')
    }
  })
})
