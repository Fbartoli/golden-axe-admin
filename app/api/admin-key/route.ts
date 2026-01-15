import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Get existing admin/whitelisted keys
export async function GET() {
  try {
    const keys = await sql`
      SELECT org, name, secret, origins, created_at, deleted_at
      FROM wl_api_keys
      WHERE provision_key = 'admin-panel'
      ORDER BY created_at DESC
    `
    return NextResponse.json(keys)
  } catch (e: any) {
    console.error('Error fetching admin keys:', e)
    return NextResponse.json([])
  }
}

// Create a new unlimited admin key (stored in wl_api_keys)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { org } = body

    const secret = 'admin-' + randomUUID()

    // Insert into wl_api_keys with the required provision_key
    // This gives high limits: 1000 connections, 500000 queries, rate of 10/s
    await sql`
      INSERT INTO wl_api_keys (provision_key, org, name, secret, origins)
      VALUES ('admin-panel', ${org || 'admin'}, 'Admin Panel Key', ${secret}, '{}')
    `

    return NextResponse.json({ success: true, secret })
  } catch (e: any) {
    console.error('Error creating admin key:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// Delete an admin key
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const secret = searchParams.get('secret')

    if (!secret) {
      return NextResponse.json({ error: 'secret required' }, { status: 400 })
    }

    await sql`
      UPDATE wl_api_keys
      SET deleted_at = now()
      WHERE provision_key = 'admin-panel' AND secret = ${secret}
    `

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Error deleting admin key:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
