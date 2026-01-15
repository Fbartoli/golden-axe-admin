import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email)

  const [keys, plans, usage, collabs] = await Promise.all([
    sql`
      SELECT secret, origins, created_at, deleted_at
      FROM api_keys
      WHERE owner_email = ${email}
      ORDER BY created_at DESC
    `,
    sql`
      SELECT name, amount, rate, timeout, connections, queries, created_at,
             daimo_tx, stripe_customer
      FROM plan_changes
      WHERE owner_email = ${email}
      ORDER BY created_at DESC
    `,
    sql`
      SELECT day, n as queries
      FROM daily_user_queries
      WHERE owner_email = ${email}
      ORDER BY day DESC
      LIMIT 30
    `,
    sql`
      SELECT email, created_at, disabled_at
      FROM collabs
      WHERE owner_email = ${email}
      ORDER BY created_at DESC
    `,
  ])

  return NextResponse.json({
    email,
    keys,
    plans,
    usage,
    collabs,
  })
}
