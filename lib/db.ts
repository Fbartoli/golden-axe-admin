import postgres from 'postgres'

const feConnectionString = process.env.PG_URL_FE || 'postgres://golden_axe:golden_axe@golden-axe-postgres:5432/fe'
const beConnectionString = process.env.PG_URL_BE || 'postgres://golden_axe:golden_axe@golden-axe-postgres:5432/be'

// Connection pool options - reduce connections for admin panel
const poolOptions = {
  max: 3,              // Max 3 connections per pool (down from default 10)
  idle_timeout: 20,    // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
}

// Prevent connection pool duplication in Next.js dev mode (hot reload)
const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined
  beSql: ReturnType<typeof postgres> | undefined
}

export const sql = globalForDb.sql ?? postgres(feConnectionString, poolOptions)
export const beSql = globalForDb.beSql ?? postgres(beConnectionString, poolOptions)

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql
  globalForDb.beSql = beSql
}
