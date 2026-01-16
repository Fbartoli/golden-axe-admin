import { NextResponse } from 'next/server'
import { validatePassword, createSession } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    if (!validatePassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    await createSession()

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
