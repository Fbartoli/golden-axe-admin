import { beSql } from '@/lib/db'
import { NextResponse } from 'next/server'

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
  const body = await req.json()
  const { chain, name, url, enabled, batch_size, concurrency, start_block } = body

  await beSql`
    INSERT INTO config (chain, name, url, enabled, batch_size, concurrency, start_block)
    VALUES (${chain}, ${name}, ${url}, ${enabled ?? false}, ${batch_size ?? 2000}, ${concurrency ?? 10}, ${start_block})
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
  const chain = searchParams.get('chain')

  if (!chain) {
    return NextResponse.json({ error: 'chain required' }, { status: 400 })
  }

  await beSql`DELETE FROM config WHERE chain = ${chain}`

  return NextResponse.json({ success: true })
}
