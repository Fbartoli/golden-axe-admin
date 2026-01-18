import { beSql } from '@/lib/db'
import { NextResponse } from 'next/server'
import { networkSchema, deleteNetworkSchema, validateBody, validateParams } from '@/lib/validation'

// Chain config now lives in the backend database (be.config)
// Changes take effect within 30 seconds without restarting the backend

export async function GET() {
  const networks = await beSql`
    SELECT chain, name, url, enabled, batch_size, concurrency, start_block
    FROM config
    ORDER BY chain
  `
  return NextResponse.json(networks)
}

export async function POST(req: Request) {
  const validation = await validateBody(req, networkSchema)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const { chain, name, url, enabled, batch_size, concurrency, start_block } = validation.data

  await beSql`
    INSERT INTO config (chain, name, url, enabled, batch_size, concurrency, start_block)
    VALUES (${chain}, ${name}, ${url}, ${enabled}, ${batch_size}, ${concurrency}, ${start_block})
    ON CONFLICT (chain) DO UPDATE SET
      name = EXCLUDED.name,
      url = EXCLUDED.url,
      enabled = EXCLUDED.enabled,
      batch_size = EXCLUDED.batch_size,
      concurrency = EXCLUDED.concurrency,
      start_block = EXCLUDED.start_block
  `

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const validation = validateParams(searchParams, deleteNetworkSchema)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  await beSql`DELETE FROM config WHERE chain = ${validation.data.chain}`

  return NextResponse.json({ success: true })
}
