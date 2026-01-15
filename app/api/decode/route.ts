import { NextResponse } from 'next/server'
import { decodeEventLog, parseAbi } from 'viem'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { abi, topics, data } = body

    // Parse the ABI
    let parsedAbi
    try {
      parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi
    } catch {
      // Try parsing as human-readable ABI
      parsedAbi = parseAbi([abi])
    }

    // Convert topics to proper format
    const formattedTopics = topics.map((t: string) =>
      t.startsWith('0x') ? t : `0x${t}`
    ) as [`0x${string}`, ...`0x${string}`[]]

    // Format data
    const formattedData = data.startsWith('0x') ? data : `0x${data}`

    // Decode the event
    const decoded = decodeEventLog({
      abi: parsedAbi,
      data: formattedData,
      topics: formattedTopics,
    }) as { eventName: string; args: Record<string, any> }

    return NextResponse.json({
      success: true,
      eventName: decoded.eventName,
      args: Object.fromEntries(
        Object.entries(decoded.args || {}).map(([k, v]) => [
          k,
          typeof v === 'bigint' ? v.toString() : v,
        ])
      ),
    })
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    })
  }
}
