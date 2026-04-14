/* global process */

import { buildDashboardLogoutCookie } from './_lib/dashboardSession.js'

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function getExpectedOrigin(req) {
  const forwardedProtoHeader = req.headers['x-forwarded-proto']
  const forwardedProto = Array.isArray(forwardedProtoHeader) ? forwardedProtoHeader[0] : forwardedProtoHeader
  const protocol = forwardedProto?.split(',')[0]?.trim() || (process.env.NODE_ENV === 'production' ? 'https' : 'http')

  const forwardedHostHeader = req.headers['x-forwarded-host']
  const forwardedHost = Array.isArray(forwardedHostHeader) ? forwardedHostHeader[0] : forwardedHostHeader
  const host = (forwardedHost || req.headers.host || '').split(',')[0].trim()
  if (!host) return ''
  return `${protocol}://${host}`
}

function hasSameOrigin(req) {
  const expectedOrigin = getExpectedOrigin(req)
  if (!expectedOrigin) return true

  const originHeader = req.headers.origin
  if (typeof originHeader === 'string' && originHeader) {
    return originHeader === expectedOrigin
  }

  const refererHeader = req.headers.referer
  if (typeof refererHeader === 'string' && refererHeader) {
    try {
      return new URL(refererHeader).origin === expectedOrigin
    } catch {
      return false
    }
  }

  return true
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' })
  }

  if (!hasSameOrigin(req)) {
    return sendJson(res, 403, { ok: false, error: 'Forbidden.' })
  }

  const secure = process.env.NODE_ENV === 'production'
  res.setHeader('Set-Cookie', buildDashboardLogoutCookie(secure))
  return sendJson(res, 200, { ok: true, redirectTo: '/dashboard-login/' })
}

