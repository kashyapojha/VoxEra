/**
 * SipContext.jsx
 * Global React context for SIP state management.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import {
  createUA,
  makeCall as sipMakeCall,
  getUaSipDomain,
  answerCall as sipAnswerCall,
  terminateSession,
  destroyUA,
  SIP_DOMAIN,
} from '../services/sipService'
import { env, parseSipUri, trimEnv, hostFromUrl, resolveSipPassword } from '../config/env'
import { useSocket } from './SocketContext'
import {
  primeCallNotifications,
  bindAudioUnlockOnGesture,
  stopAllCallAlerts,
  startIncomingRing,
  flashDocumentTitle,
  notifyIncomingCall,
} from '../utils/callAlerts'

const SIPContext = createContext(null)

const SIP_TAB_ID_KEY = 'voxera_sip_tab_id'

function getSipTabId() {
  if (typeof sessionStorage === 'undefined') return `tab-${Date.now()}`
  let id = sessionStorage.getItem(SIP_TAB_ID_KEY)
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(SIP_TAB_ID_KEY, id)
  }
  return id
}

export const useSip = () => {
  const ctx = useContext(SIPContext)
  if (!ctx) throw new Error('useSip must be used within SIPProvider')
  return ctx
}

const defaultMetrics = {
  jitter: 0, rtt: 0, packetLoss: 0,
  packetsSent: 0, packetsReceived: 0,
  bytesSent: 0, bytesReceived: 0
}

/** SIP Call-ID shared by both parties in the same dialog */
function getSessionCallId(session) {
  if (!session) return null
  return session.request?.call_id || session.id || null
}

function syncTimerFromConnectedAt(connectedAt, callStartTimeRef, setCallDuration, callTimerRef) {
  if (!connectedAt) return
  callStartTimeRef.current = connectedAt

  const tick = () => {
    if (callStartTimeRef.current) {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000))
    }
  }
  tick()
  clearInterval(callTimerRef.current)
  callTimerRef.current = setInterval(tick, 1000)
}

