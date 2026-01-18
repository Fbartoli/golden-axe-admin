export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BE_URL = process.env.BE_URL || 'http://horusblock-be:8000'

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const fetchStatus = async () => {
        try {
          const response = await fetch(`${BE_URL}/status`, {
            cache: 'no-store',
          })

          if (response.ok) {
            const data = await response.json()
            sendEvent(data)
          }
        } catch (e) {
          // Silently ignore fetch errors, will retry on next interval
        }
      }

      // Send initial status
      await fetchStatus()

      // Poll every 2 seconds
      const interval = setInterval(fetchStatus, 2000)

      // Clean up on close (this is a best-effort cleanup)
      // Note: ReadableStream doesn't have a native cancel callback in all environments
      const cleanup = () => {
        clearInterval(interval)
        try {
          controller.close()
        } catch {}
      }

      // Keep the stream alive, clean up after 5 minutes of inactivity
      setTimeout(cleanup, 5 * 60 * 1000)
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
