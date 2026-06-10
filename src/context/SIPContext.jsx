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
import { primeCallNotifications, stopAllCallAlerts } from '../utils/callAlerts'

const SIPContext = createContext(null)

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
  const autoRegisterAttemptedRef = useRef(false)
  const extensionRef = useRef(extension)

  useEffect(() => {
    extensionRef.current = extension
  }, [extension])

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

  const emitCallStart = useCallback((session, { caller, callee, direction, status }) => {
    if (!socket) return
    const id = getSessionCallId(session)
    if (!id) return
    currentCallIdRef.current = id
    socket.emit('call_start', {
      id,
      caller: caller || extensionRef.current || 'Unknown',
      callee: callee || 'Unknown',
      direction,
      status,
    })
  }, [socket])

  const emitCallEstablish = useCallback((session) => {
    if (!socket) return
    const id = getSessionCallId(session)
    if (!id) return
    currentCallIdRef.current = id
    const remote = session.remote_identity?.uri?.user
    const local = extensionRef.current
    socket.emit('call_establish', {
      id,
      caller: session.direction === 'incoming' ? remote : local,
      callee: session.direction === 'incoming' ? local : remote,
      direction: session.direction === 'incoming' ? 'inbound' : 'outbound',
    })
  }, [socket])

  const emitCallEnd = useCallback((session, status) => {
    if (!socket) return
    const id = getSessionCallId(session) || currentCallIdRef.current
    if (!id) return
    const elapsed = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0
    socket.emit('call_end', { id, status, duration: elapsed })
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
    setIncomingFrom(null)
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
    setIncomingFrom(null)
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
        setIncomingCall(session)
        setIncomingFrom(caller)
        setCallStatus('incoming')
        emitCallStart(session, {
          caller,
          callee: extensionRef.current || 'Unknown',
          direction: 'inbound',
          status: 'ringing',
        })
      },
      onOutgoingCall: (session, callee) => {
        setCurrentCall(session)
        setCallStatus('calling')
        emitCallStart(session, {
          caller: extensionRef.current || 'Unknown',
          callee,
          direction: 'outbound',
          status: 'calling',
        })
      },
      onProgress: (session) => {
        setCallStatus((prev) => (prev === 'incoming' ? prev : 'ringing'))
        if (socket && session) {
          const id = getSessionCallId(session)
          if (id) {
            socket.emit('call_start', {
              id,
              caller: extensionRef.current || 'Unknown',
              callee: session.remote_identity?.uri?.user || 'Unknown',
              direction: session.direction === 'incoming' ? 'inbound' : 'outbound',
              status: 'ringing',
            })
          }
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
      onPeerConnection: (pc, session) => {
        setPeerConnection(pc)
        if (session?.direction === 'outgoing') {
          setCallStatus((prev) => (prev === 'calling' ? 'ringing' : prev))
        }
      },
    }

    const ua = createUA(callbacks, { websocketUrl, uri, password: pass })
    ua.start()
    uaRef.current = ua
  }, [
    emitCallStart,
    emitCallEnd,
    markCallConnected,
    resetCallState,
    socket,
    sipConfig.websocket,
    sipConfig.uri,
    sipConfig.password,
  ])

  const unregister = useCallback(() => {
    registerSignatureRef.current = ''
    registerInProgressRef.current = false
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
      sipMakeCall(ua, normalizedTarget, domain)
      // callStatus set in onOutgoingCall / onProgress / markCallConnected
    } catch (e) {
      console.error('[SIP] makeCall error:', e)
    }
  }, [isRegistered, callStatus])

  const answerCall = useCallback(() => {
    if (!incomingCall) return
    stopAllCallAlerts()
    sipAnswerCall(incomingCall)
    setCurrentCall(incomingCall)
    // connected state set by onAccepted / onConfirmed / onMediaConnected
  }, [incomingCall])

  const rejectCall = useCallback(() => {
    if (!incomingCall) return
    stopAllCallAlerts()
    terminateSession(incomingCall)
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
    return () => {
      destroyUA(uaRef.current)
      clearInterval(callTimerRef.current)
      clearInterval(statsTimerRef.current)
    }
  }, [])

  // Re-register after refresh so Asterisk has a live WebSocket contact for this browser.
  useEffect(() => {
    if (autoRegisterAttemptedRef.current) return
    autoRegisterAttemptedRef.current = true
    const ext = localStorage.getItem('sip_ext')
    const pass = sessionStorage.getItem('sip_pass')
    if (ext && pass) {
      console.info(`[SIP] Restoring registration for extension ${ext}`)
      register(ext, pass)
    }
  }, [register])

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
