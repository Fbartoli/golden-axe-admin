import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Ensure notification tables exist
async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS notification_webhooks (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      events TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      last_triggered_at TIMESTAMPTZ,
      last_error TEXT
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS notification_emails (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      events TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      last_sent_at TIMESTAMPTZ
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      chain INT,
      threshold INT NOT NULL,
      comparison TEXT NOT NULL DEFAULT 'gt',
      severity TEXT NOT NULL DEFAULT 'warning',
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      last_triggered_at TIMESTAMPTZ
    )
  `
}

export async function GET() {
  try {
    await ensureTables()

    const webhooks = await sql`
      SELECT id, name, url, enabled, events, created_at, last_triggered_at, last_error
      FROM notification_webhooks
      ORDER BY created_at DESC
    `

    const emails = await sql`
      SELECT id, name, email, enabled, events, created_at, last_sent_at
      FROM notification_emails
      ORDER BY created_at DESC
    `

    const rules = await sql`
      SELECT id, name, type, chain, threshold, comparison, severity, enabled, created_at, last_triggered_at
      FROM alert_rules
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      webhooks,
      emails,
      rules,
      eventTypes: [
        { value: 'sync_behind', label: 'Sync Behind' },
        { value: 'rpc_error', label: 'RPC Error' },
        { value: 'high_memory', label: 'High Memory' },
        { value: 'high_disk', label: 'High Disk' },
        { value: 'sync_stalled', label: 'Sync Stalled' },
        { value: 'high_cpu', label: 'High CPU' },
      ],
      ruleTypes: [
        { value: 'sync_behind', label: 'Blocks Behind', unit: 'blocks' },
        { value: 'cpu_usage', label: 'CPU Usage', unit: '%' },
        { value: 'memory_usage', label: 'Memory Usage', unit: '%' },
        { value: 'disk_usage', label: 'Disk Usage', unit: '%' },
        { value: 'rpc_latency', label: 'RPC Latency', unit: 'ms' },
      ],
    })
  } catch (e: any) {
    console.error('Error fetching notifications:', e)
    return NextResponse.json({ webhooks: [], emails: [], rules: [], error: e.message })
  }
}

export async function POST(req: Request) {
  try {
    await ensureTables()
    const body = await req.json()
    const { action } = body

    if (action === 'add_webhook') {
      const { name, url, events } = body
      await sql`
        INSERT INTO notification_webhooks (name, url, events)
        VALUES (${name}, ${url}, ${events || []})
      `
      return NextResponse.json({ success: true })
    }

    if (action === 'add_email') {
      const { name, email, events } = body
      await sql`
        INSERT INTO notification_emails (name, email, events)
        VALUES (${name}, ${email}, ${events || []})
      `
      return NextResponse.json({ success: true })
    }

    if (action === 'add_rule') {
      const { name, type, chain, threshold, comparison, severity } = body
      await sql`
        INSERT INTO alert_rules (name, type, chain, threshold, comparison, severity)
        VALUES (${name}, ${type}, ${chain || null}, ${threshold}, ${comparison || 'gt'}, ${severity || 'warning'})
      `
      return NextResponse.json({ success: true })
    }

    if (action === 'toggle_webhook') {
      const { id, enabled } = body
      await sql`
        UPDATE notification_webhooks SET enabled = ${enabled} WHERE id = ${id}
      `
      return NextResponse.json({ success: true })
    }

    if (action === 'toggle_email') {
      const { id, enabled } = body
      await sql`
        UPDATE notification_emails SET enabled = ${enabled} WHERE id = ${id}
      `
      return NextResponse.json({ success: true })
    }

    if (action === 'toggle_rule') {
      const { id, enabled } = body
      await sql`
        UPDATE alert_rules SET enabled = ${enabled} WHERE id = ${id}
      `
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_webhook') {
      const { id } = body
      await sql`DELETE FROM notification_webhooks WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_email') {
      const { id } = body
      await sql`DELETE FROM notification_emails WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_rule') {
      const { id } = body
      await sql`DELETE FROM alert_rules WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    if (action === 'test_webhook') {
      const { url } = body
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'test',
            message: 'Test notification from Golden Axe Admin',
            timestamp: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(10000),
        })
        return NextResponse.json({ success: response.ok, status: response.status })
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('Error in notifications POST:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
