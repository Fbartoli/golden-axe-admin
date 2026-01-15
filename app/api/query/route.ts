import { NextResponse } from 'next/server'

const BE_URL = process.env.BE_URL || 'http://golden-axe-be:8000'

export async function POST(req: Request) {
  const body = await req.json()
  const { query, chain, api_key, event_signatures = [] } = body

  try {
    // The backend expects chain as a query parameter
    const payload = [{
      query,
      event_signatures,
    }]

    const res = await fetch(`${BE_URL}/query?chain=${chain}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(api_key ? { 'api-key': api_key } : {}),
      },
      body: JSON.stringify(payload),
    })

    const contentType = res.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      const data = await res.json()

      // Check for error response
      if (data.message) {
        return NextResponse.json({
          success: false,
          status: res.status,
          error: data.message,
        })
      }

      // The response has { block_height, result: [[[columns], [row1], [row2], ...]] }
      // Transform to array of objects for easier display
      const rawResult = data.result?.[0] || []
      if (rawResult.length > 0) {
        const columns = rawResult[0] as string[]
        const rows = rawResult.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {}
          columns.forEach((col, i) => {
            obj[col] = row[i]
          })
          return obj
        })
        return NextResponse.json({
          success: res.ok,
          status: res.status,
          data: rows,
          block_height: data.block_height,
        })
      }

      return NextResponse.json({
        success: res.ok,
        status: res.status,
        data: [],
        block_height: data.block_height,
      })
    } else {
      const text = await res.text()
      return NextResponse.json({
        success: res.ok,
        status: res.status,
        error: text,
      })
    }
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    }, { status: 500 })
  }
}
