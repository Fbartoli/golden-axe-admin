import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 * 1000 // 7 days in ms

function verifySession(request: NextRequest): boolean {
  const session = request.cookies.get(SESSION_COOKIE)
  if (!session?.value) return false

  const secret = process.env.ADMIN_PASSWORD
  if (!secret) return false

  const [timestamp, signature] = session.value.split('.')
  if (!timestamp || !signature) return false

  // Verify timestamp is not expired
  const created = parseInt(timestamp, 10)
  if (isNaN(created)) return false
  if (Date.now() - created > SESSION_MAX_AGE) return false

  // Note: Full HMAC verification happens on the server side
  // Middleware just checks basic validity to avoid unnecessary redirects
  return true
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to login page and login API
  if (pathname === '/login' || pathname === '/api/auth/login') {
    // If already authenticated, redirect to home
    if (verifySession(request) && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Check authentication for all other routes
  if (!verifySession(request)) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // For pages, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
