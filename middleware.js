const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? ''
const DASHBOARD_PASSWORD_ENABLED = process.env.DASHBOARD_PASSWORD_ENABLED !== 'false' && Boolean(DASHBOARD_PASSWORD)
const DASHBOARD_ACCESS_COOKIE = 'ayni_dashboard_access'

function hasAccessCookie(cookieHeader) {
  if (!cookieHeader) return false

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .some((part) => part === `${DASHBOARD_ACCESS_COOKIE}=1`)
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

  if (pathname.startsWith('/dashboard-login')) {
    if (hasAccess) {
      const next = url.searchParams.get('next')
      return Response.redirect(new URL(next?.startsWith('/') ? next : '/dashboard/', request.url), 302)
    }

    return
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/solver')) {
    if (hasAccess) return
    const loginUrl = new URL('/dashboard-login/', request.url)
    loginUrl.searchParams.set('next', pathname + url.search)
    return Response.redirect(loginUrl, 302)
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
