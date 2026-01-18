import { beSql } from '@/lib/db'
import { getStatus } from '@/lib/backend-api'
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
        id: Date.now(),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
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
  try {
    // Try to get chain info from backend API, with config as fallback for URLs
    const [status, networks] = await Promise.all([
      getStatus().catch(() => null),
      // Keep config query for RPC URLs (not in backend /status response)
      beSql`
        SELECT chain, name, url
        FROM config
        WHERE enabled = true
        ORDER BY chain
      `,
    ])

    // Build a map of chain info from backend status if available
    const backendChains = new Map<number, { running: boolean; current: string; target: string }>()
    if (status?.chains) {
      for (const chain of status.chains) {
        backendChains.set(parseInt(chain.chain, 10), {
          running: chain.running,
          current: chain.current,
          target: chain.target,
        })
      }
    }

    // Check health for each RPC
    const results = await Promise.all(
      networks.map(async (n) => {
        const health = await checkRpcHealth(n.url)
        const backendInfo = backendChains.get(n.chain)

        return {
          chain: n.chain,
          name: n.name,
          url: n.url.replace(/\/[^/]*$/, '/***'), // Hide API key in URL
          running: backendInfo?.running ?? true,
          ...health,
        }
      })
    )

    return NextResponse.json(results)
  } catch (e: any) {
    console.error('Error checking RPC health:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
