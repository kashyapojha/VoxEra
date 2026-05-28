/**
 * SipContext.jsx
 * Global React context for SIP state management.
 * Manages UA instance, registration, sessions, and call state.
 *
 * Replaces the old SIPContext that used hardcoded .env credentials.
 * Now supports dynamic multi-user registration from UI input.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import {
  createUA,
  makeCall as sipMakeCall,
  answerCall as sipAnswerCall,
  terminateSession,
  destroyUA,
  SIP_DOMAIN
} from '../services/sipService'

const SipContext = createContext(null)

export const useSip = () => {
  const ctx = useContext(SipContext)
  if (!ctx) throw new Error('useSip must be used within SipProvider')
  return ctx
}

// ── Default RTP metrics ──
const defaultMetrics = {
  jitter: 0, rtt: 0, packetLoss: 0,
  packetsSent: 0, packetsReceived: 0,
  bytesSent: 0, bytesReceived: 0
}

export const SipProvider = ({ children }) => {
  // ── Registration state ──
  const [isRegistered,    setIsRegistered]    = useState(false)
  const [isRegistering,   setIsRegistering]   = useState(false)
  const [registrationError, setRegistrationError] = useState(null)
  const [extension,       setExtension]       = useState(() => localStorage.getItem('sip_ext') || '')
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected | connecting | connected

  // ── Call state ──
  const [callStatus,   setCallStatus]   = useState('idle') // idle | calling | ringing | incoming | connected | on-hold | ended
  const [callDuration, setCallDuration] = useState(0)
  const [incomingCall, setIncomingCall] = useState(null)  // incoming JsSIP session
  const [incomingFrom, setIncomingFrom] = useState(null)  // caller extension
  const [currentCall,  setCurrentCall]  = useState(null)  // active JsSIP session

  // ── QoS metrics ──
  const [rtpMetrics, setRtpMetrics] = useState(defaultMetrics)
  const [peerConnection, setPeerConnection] = useState(null)

  // ── SIP logs ──
  const [sipLogs, setSipLogs] = useState([])

  // ── Refs ──
  const uaRef        = useRef(null)
  const callTimerRef = useRef(null)
  const statsTimerRef = useRef(null)
  const prevBytesRef  = useRef(0)

  // ── Call Timer ──
  const startCallTimer = useCallback(() => {
    setCallDuration(0)
    callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
  }, [])

  const stopCallTimer = useCallback(() => {
    clearInterval(callTimerRef.current)
    callTimerRef.current = null
    setCallDuration(0)
  }, [])

  // ── RTP Stats Polling ──
  const startStatsPolling = useCallback((pc) => {
    if (!pc) return
    prevBytesRef.current = 0

    statsTimerRef.current = setInterval(async () => {
      try {
        const report = await pc.getStats()
        const metrics = { ...defaultMetrics }

        report.forEach(r => {
          if (r.type === 'inbound-rtp' && r.kind === 'audio') {
            metrics.jitter          = Math.round((r.jitter || 0) * 1000)
            metrics.packetsReceived = r.packetsReceived || 0
            metrics.bytesReceived   = r.bytesReceived   || 0
            const lost  = r.packetsLost || 0
            const total = metrics.packetsReceived + lost
            metrics.packetLoss = total > 0 ? parseFloat(((lost / total) * 100).toFixed(2)) : 0
            const delta = metrics.bytesReceived - prevBytesRef.current
            metrics.bitrate = delta > 0 ? Math.round(delta * 8 / 1000) : 0
            prevBytesRef.current = metrics.bytesReceived
          }
          if (r.type === 'outbound-rtp' && r.kind === 'audio') {
            metrics.packetsSent = r.packetsSent || 0
            metrics.bytesSent   = r.bytesSent   || 0
          }
          if (r.type === 'remote-inbound-rtp' && r.kind === 'audio') {
            if (r.roundTripTime !== undefined) metrics.rtt = Math.round(r.roundTripTime * 1000)
          }
          if (r.type === 'candidate-pair' && r.state === 'succeeded') {
            if (metrics.rtt === 0 && r.currentRoundTripTime) metrics.rtt = Math.round(r.currentRoundTripTime * 1000)
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

  // ── Reset call state ──
  const resetCallState = useCallback(() => {
    setCallStatus('idle')
    setCurrentCall(null)
    setIncomingCall(null)
    setIncomingFrom(null)
    stopCallTimer()
    stopStatsPolling()
    setPeerConnection(null)
  }, [stopCallTimer, stopStatsPolling])

  // ── REGISTER ──
  const register = useCallback((ext, password) => {
    if (!ext || !password) {
      setRegistrationError('Extension and password are required')
      return
    }

    // Destroy existing UA
    if (uaRef.current) destroyUA(uaRef.current)

    setIsRegistering(true)
    setRegistrationError(null)
    setConnectionStatus('connecting')

    const callbacks = {
      onConnecting:  () => setConnectionStatus('connecting'),
      onConnected:   () => setConnectionStatus('connected'),
      onDisconnected:(cause) => {
        setConnectionStatus('disconnected')
        setIsRegistered(false)
      },
      onRegistered: (ext) => {
        setIsRegistered(true)
        setIsRegistering(false)
        setExtension(ext)
        setRegistrationError(null)
        localStorage.setItem('sip_ext', ext)
        localStorage.setItem('sip_registered', 'true')
      },
      onUnregistered: () => {
        setIsRegistered(false)
        setIsRegistering(false)
        localStorage.removeItem('sip_registered')
      },
      onRegistrationFailed: (cause) => {
        setIsRegistered(false)
        setIsRegistering(false)
        setRegistrationError(`Registration failed: ${cause}`)
      },
      onIncomingCall: (session, caller) => {
        setIncomingCall(session)
        setIncomingFrom(caller)
        setCallStatus('incoming')
      },
      onOutgoingCall: (session) => {
        setCurrentCall(session)
        setCallStatus('calling')
      },
      onProgress: (code) => {
        if (callStatus !== 'incoming') setCallStatus('ringing')
      },
      onAccepted: () => {},
      onConfirmed: (session) => {
        setCurrentCall(session)
        setCallStatus('connected')
        setIncomingCall(null)
        setIncomingFrom(null)
        startCallTimer()
        // Start QoS monitoring after call confirmed
        const pc = session.connection
        if (pc) {
          setPeerConnection(pc)
          startStatsPolling(pc)
        }
      },
      onEnded: () => resetCallState(),
      onFailed: (cause) => {
        console.error('[SIP] Call failed:', cause)
        resetCallState()
      },
      onPeerConnection: (pc) => {
        console.info('[SIP] PeerConnection ready')
        setPeerConnection(pc)
      }
    }

    const ua = createUA(ext, password, callbacks)
    ua.start()
    uaRef.current = ua
  }, [startCallTimer, startStatsPolling, resetCallState])

  // ── UNREGISTER ──
  const unregister = useCallback(() => {
    if (uaRef.current) {
      destroyUA(uaRef.current)
      uaRef.current = null
    }
    resetCallState()
    setIsRegistered(false)
    setIsRegistering(false)
    setConnectionStatus('disconnected')
    localStorage.removeItem('sip_registered')
  }, [resetCallState])

  // ── MAKE CALL ──
  const makeCall = useCallback((target) => {
    if (!uaRef.current || !isRegistered) return
    if (callStatus !== 'idle') return
    try {
      const session = sipMakeCall(uaRef.current, target, SIP_DOMAIN)
      setCurrentCall(session)
      setCallStatus('calling')
    } catch (e) {
      console.error('[SIP] makeCall error:', e)
    }
  }, [isRegistered, callStatus])

  // ── ANSWER CALL ──
  const answerCall = useCallback(() => {
    if (!incomingCall) return
    sipAnswerCall(incomingCall)
    setCurrentCall(incomingCall)
    setCallStatus('connected')
    setIncomingCall(null)
    setIncomingFrom(null)
    startCallTimer()
  }, [incomingCall, startCallTimer])

  // ── REJECT CALL ──
  const rejectCall = useCallback(() => {
    if (!incomingCall) return
    terminateSession(incomingCall)
    resetCallState()
  }, [incomingCall, resetCallState])

  // ── HANGUP ──
  const hangupCall = useCallback(() => {
    if (!currentCall) return
    terminateSession(currentCall)
    resetCallState()
  }, [currentCall, resetCallState])

  // ── HOLD ──
  const holdCall = useCallback(() => {
    if (!currentCall) return
    currentCall.hold()
    setCallStatus('on-hold')
  }, [currentCall])

  // ── UNHOLD ──
  const unholdCall = useCallback(() => {
    if (!currentCall) return
    currentCall.unhold()
    setCallStatus('connected')
  }, [currentCall])

  // ── MUTE ──
  const muteAudio = useCallback(() => {
    if (!currentCall) return
    currentCall.mute({ audio: true })
  }, [currentCall])

  // ── UNMUTE ──
  const unmuteAudio = useCallback(() => {
    if (!currentCall) return
    currentCall.unmute({ audio: true })
  }, [currentCall])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      destroyUA(uaRef.current)
      clearInterval(callTimerRef.current)
      clearInterval(statsTimerRef.current)
    }
  }, [])

  const value = {
    // Registration
    isRegistered,
    isRegistering,
    registrationError,
    extension,
    connectionStatus,
    register,
    unregister,
    // Call state
    callStatus,
    callDuration,
    currentCall,
    incomingCall,
    incomingFrom,
    peerConnection,
    // Call actions
    makeCall,
    answerCall,
    rejectCall,
    hangupCall,
    holdCall,
    unholdCall,
    muteAudio,
    unmuteAudio,
    // Metrics
    rtpMetrics,
    // Logs
    sipLogs,
    setSipLogs,
  }

  return (
    <SipContext.Provider value={value}>
      {children}
    </SipContext.Provider>
  )
}