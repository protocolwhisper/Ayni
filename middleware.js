const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? ''
const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME ?? ''
const DASHBOARD_PASSWORD_ENABLED = process.env.DASHBOARD_PASSWORD_ENABLED !== 'false' && Boolean(DASHBOARD_PASSWORD)
const DASHBOARD_ACCESS_COOKIE = 'ayni_dashboard_access'

function hasAccessCookie(cookieHeader) {
  if (!cookieHeader) return false

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .some((part) => part === `${DASHBOARD_ACCESS_COOKIE}=1`)
}

function decodeBase64(value) {
  try {
    return atob(value)
  } catch {
    return ''
  }
}

function hasValidBasicAuth(request) {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return false

  const decoded = decodeBase64(header.slice(6))
  if (!decoded) return false

  const separatorIndex = decoded.indexOf(':')
  if (separatorIndex < 0) return false

  const username = decoded.slice(0, separatorIndex)
  const password = decoded.slice(separatorIndex + 1)

  const usernameMatches = !DASHBOARD_USERNAME || username === DASHBOARD_USERNAME
  return usernameMatches && password === DASHBOARD_PASSWORD
}

function passwordChallenge() {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Ayni Dashboard", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })
}

export default function middleware(request) {
  if (!DASHBOARD_PASSWORD_ENABLED) {
    return
  }

  const url = new URL(request.url)
  const { pathname } = url

  if (pathname.startsWith('/api/dashboard-auth')) {
    return
  }

  const hasAccess = hasAccessCookie(request.headers.get('cookie'))
  const hasBasicAuth = hasValidBasicAuth(request)

  if (pathname.startsWith('/dashboard-login')) {
    if (hasAccess || hasBasicAuth) {
      const next = url.searchParams.get('next')
      return Response.redirect(new URL(next?.startsWith('/') ? next : '/dashboard/', request.url), 302)
    }

    return
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/solver')) {
    if (hasAccess || hasBasicAuth) {
      return
    }

    return passwordChallenge()
  }
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/solver',
    '/solver/:path*',
    '/dashboard-login',
    '/dashboard-login/:path*',
    '/api/dashboard-auth',
  ],
}
