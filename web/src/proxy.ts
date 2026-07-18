import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const session = request.cookies.get('gateiot_session')
  const { pathname } = request.nextUrl

  // Allow unrestricted access to the hardware swipe endpoint and public files
  if (
    pathname.startsWith('/api/swipe') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/logout') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }

  // Check if trying to access an API route (other than swipe)
  if (pathname.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
  } else {
    // If trying to access dashboard or other UI pages without a session, redirect to login
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Matcher for paths to protect
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
