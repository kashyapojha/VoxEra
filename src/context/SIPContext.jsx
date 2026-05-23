import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import JsSIP from 'jssip'

const SIPContext = createContext()

export const useSIP = () => {
  const context = useContext(SIPContext)
  if (!context) {
    throw new Error('useSIP must be used within a SIPProvider')
  }
  return context
}

export const SIPProvider = ({ children }) => {
  const [ua, setUa]                   = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [currentCall, setCurrentCall]   = useState(null)
  const [callStatus, setCallStatus]     = useState('idle')
  const [callDuration, setCallDuration] = useState(0)
  const [incomingCall, setIncomingCall] = useState(null)
  const [sipLogs, setSipLogs]           = useState([])
  const [rtpMetrics, setRtpMetrics]     = useState({
    packetsSent:      0,
    packetsReceived:  0,
    bytesSent:        0,
    bytesReceived:    0,
    jitter:           0,
    rtt:              0,
    packetLoss:       0
  })

  // Use ref for call timer so it persists across renders
  const callTimerRef = useRef(null)
  const uaRef        = useRef(null)

  // ── Add SIP Log ──
  const addLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString()
    setSipLogs(prev => [...prev, { timestamp, level, message }].slice(-100))
  }, [])

  // ── Call Timer ──
  const startCallTimer = useCallback(() => {
    setCallDuration(0)
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)
  }, [])

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    setCallDuration(0)
  }, [])

  // ── Unregister ──
  const unregister = useCallback(() => {
    if (uaRef.current) {
      uaRef.current.stop()
      uaRef.current = null
      setIsRegistered(false)
      addLog('info', 'SIP unregistered')
    }
  }, [addLog])

  // ── Register ──
  const register = useCallback((config) => {
    try {
      // Stop existing UA if any
      if (uaRef.current) {
        uaRef.current.stop()
        uaRef.current = null
      }

      const socket = new JsSIP.WebSocketInterface(config.websocket)

      const configuration = {
        sockets:         [socket],
        uri:             config.uri,
        password:        config.password,
        register:        true,
        session_timers:  false,
        register_expires: 300,
        connection_recovery_min_interval: 2,
        connection_recovery_max_interval: 30,
      }

      const userAgent = new JsSIP.UA(configuration)

      userAgent.on('connecting', () => {
        addLog('info', 'Connecting to WebSocket...')
      })

      userAgent.on('connected', () => {
        addLog('success', 'WebSocket connected')
      })

      userAgent.on('disconnected', () => {
        addLog('warning', 'WebSocket disconnected')
        setIsRegistered(false)
      })

      userAgent.on('registered', () => {
        addLog('success', 'SIP registered successfully ✓')
        setIsRegistered(true)
      })

      userAgent.on('unregistered', () => {
        addLog('info', 'SIP unregistered')
        setIsRegistered(false)
      })

      userAgent.on('registrationFailed', (e) => {
        addLog('error', `Registration failed: ${e.cause}`)
        setIsRegistered(false)
      })

      userAgent.on('newRTCSession', (data) => {
        const session = data.session
        if (!session) return

        if (data.originator === 'local') {
          addLog('info', `Outgoing call to ${session.remote_identity.uri.user}`)
          setCurrentCall(session)
          setCallStatus('calling')
        } else {
          addLog('info', `Incoming call from ${session.remote_identity.uri.user}`)
          setIncomingCall(session)
          setCallStatus('incoming')
        }

        session.on('progress', () => {
          addLog('info', 'Remote party ringing...')
          setCallStatus('ringing')
        })

        session.on('confirmed', () => {
          addLog('success', 'Call connected — audio stream started')
          setCallStatus('connected')
          startCallTimer()
        })

        session.on('ended', () => {
          addLog('info', 'Call ended')
          setCallStatus('idle')
          setCurrentCall(null)
          setIncomingCall(null)
          stopCallTimer()
        })

        session.on('failed', (e) => {
          addLog('error', `Call failed: ${e.cause}`)
          setCallStatus('idle')
          setCurrentCall(null)
          setIncomingCall(null)
          stopCallTimer()
        })
      })

      userAgent.start()
      uaRef.current = userAgent
      setUa(userAgent)

      addLog('info', 'SIP User Agent initialized')

    } catch (error) {
      addLog('error', `SIP initialization error: ${error.message}`)
    }
  }, [addLog, startCallTimer, stopCallTimer])

  // ── Auto register on mount ──
  useEffect(() => {
    register({
      websocket: 'ws://172.29.175.83:8088/ws',
      uri:       'sip:1001@172.29.175.83',
      password:  '1234'
    })

    return () => {
      unregister()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Make Call ──
  const makeCall = useCallback((target) => {
    if (!uaRef.current || !isRegistered) {
      addLog('error', 'Cannot make call — not registered')
      return
    }

    const options = {
      eventHandlers: {
        progress: () => setCallStatus('ringing'),
        confirmed: () => {
          setCallStatus('connected')
          startCallTimer()
        },
        ended: () => {
          setCallStatus('idle')
          setCurrentCall(null)
          stopCallTimer()
        },
        failed: () => {
          setCallStatus('idle')
          setCurrentCall(null)
          stopCallTimer()
        }
      },
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    }

    const session = uaRef.current.call(
      `sip:${target}@172.29.175.83`,
      options
    )

    setCurrentCall(session)
    addLog('info', `Calling extension ${target}...`)
  }, [isRegistered, addLog, startCallTimer, stopCallTimer])

  // ── Answer Call ──
  const answerCall = useCallback(() => {
    if (!incomingCall) return

    incomingCall.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    })

    setCurrentCall(incomingCall)
    setIncomingCall(null)
    addLog('info', 'Incoming call answered')
  }, [incomingCall, addLog])

  // ── Reject Call ──
  const rejectCall = useCallback(() => {
    if (!incomingCall) return
    incomingCall.terminate()
    setIncomingCall(null)
    setCallStatus('idle')
    addLog('info', 'Incoming call rejected')
  }, [incomingCall, addLog])

  // ── Hangup ──
  const hangupCall = useCallback(() => {
    if (!currentCall) return
    currentCall.terminate()
    setCurrentCall(null)
    setCallStatus('idle')
    stopCallTimer()
    addLog('info', 'Call terminated')
  }, [currentCall, addLog, stopCallTimer])

  // ── Hold ──
  const holdCall = useCallback(() => {
    if (!currentCall) return
    currentCall.hold()
    setCallStatus('on-hold')
    addLog('info', 'Call placed on hold')
  }, [currentCall, addLog])

  // ── Unhold ──
  const unholdCall = useCallback(() => {
    if (!currentCall) return
    currentCall.unhold()
    setCallStatus('connected')
    addLog('info', 'Call resumed from hold')
  }, [currentCall, addLog])

  // ── Mute ──
  const muteAudio = useCallback(() => {
    if (!currentCall) return
    currentCall.mute({ audio: true })
    addLog('info', 'Microphone muted')
  }, [currentCall, addLog])

  // ── Unmute ──
  const unmuteAudio = useCallback(() => {
    if (!currentCall) return
    currentCall.unmute({ audio: true })
    addLog('info', 'Microphone unmuted')
  }, [currentCall, addLog])

  // ── Update RTP Metrics ──
  const updateRTPMetrics = useCallback((metrics) => {
    setRtpMetrics(prev => ({ ...prev, ...metrics }))
  }, [])

  const value = {
    ua,
    isRegistered,
    currentCall,
    callStatus,
    callDuration,
    incomingCall,
    sipLogs,
    rtpMetrics,
    register,
    unregister,
    makeCall,
    answerCall,
    rejectCall,
    hangupCall,
    holdCall,
    unholdCall,
    muteAudio,
    unmuteAudio,
    updateRTPMetrics
  }

  return (
    <SIPContext.Provider value={value}>
      {children}
    </SIPContext.Provider>
  )
}