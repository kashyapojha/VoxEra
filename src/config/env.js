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
