const DASHBOARD_PASSWORD_ENABLED = process.env.DASHBOARD_PASSWORD_ENABLED === 'true'
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? ''
const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME ?? ''

function unauthorizedResponse() {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Ayni Dashboard", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })
}

function decodeBasicAuth(value) {
  if (!value?.startsWith('Basic ')) return null

  try {
    const decoded = atob(value.slice(6))
    const separatorIndex = decoded.indexOf(':')
    if (separatorIndex < 0) return null

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    }
  } catch {
    return null
  }
}

export default function middleware(request) {
  if (!DASHBOARD_PASSWORD_ENABLED || !DASHBOARD_PASSWORD) {
    return
  }

  const credentials = decodeBasicAuth(request.headers.get('authorization'))
  if (!credentials) {
    return unauthorizedResponse()
  }

  const passwordMatches = credentials.password === DASHBOARD_PASSWORD
  const usernameMatches = !DASHBOARD_USERNAME || credentials.username === DASHBOARD_USERNAME

  if (!passwordMatches || !usernameMatches) {
    return unauthorizedResponse()
  }
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
}