export const SIPProvider = ({ children }) => {
  const { socket } = useSocket()

  const [isRegistered, setIsRegistered] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState(null)
  const [extension, setExtension] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [uaLive, setUaLive] = useState(false)

  const [sipConfig, setSipConfig] = useState({
    websocket: env.sipWsUrl,
    uri: env.sipUri,
    password: resolveSipPassword(env.sipExtension, env.sipPassword),
  })

  const [callStatus, setCallStatus] = useState('idle')
  const [callDuration, setCallDuration] = useState(0)
  const [incomingCall, setIncomingCall] = useState(null)
  const [incomingFrom, setIncomingFrom] = useState(null)
  const [pendingCaller, setPendingCaller] = useState(null)
  const [sipInvitePending, setSipInvitePending] = useState(false)
  const [sipSessionReady, setSipSessionReady] = useState(false)  // FIX: dedicated flag for JsSIP session arrival
  const [currentCall, setCurrentCall] = useState(null)

  const [rtpMetrics, setRtpMetrics] = useState(defaultMetrics)
  const [peerConnection, setPeerConnection] = useState(null)
  const [sipLogs, setSipLogs] = useState([])

  const uaRef = useRef(null)
  const callTimerRef = useRef(null)
  const statsTimerRef = useRef(null)
  const prevBytesRef = useRef(0)
  const callStartTimeRef = useRef(null)
  const currentCallIdRef = useRef(null)
  const connectedSessionRef = useRef(null)
  const currentCallRef = useRef(null)
  const registerSignatureRef = useRef('')
  const registerInProgressRef = useRef(false)
  const disconnectTimerRef = useRef(null)
  const extensionRef = useRef(extension)
  const isRegisteredRef = useRef(isRegistered)
  const socketRef = useRef(socket)
  const incomingCallRef = useRef(null)
  const pendingCallerRef = useRef(null)
  const socketAlertSentRef = useRef(false)
  const sipTabIdRef = useRef(getSipTabId())
  const isSipOwnerRef = useRef(false)
  const inviteWaitTimerRef = useRef(null)
  const outgoingWatchdogRef = useRef(null)

  useEffect(() => {
    extensionRef.current = extension
  }, [extension])

  useEffect(() => {
    isRegisteredRef.current = isRegistered
  }, [isRegistered])

  useEffect(() => {
    socketRef.current = socket
  }, [socket])

  useEffect(() => {
    currentCallRef.current = currentCall
  }, [currentCall])

  const stopCallTimer = useCallback(() => {
    clearInterval(callTimerRef.current)
    callTimerRef.current = null
    callStartTimeRef.current = null
    currentCallIdRef.current = null
    setCallDuration(0)
  }, [])

  const startCallTimer = useCallback((connectedAt) => {
    const anchor = connectedAt || callStartTimeRef.current || Date.now()
    syncTimerFromConnectedAt(anchor, callStartTimeRef, setCallDuration, callTimerRef)
  }, [])

  const notifyCalleeViaSocket = useCallback((caller, callee, id) => {
    const sock = socketRef.current
    const calleeExt = String(callee || '').trim()
    const callerExt = String(caller || extensionRef.current || 'Unknown').trim()
    if (!sock || !calleeExt || socketAlertSentRef.current) return
    socketAlertSentRef.current = true
    const payload = { id, caller: callerExt, callee: calleeExt }
    sock.emit('call_ringing', payload)
    console.info(`[SIP] call_ringing sent — ${callerExt} → ext ${calleeExt} (Asterisk ringing)`)
  }, [])

  const emitCallStart = useCallback((session, { caller, callee, direction, status }) => {
    const sock = socketRef.current
    if (!sock) return
    const id = getSessionCallId(session)
    if (!id) return
    currentCallIdRef.current = id
    sock.emit('call_start', {
      id,
      caller: caller || extensionRef.current || 'Unknown',
      callee: callee || 'Unknown',
      direction,
      status,
    })
  }, [])

  const emitCallEstablish = useCallback((session) => {
    const sock = socketRef.current
    if (!sock) return
    const id = getSessionCallId(session)
    if (!id) return
    currentCallIdRef.current = id
    const remote = session.remote_identity?.uri?.user
    const local = extensionRef.current
    sock.emit('call_establish', {
      id,
      caller: session.direction === 'incoming' ? remote : local,
      callee: session.direction === 'incoming' ? local : remote,
      direction: session.direction === 'incoming' ? 'inbound' : 'outbound',
    })
  }, [])

  const emitCallEnd = useCallback((session, status) => {
    const sock = socketRef.current
    if (!sock) return
    const id = getSessionCallId(session) || currentCallIdRef.current
    if (!id) return
    const elapsed = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0
    sock.emit('call_end', { id, status, duration: elapsed })
  }, [])

  // Only announce sip_online when this tab has a LIVE SIP WebSocket (can receive INVITE).
  useEffect(() => {
    if (!socket) return

    const announceSipOnline = () => {
      const ext = extensionRef.current
      const sock = socketRef.current
      const ua = uaRef.current
      if (!sock || !ext) return

      const live = Boolean(ua?.isConnected?.() && ua?.isRegistered?.())
      if (!live) {
        isSipOwnerRef.current = false
        sock.emit('sip_offline')
        return
      }

      isSipOwnerRef.current = true
      sock.emit('sip_online', { extension: ext, tabId: sipTabIdRef.current })
      console.info(`[SIP] sip_online sent — ext ${ext} (live SIP WebSocket, tab ${sipTabIdRef.current})`)
    }

    announceSipOnline()
    socket.on('connect', announceSipOnline)
    const id = setInterval(announceSipOnline, 12000)

    return () => {
      clearInterval(id)
      socket.off('connect', announceSipOnline)
      isSipOwnerRef.current = false
      socket.emit('sip_offline')
    }
  }, [socket, isRegistered, extension, uaLive])

  // Socket alert when another extension is calling this one (before/without SIP INVITE UI).
  useEffect(() => {
    if (!socket) return

    const onIncomingAlert = ({ caller, callee }) => {
      const myExt = String(extensionRef.current || '')
      const targetExt = String(callee || '')
      if (!caller || !targetExt || targetExt !== myExt) return
      if (incomingCallRef.current) return

      const ua = uaRef.current
      const sipLive = Boolean(ua?.isConnected?.() && ua?.isRegistered?.())
      if (!sipLive || !isSipOwnerRef.current) {
        console.warn('[SIP] Ignoring socket alert — this tab is not the live SIP owner for the extension')
        return
      }

      // Heads-up only — Answer UI opens when JsSIP delivers the real INVITE (onIncomingCall).
      console.info(`[SIP] Socket heads-up — ${caller} → ext ${callee} (SIP INVITE should follow)`)
      clearTimeout(inviteWaitTimerRef.current)
      inviteWaitTimerRef.current = setTimeout(() => {
        if (incomingCallRef.current) return
        console.warn(
          `[SIP] No SIP INVITE received within 10s after heads-up — ${caller} → ext ${callee}. ` +
          'On EC2 run: docker exec voxera-asterisk asterisk -rx "pjsip show contacts" (both 1001 and 1002 must show WSS contacts).'
        )
      }, 10_000)
    }

    const onCallEnded = () => {
      pendingCallerRef.current = null
      setPendingCaller(null)
      setSipInvitePending(false)
      stopAllCallAlerts()
    }

    const onSipOwnerLost = ({ extension: lostExt }) => {
      if (String(lostExt || '') !== String(extensionRef.current || '')) return
      isSipOwnerRef.current = false
      pendingCallerRef.current = null
      setPendingCaller(null)
      setSipInvitePending(false)
      stopAllCallAlerts()
      setRegistrationError(
        'Another browser tab took this extension — close other tabs or Unregister there, then Register here'
      )
    }

    socket.on('sip_incoming_alert', onIncomingAlert)
    socket.on('call_end_broadcast', onCallEnded)
    socket.on('sip_owner_lost', onSipOwnerLost)
    return () => {
      socket.off('sip_incoming_alert', onIncomingAlert)
      socket.off('call_end_broadcast', onCallEnded)
      socket.off('sip_owner_lost', onSipOwnerLost)
    }
  }, [socket])

  // Server-authoritative connected time — keeps both ends in sync
  useEffect(() => {
    if (!socket) return

    const onCallConnected = ({ id, connectedAt }) => {
      if (!id || id !== currentCallIdRef.current) return
      if (!connectedAt) return
      startCallTimer(connectedAt)
    }

    socket.on('call_connected', onCallConnected)
    return () => socket.off('call_connected', onCallConnected)
  }, [socket, startCallTimer])

  const startStatsPolling = useCallback((pc) => {
    if (!pc) return
    prevBytesRef.current = 0

    statsTimerRef.current = setInterval(async () => {
      try {
        const report = await pc.getStats()
        const metrics = { ...defaultMetrics }

        report.forEach((r) => {
          if (r.type === 'inbound-rtp' && r.kind === 'audio') {
            metrics.jitter = Math.round((r.jitter || 0) * 1000)
            metrics.packetsReceived = r.packetsReceived || 0
            metrics.bytesReceived = r.bytesReceived || 0
            const lost = r.packetsLost || 0
            const total = metrics.packetsReceived + lost
            metrics.packetLoss = total > 0 ? parseFloat(((lost / total) * 100).toFixed(2)) : 0
            const delta = metrics.bytesReceived - prevBytesRef.current
            metrics.bitrate = delta > 0 ? Math.round(delta * 8 / 1000) : 0
            prevBytesRef.current = metrics.bytesReceived
          }
          if (r.type === 'outbound-rtp' && r.kind === 'audio') {
            metrics.packetsSent = r.packetsSent || 0
            metrics.bytesSent = r.bytesSent || 0
          }
          if (r.type === 'remote-inbound-rtp' && r.kind === 'audio') {
            if (r.roundTripTime !== undefined) metrics.rtt = Math.round(r.roundTripTime * 1000)
          }
          if (r.type === 'candidate-pair' && r.state === 'succeeded') {
            if (metrics.rtt === 0 && r.currentRoundTripTime) {
              metrics.rtt = Math.round(r.currentRoundTripTime * 1000)
            }
          }
        })

        setRtpMetrics(metrics)
      } catch (e) {
        console.warn('[Stats] getStats error:', e)
      }
    }, 1000)
  }, [])

  const stopStatsPolling = useCallback(() => {
    clearInterval(statsTimerRef.current)
    statsTimerRef.current = null
    setRtpMetrics(defaultMetrics)
    prevBytesRef.current = 0
  }, [])

  const resetCallState = useCallback(() => {
    stopAllCallAlerts()
    connectedSessionRef.current = null
    setCallStatus('idle')
    setCurrentCall(null)
    setIncomingCall(null)
    setSipSessionReady(false)   // FIX: clear session ready flag on reset
    setIncomingFrom(null)
    setPendingCaller(null)
    setSipInvitePending(false)
    incomingCallRef.current = null
    pendingCallerRef.current = null
    socketAlertSentRef.current = false
    clearTimeout(outgoingWatchdogRef.current)
    outgoingWatchdogRef.current = null
    stopCallTimer()
    stopStatsPolling()
    setPeerConnection(null)
  }, [stopCallTimer, stopStatsPolling])

  const markCallConnected = useCallback((session) => {
    if (!session || connectedSessionRef.current === session) return
    connectedSessionRef.current = session

    setCurrentCall(session)
    setCallStatus('connected')
    setIncomingCall(null)
    setSipSessionReady(false)   // FIX: clear when call moves to connected state
    setIncomingFrom(null)
    setPendingCaller(null)
    incomingCallRef.current = null
    pendingCallerRef.current = null
    emitCallEstablish(session)

    const pc = session.connection
    if (pc) {
      setPeerConnection(pc)
      startStatsPolling(pc)
    }

    // Local timer fallback if socket sync is delayed (each SIP leg has its own Call-ID).
    if (!callStartTimeRef.current) {
      startCallTimer(Date.now())
    }
  }, [emitCallEstablish, startStatsPolling, startCallTimer])

  const register = useCallback((ext, password, domainOverride) => {
    const websocketUrl = trimEnv(sipConfig.websocket) || env.sipWsUrl
    let uri = trimEnv(sipConfig.uri) || env.sipUri
    const trimmedExt = ext ? trimEnv(ext) : parseSipUri(uri).extension
    const explicitPass =
      trimEnv(password) ||
      trimEnv(sipConfig.password) ||
      (sessionStorage.getItem('sip_ext') === trimmedExt ? sessionStorage.getItem('sip_pass') : '') ||
      ''
    const pass = resolveSipPassword(trimmedExt, explicitPass)

    if (ext) {
      const configuredUri = trimEnv(sipConfig.uri) || env.sipUri
      // WebSocket host must match Asterisk default_realm / ASTERISK_EXTERNAL_IP.
      const domain =
        hostFromUrl(websocketUrl) ||
        trimEnv(domainOverride) ||
        parseSipUri(configuredUri).domain ||
        env.sipDomain
      uri = `sip:${trimmedExt}@${domain}`
    }

    if (!uri || !pass) {
      setRegistrationError('SIP URI and password are required (set in .env or Settings)')
      return
    }

    const signature = `${uri}|${pass}`
    const existingUa = uaRef.current
    if (
      existingUa
      && registerSignatureRef.current === signature
      && (existingUa.isRegistered?.() || registerInProgressRef.current)
    ) {
      console.info('[SIP] Already registered or registering with same credentials — skip')
      return
    }

    const sock = socketRef.current
    if (sock) {
      isSipOwnerRef.current = false
      sock.emit('sip_offline')
    }

    if (existingUa) {
      destroyUA(existingUa)
      uaRef.current = null
    }

    registerSignatureRef.current = signature
    registerInProgressRef.current = true
    setIsRegistering(true)
    setRegistrationError(null)
    setConnectionStatus('connecting')
    setUaLive(false)

    if (trimmedExt && pass) {
      localStorage.setItem('sip_ext', trimmedExt)
      sessionStorage.setItem('sip_pass', pass)
    }

    const callbacks = {
      onConnecting: () => setConnectionStatus('connecting'),
      onConnected: () => {
        clearTimeout(disconnectTimerRef.current)
        disconnectTimerRef.current = null
        setConnectionStatus('connected')
      },
      onDisconnected: (cause) => {
        console.warn('[SIP] WebSocket dropped, JsSIP reconnecting…', cause || 'no cause')
        setUaLive(false)
        setConnectionStatus('connecting')
        clearTimeout(disconnectTimerRef.current)
        disconnectTimerRef.current = setTimeout(() => {
          const ua = uaRef.current
          if (ua && !ua.isConnected?.()) {
            setIsRegistered(false)
            setConnectionStatus('disconnected')
            setRegistrationError(
              'SIP WebSocket lost — register again on this browser to receive calls'
            )
          }
        }, 12000)
      },
      onRegistered: (registeredExt) => {
        registerInProgressRef.current = false
        setIsRegistered(true)
        setIsRegistering(false)
        setConnectionStatus('connected')
        setUaLive(true)
        setExtension(registeredExt)
        setRegistrationError(null)
        localStorage.setItem('sip_ext', registeredExt)
        localStorage.setItem('sip_registered', 'true')
        primeCallNotifications()
        console.info(`[SIP] Extension ${registeredExt} ready to receive calls on this browser`)
        console.info(
          `[SIP] Server check — while this tab stays open, run on EC2: ` +
          `docker exec voxera-asterisk asterisk -rx "pjsip show contacts" (must list ${registeredExt}/sip:${registeredExt}@...)`
        )
      },
      onUnregistered: () => {
        registerInProgressRef.current = false
        setIsRegistered(false)
        setIsRegistering(false)
        setUaLive(false)
        setConnectionStatus('disconnected')
        setExtension('')
        localStorage.removeItem('sip_registered')
        localStorage.removeItem('sip_ext')
      },
      onRegistrationFailed: (detail) => {
        registerInProgressRef.current = false
        setIsRegistered(false)
        setIsRegistering(false)
        setUaLive(false)
        setConnectionStatus('disconnected')
        const attemptedExt = trimEnv(ext) || extensionRef.current || parseSipUri(trimEnv(sipConfig.uri) || env.sipUri).extension
        let msg = `Registration failed: ${detail}`
        if (String(detail).startsWith('404')) {
          msg += ` — Registrar AOR mismatch (server needs aors=${attemptedExt || 'ext'} and AOR object loaded).`
        } else if (String(detail).includes('Timeout')) {
          msg += ' — Asterisk may have sent 200 OK without binding contact (rebuild asterisk; check pjsip show contacts).'
        } else if (String(detail).startsWith('403')) {
          msg += ' — Forbidden (wrong password or endpoint not allowed to register).'
        } else if (String(detail).startsWith('401')) {
          msg += attemptedExt
            ? ` — Digest auth failed for extension ${attemptedExt} (password is usually ${attemptedExt}; SIP URI host must match server realm; ensure chan_sip is unloaded).`
            : ' — Digest auth failed (check extension password and that SIP URI host matches server realm).'
        } else if (String(detail).startsWith('500')) {
          msg += attemptedExt
            ? ` — Server error (often auth object name mismatch: need auth=${attemptedExt}-auth on server).`
            : ' — Server error (check PJSIP auth object names on server).'
        }
        setRegistrationError(msg)
      },
      onIncomingCall: (session, caller) => {
        clearTimeout(inviteWaitTimerRef.current)
        incomingCallRef.current = session
        setIncomingCall(session)
        setSipSessionReady(true)    // FIX: set synchronously — enables Answer button immediately
        setIncomingFrom(caller)
        pendingCallerRef.current = null
        setPendingCaller(null)
        setSipInvitePending(false)
        setRegistrationError(null)
        setCallStatus('incoming')
        startIncomingRing()
        flashDocumentTitle(`Call from ${caller}`)
        notifyIncomingCall(caller)
        console.info(`[SIP] Incoming call UI — ${caller} → ext ${extensionRef.current}`)
        emitCallStart(session, {
          caller,
          callee: extensionRef.current || 'Unknown',
          direction: 'inbound',
          status: 'ringing',
        })
      },
      onOutgoingCall: (session, callee) => {
        socketAlertSentRef.current = false
        setCurrentCall(session)
        setCallStatus('calling')
        const caller = extensionRef.current || 'Unknown'
        emitCallStart(session, {
          caller,
          callee,
          direction: 'outbound',
          status: 'calling',
        })
        clearTimeout(outgoingWatchdogRef.current)
        outgoingWatchdogRef.current = setTimeout(() => {
          if (connectedSessionRef.current || !currentCallRef.current) return
          console.error('[SIP] Call timeout — no SIP progress from Asterisk within 25s')
          setRegistrationError(
            'Call timed out — INVITE may not have reached Asterisk. ' +
            'Unregister → Register both extensions, confirm pjsip show contacts, then retry.'
          )
        }, 25_000)
      },
      onProgress: (session, code) => {
        clearTimeout(outgoingWatchdogRef.current)
        setCallStatus((prev) => (prev === 'incoming' ? prev : 'ringing'))
        const sock = socketRef.current
        if (!sock || !session) return
        const id = getSessionCallId(session)
        if (!id) return
        const remote = session.remote_identity?.uri?.user || 'Unknown'
        const local = extensionRef.current || 'Unknown'
        const isRinging = code === 180 || code === 183
        sock.emit('call_start', {
          id,
          caller: session.direction === 'incoming' ? remote : local,
          callee: session.direction === 'incoming' ? local : remote,
          direction: session.direction === 'incoming' ? 'inbound' : 'outbound',
          status: isRinging ? 'ringing' : 'calling',
        })
        // Notify callee only on real SIP ringing responses from Asterisk (not local WebRTC events).
        if (session.direction === 'outgoing' && (code === 180 || code === 183)) {
          notifyCalleeViaSocket(local, remote, id)
        }
      },
      onAccepted: (session) => markCallConnected(session),
      onConfirmed: (session) => markCallConnected(session),
      onMediaConnected: (session) => markCallConnected(session),
      onEnded: (session) => {
        emitCallEnd(session || currentCallRef.current, 'completed')
        resetCallState()
      },
      onFailed: (session, cause) => {
        emitCallEnd(session || currentCallRef.current, cause === 'Rejected' ? 'missed' : 'failed')
        resetCallState()
      },
      onPeerConnection: (pc) => {
        setPeerConnection(pc)
      },
    }

    const ua = createUA(callbacks, { websocketUrl, uri, password: pass })
    ua.start()
    uaRef.current = ua
  }, [
    emitCallStart,
    emitCallEnd,
    notifyCalleeViaSocket,
    markCallConnected,
    resetCallState,
    sipConfig.websocket,
    sipConfig.uri,
    sipConfig.password,
  ])

  const unregister = useCallback(() => {
    registerSignatureRef.current = ''
    registerInProgressRef.current = false
    const sock = socketRef.current
    if (sock) {
      isSipOwnerRef.current = false
      sock.emit('sip_offline')
    }
    if (uaRef.current) {
      destroyUA(uaRef.current)
      uaRef.current = null
    }
    resetCallState()
    setIsRegistered(false)
    setIsRegistering(false)
    setExtension('')
    setConnectionStatus('disconnected')
    localStorage.removeItem('sip_registered')
    localStorage.removeItem('sip_ext')
    sessionStorage.removeItem('sip_pass')
    setUaLive(false)
  }, [resetCallState])

  const makeCall = useCallback((target) => {
    const ua = uaRef.current
    if (!ua || !isRegistered) return
    if (!ua.isConnected?.() || !ua.isRegistered?.()) {
      setRegistrationError('SIP not connected — register again before calling')
      return
    }
    if (callStatus !== 'idle') return
    const normalizedTarget = trimEnv(target)
    if (normalizedTarget === extensionRef.current) {
      setRegistrationError(`Cannot call your own extension (${normalizedTarget})`)
      return
    }
    try {
      const domain = getUaSipDomain(ua)
      // Socket alert is sent from onOutgoingCall once JsSIP has created the SIP session.
      sipMakeCall(ua, normalizedTarget, domain)
      // callStatus set in onOutgoingCall / onProgress / markCallConnected
    } catch (e) {
      console.error('[SIP] makeCall error:', e)
    }
  }, [isRegistered, callStatus, notifyCalleeViaSocket])

  const answerCall = useCallback(() => {
    const session = incomingCallRef.current || incomingCall
    if (!session) return
    stopAllCallAlerts()
    sipAnswerCall(session)
    setCurrentCall(session)
    // connected state set by onAccepted / onConfirmed / onMediaConnected
  }, [incomingCall])

  const rejectCall = useCallback(() => {
    const session = incomingCallRef.current || incomingCall
    stopAllCallAlerts()
    if (session) {
      terminateSession(session)
      return
    }
    pendingCallerRef.current = null
    setPendingCaller(null)
    setSipInvitePending(false)
  }, [incomingCall])

  const hangupCall = useCallback(() => {
    if (!currentCall) return
    terminateSession(currentCall)
  }, [currentCall])

  const holdCall = useCallback(() => {
    if (!currentCall) return
    currentCall.hold()
    setCallStatus('on-hold')
  }, [currentCall])

  const unholdCall = useCallback(() => {
    if (!currentCall) return
    currentCall.unhold()
    setCallStatus('connected')
  }, [currentCall])

  const muteAudio = useCallback(() => {
    if (!currentCall) return
    currentCall.mute({ audio: true })
  }, [currentCall])

  const unmuteAudio = useCallback(() => {
    if (!currentCall) return
    currentCall.unmute({ audio: true })
  }, [currentCall])

  useEffect(() => {
    bindAudioUnlockOnGesture()
    return () => {
      destroyUA(uaRef.current)
      clearInterval(callTimerRef.current)
      clearInterval(statsTimerRef.current)
    }
  }, [])

  // Detect dead WebSocket while UI still shows registered.
  useEffect(() => {
    const id = setInterval(() => {
      const ua = uaRef.current
      if (!ua || !isRegistered) return
      const live = Boolean(ua.isConnected?.() && ua.isRegistered?.())
      setUaLive(live)
      if (!live) {
        setIsRegistered(false)
        setRegistrationError('SIP connection lost — click Register on Softphone to receive calls')
      }
    }, 8000)
    return () => clearInterval(id)
  }, [isRegistered])

  const sipOnline = isRegistered && connectionStatus === 'connected' && uaLive

  const value = {
    isRegistered,
    sipOnline,
    isRegistering,
    registrationError,
    extension,
    connectionStatus,
    register,
    unregister,
    sipConfig,
    setSipConfig,
    callStatus,
    callDuration,
    currentCall,
    incomingCall,
    incomingFrom,
    pendingCaller,
    sipInvitePending,
    sipSessionReady,    // FIX: expose to consumers
    peerConnection,
    makeCall,
    answerCall,
    rejectCall,
    hangupCall,
    holdCall,
    unholdCall,
    muteAudio,
    unmuteAudio,
    rtpMetrics,
    sipLogs,
    setSipLogs,
  }

  return (
    <SIPContext.Provider value={value}>
      {children}
    </SIPContext.Provider>
  )
}