import { z } from 'zod'

// Network validation
export const networkSchema = z.object({
  chain: z.coerce.number().int().positive(),
  name: z.string().min(1).max(100),
  url: z.string().url(),
  enabled: z.coerce.boolean().default(false),
  batch_size: z.coerce.number().int().positive().default(2000),
  concurrency: z.coerce.number().int().positive().max(100).default(10),
  start_block: z.coerce.number().int().nonnegative().nullable().default(null),
})

export const deleteNetworkSchema = z.object({
  chain: z.coerce.number().int().positive(),
})

// API Key validation
export const createKeySchema = z.object({
  owner_email: z.string().email(),
  origins: z.array(z.string().url()).optional().default([]),
})

export const deleteKeySchema = z.object({
  secret: z.string().min(1),
})

// Query validation
export const querySchema = z.object({
  query: z.string().min(1).max(10000),
  chain: z.coerce.number().int().positive(),
  event_signatures: z.string().optional(),
  api_key: z.string().optional(),
})

// Decode validation
export const decodeSchema = z.object({
  abi: z.string().min(1),
  topics: z.array(z.string()),
  data: z.string().optional().default('0x'),
})

// Alert actions
export const alertActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('acknowledge'), alertId: z.string() }),
  z.object({ action: z.literal('acknowledge_all') }),
  z.object({ action: z.literal('clear_acknowledged') }),
])

// Notification actions
export const notificationActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add_webhook'), name: z.string().min(1), url: z.string().url() }),
  z.object({ action: z.literal('toggle_webhook'), id: z.number(), enabled: z.boolean() }),
  z.object({ action: z.literal('delete_webhook'), id: z.number() }),
  z.object({ action: z.literal('add_email'), name: z.string().min(1), email: z.string().email() }),
  z.object({ action: z.literal('toggle_email'), id: z.number(), enabled: z.boolean() }),
  z.object({ action: z.literal('delete_email'), id: z.number() }),
  z.object({
    action: z.literal('add_rule'),
    name: z.string().min(1),
    type: z.string().min(1),
    chain: z.number().nullable().optional(),
    threshold: z.number(),
    comparison: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
    severity: z.enum(['info', 'warning', 'critical']),
  }),
  z.object({ action: z.literal('toggle_rule'), id: z.number(), enabled: z.boolean() }),
  z.object({ action: z.literal('delete_rule'), id: z.number() }),
])

// Helper to validate request body
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      return { success: false, error: `Validation failed: ${errors}` }
    }
    return { success: true, data: result.data }
  } catch (e) {
    return { success: false, error: 'Invalid JSON body' }
  }
}

// Helper to validate search params
export function validateParams<T>(
  params: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const obj = Object.fromEntries(params.entries())
  const result = schema.safeParse(obj)
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
    return { success: false, error: `Validation failed: ${errors}` }
  }
  return { success: true, data: result.data }
}
