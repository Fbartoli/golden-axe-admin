import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const users = await sql`
    WITH user_plans AS (
      SELECT DISTINCT ON (owner_email)
        owner_email,
        name as plan_name,
        rate,
        timeout,
        connections,
        queries,
        created_at as plan_date
      FROM plan_changes
      WHERE daimo_tx IS NOT NULL OR stripe_customer IS NOT NULL
      ORDER BY owner_email, created_at DESC
    ),
    user_keys AS (
      SELECT owner_email, count(*) as key_count
      FROM api_keys
      WHERE deleted_at IS NULL
      GROUP BY owner_email
    ),
    user_usage AS (
      SELECT owner_email, sum(n) as total_queries, max(day) as last_active
      FROM daily_user_queries
      WHERE day >= now() - interval '30 days'
      GROUP BY owner_email
    )
    SELECT
      COALESCE(p.owner_email, k.owner_email) as email,
      p.plan_name,
      p.rate,
      p.timeout,
      p.connections,
      p.queries as query_limit,
      p.plan_date,
      COALESCE(k.key_count, 0) as key_count,
      COALESCE(u.total_queries, 0) as queries_30d,
      u.last_active
    FROM user_plans p
    FULL OUTER JOIN user_keys k ON p.owner_email = k.owner_email
    LEFT JOIN user_usage u ON COALESCE(p.owner_email, k.owner_email) = u.owner_email
    ORDER BY COALESCE(p.plan_date, now()) DESC
  `
  return NextResponse.json(users)
}
