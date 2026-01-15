export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BE_URL = process.env.BE_URL || 'http://golden-axe-be:8000'

export async function GET(): Promise<Response> {
  const response = await fetch(`${BE_URL}/status`, {
    cache: 'no-store',
  })

  if (!response.ok || !response.body) {
    return new Response('Failed to connect to backend', { status: 502 })
  }

  // Pass through the stream directly
  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
