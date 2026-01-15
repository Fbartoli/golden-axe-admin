import { beSql } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Get table columns from the be database
  let columns: any[] = []
  try {
    columns = await beSql`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('blocks', 'txs', 'logs')
      ORDER BY table_name, ordinal_position
    `
  } catch (e) {
    console.error('Error fetching schema:', e)
  }

  // Group by table
  const schema: Record<string, Array<{ name: string; type: string; nullable: boolean }>> = {}
  for (const col of columns) {
    if (!schema[col.table_name]) {
      schema[col.table_name] = []
    }
    schema[col.table_name].push({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
    })
  }

  // Query templates
  const templates = [
    {
      name: 'Recent logs',
      description: 'Get the 10 most recent logs',
      query: `SELECT block_num, tx_hash, log_idx, address
FROM logs
ORDER BY block_num DESC
LIMIT 10`,
    },
    {
      name: 'Logs by address',
      description: 'Filter logs by contract address',
      query: `SELECT block_num, tx_hash, log_idx, topics, data
FROM logs
WHERE address = '\\x...'
ORDER BY block_num DESC
LIMIT 100`,
    },
    {
      name: 'Logs by topic',
      description: 'Filter logs by event signature (topic0)',
      query: `SELECT block_num, tx_hash, address, data
FROM logs
WHERE topics[1] = '\\xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
ORDER BY block_num DESC
LIMIT 100`,
    },
    {
      name: 'Block info',
      description: 'Get block details',
      query: `SELECT num, timestamp, hash, gas_used, gas_limit
FROM blocks
WHERE num = 20000000`,
    },
    {
      name: 'Recent transactions',
      description: 'Get recent transactions with value',
      query: `SELECT block_num, tx_idx, hash, "from", "to", value
FROM txs
ORDER BY block_num DESC
LIMIT 10`,
    },
    {
      name: 'Transactions by address',
      description: 'Find transactions from/to an address',
      query: `SELECT block_num, hash, "from", "to", value, gas_used
FROM txs
WHERE "from" = '\\x...' OR "to" = '\\x...'
ORDER BY block_num DESC
LIMIT 100`,
    },
    {
      name: 'Count logs by address',
      description: 'Count events emitted by a contract',
      query: `SELECT address, count(1) as event_count
FROM logs
GROUP BY address
ORDER BY event_count DESC
LIMIT 20`,
    },
    {
      name: 'ERC-20 Transfer (decoded)',
      description: 'Decode Transfer events with event signature',
      query: `SELECT block_num, tx_hash, address,
  decode_log('from', data, topics),
  decode_log('to', data, topics),
  decode_log('value', data, topics)
FROM logs
WHERE topics[1] = '\\xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
ORDER BY block_num DESC
LIMIT 10`,
      eventSignature: 'event Transfer(address indexed from, address indexed to, uint256 value)',
    },
  ]

  // Common validation rules (patterns as strings for JSON serialization)
  const validationRules = [
    { pattern: ';\\s*;', message: 'Double semicolon detected' },
    { pattern: 'DROP\\s+TABLE', message: 'DROP TABLE is not allowed' },
    { pattern: 'DELETE\\s+FROM', message: 'DELETE is not allowed' },
    { pattern: 'UPDATE\\s+\\w+\\s+SET', message: 'UPDATE is not allowed' },
    { pattern: 'INSERT\\s+INTO', message: 'INSERT is not allowed' },
    { pattern: 'TRUNCATE', message: 'TRUNCATE is not allowed' },
    { pattern: 'ALTER\\s+TABLE', message: 'ALTER TABLE is not allowed' },
    { pattern: 'CREATE\\s+(TABLE|INDEX)', message: 'CREATE is not allowed' },
    { pattern: 'count\\s*\\(\\s*\\*\\s*\\)', message: 'count(*) is not supported, use count(1) instead' },
  ]

  return NextResponse.json({
    schema,
    templates,
    validationRules,
  })
}
