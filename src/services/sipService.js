/**
 * sipService.js
 * Core JsSIP service layer — handles UA lifecycle, registration, and calls.
 * SIP endpoints come from VITE_SIP_WS_URL, VITE_SIP_URI, VITE_SIP_PASSWORD (no hardcoding).
 */

import JsSIP from 'jssip'
import { env, parseSipUri, trimEnv, hostFromUrl } from '../config/env'

JsSIP.debug.enable(
  import.meta.env.DEV || import.meta.env.VITE_SIP_DEBUG === 'true' ? 'JsSIP:*' : 'JsSIP:Error'
)

const REGISTER_TIMEOUT_MS = 25_000

const SIP_WS = env.sipWsUrl
const SIP_URI = env.sipUri
const SIP_PASSWORD = env.sipPassword
const SIP_DOMAIN = env.sipDomain

if (!SIP_WS) {
  console.error('[SIP] VITE_SIP_WS_URL is not set — WebRTC will not connect')
}

console.info('[SIP] VoxEra sipService loaded', {
  ws: SIP_WS || '(missing)',
  defaultUri: SIP_URI || '(missing)',
})

const wiredSessions = new WeakSet()
const wiredPeerConnections = new WeakSet()

const defaultCallOptions = {
  mediaConstraints: { audio: true, video: false },
  pcConfig: {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  },
  sessionTimersExpires: 0,
}

function playRemoteAudio(stream) {
  if (!stream) return
  const audioEl = document.getElementById('remoteAudio')
  if (!audioEl) return
  audioEl.srcObject = stream
  audioEl.play().catch((err) => {
    console.warn('[SIP] Audio autoplay blocked:', err)
    document.addEventListener('click', () => audioEl.play(), { once: true })
  })
}

function bindPeerConnection(pc, session, callbacks) {
  if (!pc || wiredPeerConnections.has(pc)) return
  wiredPeerConnections.add(pc)

  const onMediaReady = () => {
    callbacks.onMediaConnected?.(session)
  }

  pc.addEventListener('connectionstatechange', () => {
    console.info(`[SIP] PeerConnection connectionState — ${pc.connectionState}`)
    if (pc.connectionState === 'connected') onMediaReady()
  })

  pc.addEventListener('iceconnectionstatechange', () => {
    console.info(`[SIP] PeerConnection iceConnectionState — ${pc.iceConnectionState}`)
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      onMediaReady()
    }
  })

  pc.addEventListener('track', (trackEvent) => {
    console.info('[SIP] Remote track received:', trackEvent.track.kind)
    if (trackEvent.streams?.[0]) playRemoteAudio(trackEvent.streams[0])
    onMediaReady()
  })

  if (pc.connectionState === 'connected') onMediaReady()
  if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
    onMediaReady()
  }

  callbacks.onPeerConnection?.(pc, session)
}

function attachSessionHandlers(session, callbacks) {
  if (!session || wiredSessions.has(session)) return
  wiredSessions.add(session)

  session.on('progress', (e) => {
    const code = e.response?.status_code
    console.info(`[SIP] Session progress — ${code}`)
    callbacks.onProgress?.(session, code)
  })

  session.on('accepted', () => {
    console.info('[SIP] Session accepted (200 OK)')
    callbacks.onAccepted?.(session)
  })

  session.on('confirmed', () => {
    console.info('[SIP] Session confirmed — ACK complete')
    callbacks.onConfirmed?.(session)
  })

  session.on('ended', (e) => {
    console.info('[SIP] Session ended', e.cause)
    callbacks.onEnded?.(session, e.cause)
  })

  session.on('failed', (e) => {
    const code = e.message?.status_code || e.response?.status_code
    const dir = session.direction || 'unknown'
    console.error(
      `[SIP] Session failed (${dir})`,
      e.cause,
      code ? `SIP ${code}` : '',
      session.remote_identity?.uri?.user ? `peer ${session.remote_identity.uri.user}` : ''
    )
    callbacks.onFailed?.(session, e.cause)
  })

  session.on('getusermediafailed', (e) => {
    console.error('[SIP] getUserMedia failed', e)
    callbacks.onFailed?.(session, 'getUserMediaFailed')
  })

  session.on('sending', (e) => {
    if (e.request?.method === 'INVITE') {
      console.info('[SIP] INVITE sent')
      callbacks.onProgress?.(session, 100)
    }
  })

  session.on('peerconnection', (e) => {
    console.info('[SIP] PeerConnection created')
    bindPeerConnection(e.peerconnection, session, callbacks)
  })

  // JsSIP may create the PC before the peerconnection event — attach immediately.
  if (session.connection) {
    console.info('[SIP] PeerConnection already present on session')
    bindPeerConnection(session.connection, session, callbacks)
  }
}

