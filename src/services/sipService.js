/**
 * sipService.js
 * Core JsSIP service layer — handles UA lifecycle, registration, and calls.
 * SIP endpoints come from VITE_SIP_WS_URL, VITE_SIP_URI, VITE_SIP_PASSWORD (no hardcoding).
 */

import JsSIP from 'jssip'
import { env, parseSipUri, trimEnv, hostFromUrl } from '../config/env'

const SIP_WS = env.sipWsUrl
const SIP_URI = env.sipUri
const SIP_PASSWORD = env.sipPassword
const SIP_DOMAIN = env.sipDomain

if (!SIP_WS) {
  console.error('[SIP] VITE_SIP_WS_URL is not set — WebRTC will not connect')
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

  // WebSocket transport is selected by the socket — do not add ;transport=ws to the AOR URI
  // or digest auth may not match Asterisk's REGISTER Request-URI.
  const normalizedUri = `sip:${authorizationUser}@${effectiveDomain}`
  const registrarServer = `sip:${effectiveDomain}`

  const configuration = {
    sockets:            [socket],
    uri:                normalizedUri,
    display_name:       authorizationUser,
    authorization_user: authorizationUser,
    password,
    registrar_server:   registrarServer,
    register:           true,
    session_timers:     false,
    register_expires:   300,
    connection_recovery_min_interval: 2,
    connection_recovery_max_interval: 30,
  }

  console.log('=== SIP DEBUG ===')
  console.log('URI:', configuration.uri)
  console.log('AUTH USER:', configuration.authorization_user)
  console.log('PASSWORD:', JSON.stringify(configuration.password))
  console.log('PASSWORD LENGTH:', configuration.password?.length)
  console.log('REGISTRAR:', configuration.registrar_server)
  console.log('WEBSOCKET:', websocketUrl)

  const extension = authorizationUser
  const ua = new JsSIP.UA(configuration)

  ua.on('connecting', () => {
    console.info(`[SIP] Connecting — ${uri}`)
    callbacks.onConnecting?.()
  })

  ua.on('connected', () => {
    console.info(`[SIP] WebSocket connected — ${uri}`)
    callbacks.onConnected?.()
  })

  ua.on('disconnected', (e) => {
    console.warn(`[SIP] WebSocket disconnected — ${uri}`, e.cause)
    callbacks.onDisconnected?.(e.cause)
  })

  ua.on('registered', () => {
    console.info(`[SIP] Registered — ${uri}`)
    callbacks.onRegistered?.(extension)
  })

  ua.on('unregistered', () => {
    console.info(`[SIP] Unregistered — ${uri}`)
    callbacks.onUnregistered?.()
  })

  ua.on('registrationFailed', (e) => {
    const code = e.response?.status_code
    const reason = e.response?.reason_phrase
    const detail = code ? `${code} ${reason || ''}`.trim() : String(e.cause || 'Unknown error')
    console.error(`[SIP] Registration failed — ${uri}`, detail, e.response || e)
    callbacks.onRegistrationFailed?.(detail, e)
  })

  ua.on('newRTCSession', (data) => {
    const session = data.session
    const originator = data.originator

    console.info(`[SIP] New session — originator: ${originator}`)

    if (originator === 'remote') {
      const caller = session.remote_identity?.uri?.user || 'Unknown'
      console.info(`[SIP] Incoming call from ${caller}`)
      callbacks.onIncomingCall?.(session, caller)
    } else {
      const callee = session.remote_identity?.uri?.user || 'Unknown'
      console.info(`[SIP] Outgoing call to ${callee}`)
      callbacks.onOutgoingCall?.(session, callee)
    }

    session.on('progress', (e) => {
      console.info(`[SIP] Session progress — ${e.response?.status_code}`)
      callbacks.onProgress?.(e.response?.status_code)
    })

    session.on('accepted', () => {
      console.info('[SIP] Session accepted')
      callbacks.onAccepted?.()
    })

    session.on('confirmed', () => {
      console.info('[SIP] Session confirmed — call connected')
      callbacks.onConfirmed?.(session)
    })

    session.on('ended', (e) => {
      console.info('[SIP] Session ended', e.cause)
      callbacks.onEnded?.(session, e.cause)
    })

    session.on('failed', (e) => {
      console.error('[SIP] Session failed', e.cause)
      callbacks.onFailed?.(session, e.cause)
    })

    session.on('peerconnection', (e) => {
      const pc = e.peerconnection
      console.info('[SIP] PeerConnection created')

      pc.addEventListener('track', (trackEvent) => {
        console.info('[SIP] Remote track received:', trackEvent.track.kind)
        if (trackEvent.streams && trackEvent.streams[0]) {
          const audioEl = document.getElementById('remoteAudio')
          if (audioEl) {
            audioEl.srcObject = trackEvent.streams[0]
            audioEl.play().catch((err) => {
              console.warn('[SIP] Audio autoplay blocked:', err)
              document.addEventListener('click', () => audioEl.play(), { once: true })
            })
          }
        }
      })

      callbacks.onPeerConnection?.(pc)
    })
  })

  return ua
}

export function makeCall(ua, target, domain) {
  if (!ua) throw new Error('UA not initialized')

  const callDomain = domain || hostFromUrl(SIP_WS) || SIP_DOMAIN
  const targetURI = `sip:${target}@${callDomain}`

  const options = {
    mediaConstraints: { audio: true, video: false },
    pcConfig: {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    },
    sessionTimersExpires: 0,
  }

  console.info(`[SIP] Calling ${targetURI}`)
  return ua.call(targetURI, options)
}

export function answerCall(session) {
  if (!session) return
  session.answer({
    mediaConstraints: { audio: true, video: false },
    pcConfig: {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    },
  })
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
    ua.stop()
    console.info('[SIP] UA stopped')
  } catch (e) {
    console.warn('[SIP] UA stop error:', e)
  }
}

export { SIP_DOMAIN, SIP_WS, SIP_URI, SIP_PASSWORD }
