import { sql, beSql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  // Database size per chain
  let tableSizes: any[] = []
  try {
    tableSizes = await beSql`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
        pg_total_relation_size(schemaname || '.' || tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
        AND (tablename LIKE 'blocks_%' OR tablename LIKE 'logs_%' OR tablename LIKE 'txs_%')
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
    `
  } catch (e) {
    console.error('Error fetching table sizes:', e)
  }

  // Total database size
  let dbSize: any = null
  try {
    const result = await beSql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as size_bytes
    `
    dbSize = result[0]
  } catch (e) {
    console.error('Error fetching db size:', e)
  }

  // Query history from fe database (if query_log table exists)
  let queryHistory: any[] = []
  try {
    queryHistory = await sql`
      SELECT
        q.api_key,
        q.query,
        q.chain,
        q.duration_ms,
        q.created_at,
        q.error
      FROM query_log q
      ORDER BY q.created_at DESC
      LIMIT 100
    `
  } catch (e) {
    // Table might not exist
  }

  // API usage per user (last 30 days)
  let userUsage: any[] = []
  try {
    userUsage = await sql`
      SELECT
        a.email,
        count(q.id) as total_queries,
        avg(q.duration_ms)::int as avg_duration_ms,
        max(q.created_at) as last_query,
        count(CASE WHEN q.error IS NOT NULL THEN 1 END) as error_count
      FROM accounts a
      LEFT JOIN api_keys k ON k.owner = a.id
      LEFT JOIN query_log q ON q.api_key = k.secret
        AND q.created_at > NOW() - INTERVAL '30 days'
      GROUP BY a.email
      HAVING count(q.id) > 0
      ORDER BY total_queries DESC
      LIMIT 50
    `
  } catch (e) {
    // Tables might not exist or have different schema
  }

  // Get network configs for RPC health check
  let networks: any[] = []
  try {
    networks = await sql`
      SELECT chain, name, url, enabled
      FROM config
      WHERE enabled = true
      ORDER BY chain
    `
  } catch (e) {
    console.error('Error fetching networks:', e)
  }

  return NextResponse.json({
    tableSizes,
    dbSize,
    queryHistory,
    userUsage,
    networks,
  })
}
