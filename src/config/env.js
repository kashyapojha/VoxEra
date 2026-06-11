/**
 * Centralized frontend environment configuration.
 * Vite exposes only variables prefixed with VITE_.
 */

function trimTrailingSlash(url) {
  return typeof url === 'string' ? url.replace(/\/$/, '') : ''
}

export function hostFromUrl(url) {
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export function portFromUrl(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.port) return parsed.port
    if (parsed.protocol === 'wss:') return '443'
    if (parsed.protocol === 'ws:') return '80'
    return ''
  } catch {
    return ''
  }
}

export function trimEnv(value) {
  return typeof value === 'string' ? value.trim().replace(/^["']|["']$/g, '') : ''
}

/** Parse sip:1001@host → { extension, domain } (strips ;transport=ws and other params) */
export function parseSipUri(uri) {
  const match = trimEnv(uri).match(/^sip:([^@]+)@([^;]+)/i)
  return {
    extension: match?.[1]?.trim() || '',
    domain: match?.[2]?.trim() || '',
  }
}

const apiUrl = trimTrailingSlash(trimEnv(import.meta.env.VITE_API_URL ?? ''))
const sipWsUrl = trimEnv(import.meta.env.VITE_SIP_WS_URL ?? '')
const sipUri = trimEnv(import.meta.env.VITE_SIP_URI ?? '')
const sipPassword = trimEnv(import.meta.env.VITE_SIP_PASSWORD ?? '')
const { extension: sipExtension, domain: sipDomain } = parseSipUri(sipUri)

/**
 * Asterisk demo PBX uses extension-as-password (1001→1001, 1002→1002).
 * When the URI extension differs from the baked .env default, do not keep using VITE_SIP_PASSWORD.
 */
/**
 * HTTPS pages cannot use ws:// (mixed content). Direct wss://host:8089 often fails (separate TLS cert).
 * Route SIP through nginx on the same host:443 → /sip-ws → Asterisk :8089/ws.
 */
export function resolveSipWebSocketUrl(url) {
  const trimmed = trimEnv(url)
  if (!trimmed || typeof window === 'undefined') return trimmed
  if (window.location.protocol !== 'https:') return trimmed

  try {
    const httpish = trimmed.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:')
    const sip = new URL(httpish)
    if (sip.hostname === window.location.hostname) {
      const proxied = `wss://${window.location.host}/sip-ws`
      if (trimmed !== proxied) {
        console.info(`[SIP] HTTPS — SIP WebSocket via nginx: ${proxied} (settings: ${trimmed})`)
      }
      return proxied
    }
  } catch {
    // fall through
  }

  if (trimmed.startsWith('ws://')) {
    return `wss://${trimmed.slice(5)}`
  }
  return trimmed
}

export function resolveSipPassword(extension, explicitPassword) {
  const ext = trimEnv(extension)
  const pass = trimEnv(explicitPassword)
  if (!ext) {
    return pass || sipPassword
  }
  if (!pass || pass === sipPassword || pass === sipExtension) {
    return ext
  }
  return pass
}

/** Same-origin API when apiUrl is empty (nginx / Vite proxy). */
export function apiUrlFor(path) {
  const base = apiUrl
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

export const env = {
  apiUrl,
  sipWsUrl,
  sipUri,
  sipPassword,
  sipExtension,
  sipDomain: sipDomain || hostFromUrl(sipWsUrl) || (typeof window !== 'undefined' ? window.location.hostname : 'localhost'),
}

export default env
