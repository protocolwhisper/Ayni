const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? ''
const DASHBOARD_PASSWORD_ENABLED = process.env.DASHBOARD_PASSWORD_ENABLED !== 'false' && Boolean(DASHBOARD_PASSWORD)
const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME ?? ''
const DASHBOARD_ACCESS_COOKIE = 'ayni_dashboard_access'

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' })
  }

  if (!DASHBOARD_PASSWORD_ENABLED) {
    return sendJson(res, 200, { ok: true, redirectTo: '/dashboard/' })
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const username = typeof req.body?.username === 'string' ? req.body.username : ''
  const next = typeof req.body?.next === 'string' && req.body.next.startsWith('/') ? req.body.next : '/dashboard/'

  const passwordMatches = Boolean(DASHBOARD_PASSWORD) && password === DASHBOARD_PASSWORD
  const usernameMatches = !DASHBOARD_USERNAME || username === DASHBOARD_USERNAME

  if (!passwordMatches || !usernameMatches) {
    return sendJson(res, 401, { ok: false, error: 'Wrong password.' })
  }

  const secure = process.env.NODE_ENV === 'production'
  const cookie = [
    `${DASHBOARD_ACCESS_COOKIE}=1`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
    'Max-Age=43200',
  ]
    .filter(Boolean)
    .join('; ')

  res.setHeader('Set-Cookie', cookie)
  return sendJson(res, 200, { ok: true, redirectTo: next })
}
