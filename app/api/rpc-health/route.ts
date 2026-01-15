import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function checkRpcHealth(url: string): Promise<{ latency: number; blockNumber: string | null; error: string | null }> {
  const start = Date.now()
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: Date.now(), // Unique ID to prevent caching
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    const latency = Date.now() - start

    if (!response.ok) {
      return { latency, blockNumber: null, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    if (data.error) {
      return { latency, blockNumber: null, error: data.error.message }
    }

    return {
      latency,
      blockNumber: data.result ? parseInt(data.result, 16).toString() : null,
      error: null,
    }
  } catch (e: any) {
    return {
      latency: Date.now() - start,
      blockNumber: null,
      error: e.message || 'Unknown error',
    }
  }
}

export async function GET() {
  // Get enabled networks
  const networks = await sql`
    SELECT chain, name, url
    FROM config
    WHERE enabled = true
    ORDER BY chain
  `

  // Check health for each RPC
  const results = await Promise.all(
    networks.map(async (n) => {
      const health = await checkRpcHealth(n.url)
      return {
        chain: n.chain,
        name: n.name,
        url: n.url.replace(/\/[^/]*$/, '/***'), // Hide API key in URL
        ...health,
      }
    })
  )

  return NextResponse.json(results)
}
