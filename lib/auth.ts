import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

const SESSION_COOKIE = 'admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) throw new Error('ADMIN_PASSWORD environment variable is required')
  return secret
}

function sign(value: string): string {
  const secret = getSecret()
  const signature = createHmac('sha256', secret).update(value).digest('hex')
  return `${value}.${signature}`
}

function verify(signed: string): string | null {
  const secret = getSecret()
  const [value, signature] = signed.split('.')
  if (!value || !signature) return null

  const expected = createHmac('sha256', secret).update(value).digest('hex')
  if (signature !== expected) return null

  return value
}

export function validatePassword(password: string): boolean {
  return password === process.env.ADMIN_PASSWORD
}

export async function createSession(): Promise<void> {
  const timestamp = Date.now().toString()
  const signed = sign(timestamp)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)

  if (!session?.value) return false

  const timestamp = verify(session.value)
  if (!timestamp) return false

  // Check if session is expired
  const created = parseInt(timestamp, 10)
  const now = Date.now()
  if (now - created > SESSION_MAX_AGE * 1000) return false

  return true
}
