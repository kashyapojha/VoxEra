/**
 * sipService.js
 * Core JsSIP service layer — handles UA lifecycle, registration, and calls.
 * Completely stateless — state is managed by SipContext.
 *
 * This layer separates JsSIP logic from React state management.
 */

import JsSIP from 'jssip'

// Read only domain and websocket from env — no credentials
const SIP_DOMAIN = import.meta.env.VITE_SIP_DOMAIN || '172.29.175.83'
const SIP_WS     = import.meta.env.VITE_SIP_WS     || 'ws://172.29.175.83:8088/ws'

/**
 * Build JsSIP UA configuration dynamically from user input.
 * Each user gets their own UA instance with their own credentials.
 *
 * @param {string} extension - SIP extension e.g. '1001'
 * @param {string} password  - SIP password
 * @param {object} callbacks - event handlers from SipContext
 */
export function createUA(extension, password, callbacks) {
  const socket = new JsSIP.WebSocketInterface(SIP_WS)

  const configuration = {
    sockets:          [socket],
    uri:              `sip:${extension}@${SIP_DOMAIN}`,
    password:         password,
    register:         true,
    session_timers:   false,
    register_expires: 300,
    connection_recovery_min_interval: 2,
    connection_recovery_max_interval: 30,
  }

  const ua = new JsSIP.UA(configuration)

  // ── WebSocket events ──
  ua.on('connecting', () => {
    console.info(`[SIP] Connecting — ext ${extension}`)
    callbacks.onConnecting?.()
  })

  ua.on('connected', () => {
    console.info(`[SIP] WebSocket connected — ext ${extension}`)
    callbacks.onConnected?.()
  })

  ua.on('disconnected', (e) => {
    console.warn(`[SIP] WebSocket disconnected — ext ${extension}`, e.cause)
    callbacks.onDisconnected?.(e.cause)
  })

  // ── Registration events ──
  ua.on('registered', (e) => {
    console.info(`[SIP] Registered — ext ${extension}`)
    callbacks.onRegistered?.(extension)
  })

  ua.on('unregistered', () => {
    console.info(`[SIP] Unregistered — ext ${extension}`)
    callbacks.onUnregistered?.()
  })

  ua.on('registrationFailed', (e) => {
    console.error(`[SIP] Registration failed — ext ${extension}`, e.cause)
    callbacks.onRegistrationFailed?.(e.cause)
  })

  // ── Session events ──
  ua.on('newRTCSession', (data) => {
    const session   = data.session
    const originator = data.originator // 'local' | 'remote'

    console.info(`[SIP] New session — originator: ${originator}`)

    if (originator === 'remote') {
      // Incoming call
      const caller = session.remote_identity?.uri?.user || 'Unknown'
      console.info(`[SIP] Incoming call from ${caller}`)
      callbacks.onIncomingCall?.(session, caller)
    } else {
      // Outgoing call
      const callee = session.remote_identity?.uri?.user || 'Unknown'
      console.info(`[SIP] Outgoing call to ${callee}`)
      callbacks.onOutgoingCall?.(session, callee)
    }

    // ── Per-session events ──
    session.on('progress', (e) => {
      console.info(`[SIP] Session progress — ${e.response?.status_code}`)
      callbacks.onProgress?.(e.response?.status_code)
    })

    session.on('accepted', (e) => {
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

      // Attach remote audio stream to DOM audio element
      pc.addEventListener('track', (trackEvent) => {
        console.info('[SIP] Remote track received:', trackEvent.track.kind)
        if (trackEvent.streams && trackEvent.streams[0]) {
          const audioEl = document.getElementById('remoteAudio')
          if (audioEl) {
            audioEl.srcObject = trackEvent.streams[0]
            audioEl.play().catch(err => {
              console.warn('[SIP] Audio autoplay blocked:', err)
              // Handle autoplay policy — resume on user gesture
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

/**
 * Make an outgoing call.
 * @param {JsSIP.UA} ua        - active UA instance
 * @param {string}   target    - extension to call e.g. '1002'
 * @param {string}   domain    - SIP domain
 */
export function makeCall(ua, target, domain = SIP_DOMAIN) {
  if (!ua) throw new Error('UA not initialized')

  const targetURI = `sip:${target}@${domain}`

  const options = {
    mediaConstraints: { audio: true, video: false },
    pcConfig: {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    },
    sessionTimersExpires: 0,
  }

  console.info(`[SIP] Calling ${targetURI}`)
  return ua.call(targetURI, options)
}

/**
 * Answer an incoming call.
 * @param {JsSIP.RTCSession} session - incoming session
 */
export function answerCall(session) {
  if (!session) return
  session.answer({
    mediaConstraints: { audio: true, video: false },
    pcConfig: {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    }
  })
  console.info('[SIP] Call answered')
}

/**
 * Terminate a session (hangup or reject).
 * @param {JsSIP.RTCSession} session
 */
export function terminateSession(session) {
  if (!session) return
  try {
    session.terminate()
    console.info('[SIP] Session terminated')
  } catch (e) {
    console.warn('[SIP] Terminate error:', e)
  }
}

/**
 * Stop and destroy a UA instance.
 * @param {JsSIP.UA} ua
 */
export function destroyUA(ua) {
  if (!ua) return
  try {
    ua.stop()
    console.info('[SIP] UA stopped')
  } catch (e) {
    console.warn('[SIP] UA stop error:', e)
  }
}

export { SIP_DOMAIN, SIP_WS }