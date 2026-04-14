/* global process */

const DASHBOARD_PASSWORD_ENABLED = process.env.DASHBOARD_PASSWORD_ENABLED === 'true'
const DASHBOARD_ACCESS_COOKIE = 'ayni_dashboard_access'
const DASHBOARD_SESSION_SECRET = process.env.DASHBOARD_SESSION_SECRET ?? ''
const DASHBOARD_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

let cachedSecret = ''
let cachedSigningKeyPromise = null

function getSessionSecret() {
  if (!DASHBOARD_PASSWORD_ENABLED) return ''
  return DASHBOARD_SESSION_SECRET
}

function getTextEncoder() {
  return new TextEncoder()
}

function getTextDecoder() {
  return new TextDecoder()
}

function toBase64Url(value) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const padded = value + '='.repeat((4 - (value.length % 4 || 4)) % 4)
  return padded.replace(/-/g, '+').replace(/_/g, '/')
}

function encodeBase64Url(input) {
  const bytes = typeof input === 'string' ? getTextEncoder().encode(input) : input
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return toBase64Url(btoa(binary))
}

function decodeBase64UrlToBytes(value) {
  const normalized = fromBase64Url(value)
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function getSigningKey() {
  const secret = getSessionSecret()
  if (!secret) return null

  if (cachedSigningKeyPromise && cachedSecret === secret) {
    return cachedSigningKeyPromise
  }

  cachedSecret = secret
  cachedSigningKeyPromise = crypto.subtle.importKey(
    'raw',
    getTextEncoder().encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign', 'verify'],
  )
  return cachedSigningKeyPromise
}

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader) return {}

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((result, part) => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex === -1) return result

      const key = part.slice(0, separatorIndex)
      const value = part.slice(separatorIndex + 1)
      result[key] = value
      return result
    }, {})
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000)
}

async function signPayload(payloadSegment) {
  const signingKey = await getSigningKey()
  if (!signingKey) return ''

  const signature = await crypto.subtle.sign('HMAC', signingKey, getTextEncoder().encode(payloadSegment))
  return encodeBase64Url(new Uint8Array(signature))
}

export async function issueDashboardSessionToken(subject = 'dashboard') {
  const secret = getSessionSecret()
  if (!secret) return ''

  const issuedAt = nowInSeconds()
  const payload = {
    v: 1,
    sub: subject || 'dashboard',
    iat: issuedAt,
    exp: issuedAt + DASHBOARD_SESSION_MAX_AGE_SECONDS,
  }
  const payloadSegment = encodeBase64Url(JSON.stringify(payload))
  const signatureSegment = await signPayload(payloadSegment)
  if (!signatureSegment) return ''
  return `${payloadSegment}.${signatureSegment}`
}

export async function verifyDashboardSessionToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing' }
  }

  const secret = getSessionSecret()
  if (!secret) {
    return { valid: false, reason: 'missing_secret' }
  }

  const [payloadSegment, signatureSegment] = token.split('.')
  if (!payloadSegment || !signatureSegment) {
    return { valid: false, reason: 'malformed' }
  }

  const signingKey = await getSigningKey()
  if (!signingKey) {
    return { valid: false, reason: 'missing_secret' }
  }

  const isSignatureValid = await crypto.subtle.verify(
    'HMAC',
    signingKey,
    decodeBase64UrlToBytes(signatureSegment),
    getTextEncoder().encode(payloadSegment),
  )
  if (!isSignatureValid) {
    return { valid: false, reason: 'bad_signature' }
  }

  try {
    const payloadJson = getTextDecoder().decode(decodeBase64UrlToBytes(payloadSegment))
    const payload = JSON.parse(payloadJson)
    const expiresAt = Number.parseInt(String(payload?.exp ?? ''), 10)
    if (!Number.isFinite(expiresAt) || expiresAt <= nowInSeconds()) {
      return { valid: false, reason: 'expired' }
    }

    return { valid: true, payload }
  } catch {
    return { valid: false, reason: 'invalid_payload' }
  }
}

export function getDashboardSessionTokenFromCookie(cookieHeader) {
  const cookies = parseCookieHeader(cookieHeader)
  return cookies[DASHBOARD_ACCESS_COOKIE] ?? ''
}

export function buildDashboardSessionCookie(token, secure = process.env.NODE_ENV === 'production') {
  return [
    `${DASHBOARD_ACCESS_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
    `Max-Age=${DASHBOARD_SESSION_MAX_AGE_SECONDS}`,
  ]
    .filter(Boolean)
    .join('; ')
}

export function buildDashboardLogoutCookie(secure = process.env.NODE_ENV === 'production') {
  return [
    `${DASHBOARD_ACCESS_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
    'Max-Age=0',
  ]
    .filter(Boolean)
    .join('; ')
}

export function isDashboardSecurityConfigured() {
  if (!DASHBOARD_PASSWORD_ENABLED) return true
  return Boolean(getSessionSecret())
}