/**
 * Build JsSIP UA from env defaults with optional overrides (Settings UI).
 *
 * @param {object} callbacks - event handlers from SipContext
 * @param {object} [overrides]
 * @param {string} [overrides.websocketUrl] - ws/wss URL
 * @param {string} [overrides.uri] - full SIP URI e.g. sip:1001@host
 * @param {string} [overrides.password]
 */
export function createUA(callbacks, overrides = {}) {
  const websocketUrl = trimEnv(overrides.websocketUrl || SIP_WS)
  const uri = trimEnv(overrides.uri || SIP_URI)
  const password = trimEnv(overrides.password || SIP_PASSWORD)

  if (!websocketUrl || !uri || !password) {
    throw new Error('SIP configuration incomplete — set VITE_SIP_WS_URL, VITE_SIP_URI, VITE_SIP_PASSWORD')
  }

  const socket = new JsSIP.WebSocketInterface(websocketUrl)
  const { extension: authorizationUser, domain: uriDomain } = parseSipUri(uri)
  const wsHost = hostFromUrl(websocketUrl)
  // Registrar/From domain must match the server Asterisk uses for digest realm (ASTERISK_EXTERNAL_IP).
  const sipDomain = uriDomain || wsHost || SIP_DOMAIN
  if (wsHost && uriDomain && wsHost !== uriDomain) {
    console.warn(
      `[SIP] URI domain "${uriDomain}" differs from WebSocket host "${wsHost}" — using WebSocket host for registrar/From`
    )
  }
  const effectiveDomain = (wsHost && uriDomain && wsHost !== uriDomain) ? wsHost : sipDomain

  if (!authorizationUser || !effectiveDomain) {
    throw new Error(`Invalid SIP URI — expected sip:1001@host, got "${uri}"`)
  }

  // AoR URI (From/To) includes the extension — Asterisk matches AOR from the To header user.
  // JsSIP derives registrar/realm from uri; do not override registrar_server or realm.
  const normalizedUri = `sip:${authorizationUser}@${effectiveDomain}`
  // REGISTER Contact: public SIP domain + ws transport — not Asterisk's :8089 listen port (that is
  // the server, not the browser). rewrite_contact on the endpoint maps this to the live WebSocket.
  const contactUri = `sip:${authorizationUser}@${effectiveDomain};transport=ws`

  const configuration = {
    sockets:            [socket],
    uri:                normalizedUri,
    contact_uri:        contactUri,
    display_name:       authorizationUser,
    authorization_user: authorizationUser,
    password,
    register:           true,
    session_timers:     false,
    register_expires:   600,
    connection_recovery_min_interval: 2,
    connection_recovery_max_interval: 30,
  }

  console.log('[SIP] UA config', {
    ...configuration,
    password: configuration.password ? '***' : undefined,
    sockets: [websocketUrl],
  })

  const extension = authorizationUser
  const ua = new JsSIP.UA(configuration)
  let registerTimeoutId = null
  let hadDisconnected = false

  const clearRegisterTimeout = () => {
    if (registerTimeoutId) {
      clearTimeout(registerTimeoutId)
      registerTimeoutId = null
    }
  }

  const startRegisterTimeout = () => {
    clearRegisterTimeout()
    registerTimeoutId = setTimeout(() => {
      console.error(`[SIP] Registration timeout — no final REGISTER response within ${REGISTER_TIMEOUT_MS / 1000}s`)
      callbacks.onRegistrationFailed?.(
        `Timeout — no REGISTER response from server within ${REGISTER_TIMEOUT_MS / 1000}s (check Asterisk PJSIP + port 8089)`
      )
    }, REGISTER_TIMEOUT_MS)
  }

  ua.on('connecting', () => {
    console.info(`[SIP] Connecting — ${uri}`)
    callbacks.onConnecting?.()
  })

  ua.on('connected', () => {
    console.info(`[SIP] WebSocket connected — ${uri} (sending REGISTER…)`)
    startRegisterTimeout()
    callbacks.onConnected?.()
    // On reconnect, refresh REGISTER so Asterisk WebSocket line= maps to this session.
    if (hadDisconnected) {
      console.info('[SIP] WebSocket reconnected — refreshing REGISTER contact')
      ua.register({ expires: configuration.register_expires })
    }
    hadDisconnected = false
  })

  ua.on('disconnected', (e) => {
    clearRegisterTimeout()
    hadDisconnected = true
    const cause = e?.cause ?? e?.error?.cause ?? e?.error ?? 'unknown'
    console.warn(`[SIP] WebSocket disconnected — ${uri}`, cause)
    callbacks.onDisconnected?.(cause)
  })

  ua.on('registered', () => {
    clearRegisterTimeout()
    console.info(`[SIP] Registered — ${uri}`)
    callbacks.onRegistered?.(extension)
  })

  ua.on('unregistered', () => {
    clearRegisterTimeout()
    console.info(`[SIP] Unregistered — ${uri}`)
    callbacks.onUnregistered?.()
  })

  ua.on('registrationFailed', (e) => {
    clearRegisterTimeout()
    const code = e.response?.status_code
    const reason = e.response?.reason_phrase
    const detail = code ? `${code} ${reason || ''}`.trim() : String(e.cause || 'Unknown error')
    // Asterisk may return 200 OK before contact bind is fixed; ignore stale failures if registered.
    if (ua.isRegistered()) {
      console.warn(`[SIP] Ignoring registrationFailed after successful register — ${detail}`)
      return
    }
    console.error(`[SIP] Registration failed — ${uri}`, detail, e.response || e)
    callbacks.onRegistrationFailed?.(detail, e)
  })

  ua.on('registrationExpiring', () => {
    console.info(`[SIP] Registration expiring — ${uri}`)
  })

  ua.on('newRTCSession', (data) => {
    const session = data.session
    const originator = data.originator

    console.info(`[SIP] New session — originator: ${originator}`)

    // Attach before callbacks so INVITE/progress events are not missed.
    attachSessionHandlers(session, callbacks)

    if (originator === 'remote') {
      const caller = session.remote_identity?.uri?.user || 'Unknown'
      console.info(`[SIP] Incoming call from ${caller}`)
      callbacks.onIncomingCall?.(session, caller)
    } else {
      const callee = session.remote_identity?.uri?.user || 'Unknown'
      console.info(`[SIP] Outgoing call to ${callee}`)
      callbacks.onOutgoingCall?.(session, callee)
    }
  })

  return ua
}

