/**
 * Centralized frontend environment configuration.
 * Vite exposes only variables prefixed with VITE_.
 */

function trimTrailingSlash(url) {
  return typeof url === 'string' ? url.replace(/\/$/, '') : ''
}

function hostFromUrl(url) {
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

/** Parse sip:1001@host → { extension, domain } */
export function parseSipUri(uri) {
  const match = trimEnv(uri).match(/^sip:([^@]+)@(.+)$/i)
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
