export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BE_URL = process.env.BE_URL || 'http://horusblock-be:8000'

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const chain = searchParams.get('chain') || '1'
  const query = searchParams.get('query') || ''
  const eventSignatures = searchParams.get('event_signatures') || ''
  const apiKey = searchParams.get('api_key') || ''

  const params = new URLSearchParams({
    chain,
    query,
  })

  // Backend requires event_signatures param even if empty
  if (eventSignatures) {
    eventSignatures.split('|||').forEach(sig => {
      params.append('event_signatures', sig)
    })
  } else {
    params.append('event_signatures', '')
  }

  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['api-key'] = apiKey
  }

  try {
    const response = await fetch(`${BE_URL}/query-live?${params.toString()}`, {
      cache: 'no-store',
      headers,
    })

    if (!response.ok) {
      const text = await response.text()
      // Return error as SSE format so client can parse it
      const errorData = JSON.stringify({ error: text || `Backend error: ${response.status}` })
      return new Response(`data: ${errorData}\n\n`, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      })
    }

    if (!response.body) {
      const errorData = JSON.stringify({ error: 'No response body from backend' })
      return new Response(`data: ${errorData}\n\n`, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      })
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (err: any) {
    // Return connection error as SSE format
    const errorData = JSON.stringify({ error: `Failed to connect to backend: ${err.message}` })
    return new Response(`data: ${errorData}\n\n`, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  }
}