export function getUaSipDomain(ua) {
  const uri = ua?.configuration?.uri
  if (uri) {
    const { domain } = parseSipUri(uri)
    if (domain) return domain
  }
  return hostFromUrl(SIP_WS) || SIP_DOMAIN
}

export function makeCall(ua, target, domain) {
  if (!ua) throw new Error('UA not initialized')

  const callDomain = domain || getUaSipDomain(ua)
  const targetURI = `sip:${target}@${callDomain}`

  console.info(`[SIP] Calling ${targetURI}`)
  const session = ua.call(targetURI, { ...defaultCallOptions })
  return session
}

export function answerCall(session) {
  if (!session) return
  session.answer({ ...defaultCallOptions })
  console.info('[SIP] Call answered')
}

export function terminateSession(session) {
  if (!session) return
  try {
    session.terminate()
    console.info('[SIP] Session terminated')
  } catch (e) {
    console.warn('[SIP] Terminate error:', e)
  }
}

export function destroyUA(ua) {
  if (!ua) return
  try {
    // Always stop — even if isRegistered() is stale after another tab took the contact.
    ua.stop()
    console.info('[SIP] UA stopped')
  } catch (e) {
    console.warn('[SIP] UA stop error:', e)
  }
}

export { SIP_DOMAIN, SIP_WS, SIP_URI, SIP_PASSWORD }
