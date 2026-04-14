/* global process */

import {
  buildDashboardLogoutCookie,
  getDashboardSessionTokenFromCookie,
  verifyDashboardSessionToken,
} from './api/_lib/dashboardSession.js'

const DASHBOARD_PASSWORD_ENABLED = process.env.DASHBOARD_PASSWORD_ENABLED === 'true'

function redirectTo(url, clearCookie = false) {
  const response = Response.redirect(url, 302)
  if (clearCookie) {
    response.headers.set('Set-Cookie', buildDashboardLogoutCookie())
  }
  return response
}

export default async function middleware(request) {
  if (!DASHBOARD_PASSWORD_ENABLED) {
    return
  }

  const url = new URL(request.url)
  const { pathname, search } = url

  if (pathname.startsWith('/api/dashboard-auth') || pathname.startsWith('/api/dashboard-logout')) {
    return
  }

  const sessionToken = getDashboardSessionTokenFromCookie(request.headers.get('cookie'))
  const session = await verifyDashboardSessionToken(sessionToken)
  const hasAccess = session.valid

  if (pathname.startsWith('/dashboard-login')) {
    if (hasAccess) {
      return redirectTo(new URL('/dashboard/', request.url), false)
    }

    return
  }

  if (pathname.startsWith('/dashboard') && !hasAccess) {
    const loginUrl = new URL('/dashboard-login/', request.url)
    loginUrl.searchParams.set('next', pathname + search)
    return redirectTo(loginUrl, Boolean(sessionToken))
  }
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/dashboard-login', '/dashboard-login/:path*', '/api/dashboard-auth'],
}
