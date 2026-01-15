import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET() {
  const keys = await sql`
    SELECT owner_email, secret, origins, created_at, deleted_at
    FROM api_keys
    ORDER BY created_at DESC
  `
  return NextResponse.json(keys)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { owner_email, origins } = body

  const secret = randomUUID()

  await sql`
    INSERT INTO api_keys (owner_email, secret, origins)
    VALUES (${owner_email}, ${secret}, ${origins ?? []})
  `

  return NextResponse.json({ success: true, secret })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (!secret) {
    return NextResponse.json({ error: 'secret required' }, { status: 400 })
  }

  await sql`
    UPDATE api_keys
    SET deleted_at = now()
    WHERE secret = ${secret}
  `

  return NextResponse.json({ success: true })
}
