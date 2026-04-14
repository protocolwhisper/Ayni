/* global process, Buffer */

import { timingSafeEqual } from 'node:crypto'
import {
  buildDashboardSessionCookie,
  issueDashboardSessionToken,
  isDashboardSecurityConfigured,
} from './_lib/dashboardSession.js'

const DASHBOARD_PASSWORD_ENABLED = process.env.DASHBOARD_PASSWORD_ENABLED === 'true'
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? ''
const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME ?? ''
const MAX_FAILED_ATTEMPTS = 5
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000
const LOCKOUT_MS = 15 * 60 * 1000

const dashboardAuthAttempts = globalThis.__ayniDashboardAuthAttempts ?? new Map()
globalThis.__ayniDashboardAuthAttempts = dashboardAuthAttempts

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function safeEqual(candidate, expected) {
  const left = Buffer.from(candidate ?? '', 'utf8')
  const right = Buffer.from(expected ?? '', 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string') {
    const [firstIp] = forwardedFor.split(',')
    return firstIp.trim()
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const [firstIp] = forwardedFor[0].split(',')
    return firstIp.trim()
  }

  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim()
  }

  return 'unknown'
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

function getRateLimitState(ip, now = Date.now()) {
  const existing = dashboardAuthAttempts.get(ip)
  if (!existing) {
    return { attempts: 0, windowStart: now, blockedUntil: 0 }
  }

  const windowExpired = now - existing.windowStart > ATTEMPT_WINDOW_MS
  if (windowExpired && existing.blockedUntil <= now) {
    return { attempts: 0, windowStart: now, blockedUntil: 0 }
  }

  return existing
}

function registerFailure(ip, now = Date.now()) {
  const state = getRateLimitState(ip, now)
  const attempts = state.attempts + 1
  const blockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : state.blockedUntil
  dashboardAuthAttempts.set(ip, { attempts, windowStart: state.windowStart, blockedUntil })
}

function clearFailures(ip) {
  dashboardAuthAttempts.delete(ip)
}

function clearStaleRateLimitEntries(now = Date.now()) {
  for (const [ip, state] of dashboardAuthAttempts.entries()) {
    const isStale = state.blockedUntil <= now && now - state.windowStart > ATTEMPT_WINDOW_MS
    if (isStale) {
      dashboardAuthAttempts.delete(ip)
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' })
  }

  if (!DASHBOARD_PASSWORD_ENABLED) {
    return sendJson(res, 200, { ok: true, redirectTo: '/dashboard/' })
  }

  if (!isDashboardSecurityConfigured()) {
    return sendJson(res, 500, { ok: false, error: 'Dashboard security is misconfigured.' })
  }

  if (!hasSameOrigin(req)) {
    return sendJson(res, 403, { ok: false, error: 'Forbidden.' })
  }

  const clientIp = getClientIp(req)
  const now = Date.now()
  clearStaleRateLimitEntries(now)
  const rateLimitState = getRateLimitState(clientIp, now)
  if (rateLimitState.blockedUntil > now) {
    return sendJson(res, 429, { ok: false, error: 'Too many attempts. Try again later.' })
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const username = typeof req.body?.username === 'string' ? req.body.username : ''
  const next = typeof req.body?.next === 'string' && req.body.next.startsWith('/') ? req.body.next : '/dashboard/'

  const passwordMatches = Boolean(DASHBOARD_PASSWORD) && safeEqual(password, DASHBOARD_PASSWORD)
  const usernameMatches = !DASHBOARD_USERNAME || safeEqual(username, DASHBOARD_USERNAME)

  if (!passwordMatches || !usernameMatches) {
    registerFailure(clientIp, now)
    return sendJson(res, 401, { ok: false, error: 'Invalid credentials.' })
  }

  clearFailures(clientIp)
  const sessionToken = await issueDashboardSessionToken(username || 'dashboard')
  if (!sessionToken) {
    return sendJson(res, 500, { ok: false, error: 'Dashboard security is misconfigured.' })
  }
  const secure = process.env.NODE_ENV === 'production'
  const cookie = buildDashboardSessionCookie(sessionToken, secure)
  res.setHeader('Set-Cookie', cookie)
  return sendJson(res, 200, { ok: true, redirectTo: next })
}
