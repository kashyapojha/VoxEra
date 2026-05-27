import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import JsSIP from 'jssip'
import { useSocket } from './SocketContext'

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
  // Audio element refs
  const remoteAudioRef = useRef(null)
  const localAudioRef = useRef(null)
  // Map sessions to their pc event handlers for cleanup
  const sessionHandlersRef = useRef(new Map())
  const rtpPollRef = useRef(new Map())
  // Flag when autoplay was blocked and we need a user gesture to resume
  const autoplayBlockedRef = useRef(false)
  const resumeListenerRef = useRef(null)
  const notificationRef = useRef(null)
  const audioCtxRef = useRef(null)
  const oscillatorRef = useRef(null)

  // ── Add SIP Log ──
  const addLog = useCallback((level, message) => {
    const now = new Date()
    const timestamp = now.toISOString()
    const time = now.toLocaleTimeString()
    setSipLogs(prev => [...prev, { timestamp, time, level, message }].slice(-100))
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
      try {
        if (typeof uaRef.current.unregister === 'function') {
          uaRef.current.unregister()
          addLog('info', 'SIP unregister request sent')
        } else {
          // Fallback: stop UA if unregister not available
          uaRef.current.stop()
          uaRef.current = null
          addLog('info', 'SIP UA stopped (no unregister API)')
        }
        setIsRegistered(false)
      } catch (err) {
        addLog('error', `Error during unregister: ${err.message}`)
      }
    }
  }, [addLog])

  // ── Helpers: attach / cleanup audio for a session's PeerConnection ──
  const cleanupSessionAudio = useCallback((session) => {
    try {
      if (!session) return
      const handlers = sessionHandlersRef.current.get(session)
      const pc = session.connection
      if (handlers && pc) {
        if (handlers.ontrack) pc.removeEventListener('track', handlers.ontrack)
        if (handlers.onaddstream) pc.removeEventListener('addstream', handlers.onaddstream)
      }

      // Clear audio elements if they reference this session's streams
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null
      }
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = null
      }

      sessionHandlersRef.current.delete(session)
    } catch (err) {
      addLog('warning', `Error cleaning session audio: ${err.message}`)
    }
  }, [addLog])

  const tryPlayAudio = useCallback(async (audioEl) => {
    if (!audioEl) return
    try {
      await audioEl.play()
      autoplayBlockedRef.current = false
    } catch (err) {
      autoplayBlockedRef.current = true
      addLog('warning', 'Autoplay prevented by browser — user gesture required to enable audio')
      // Install a one-time resume listener on user gesture
      if (!resumeListenerRef.current) {
        resumeListenerRef.current = () => {
          try {
            audioEl.play().catch(() => {})
          } finally {
            window.removeEventListener('click', resumeListenerRef.current)
            resumeListenerRef.current = null
          }
        }
        window.addEventListener('click', resumeListenerRef.current)
      }
    }
  }, [addLog])

  const setupSessionAudio = useCallback((session) => {
    if (!session) return
    // Prevent duplicate setup for same session
    if (sessionHandlersRef.current.has(session)) return

    const pc = session.connection
    if (!pc) return

    const ontrack = (ev) => {
      const stream = (ev.streams && ev.streams[0]) || new MediaStream([ev.track])
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
        tryPlayAudio(remoteAudioRef.current)
      }
    }

    const onaddstream = (ev) => {
      const stream = ev.stream || ev
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
        tryPlayAudio(remoteAudioRef.current)
      }
    }

    // Attach handlers
    pc.addEventListener('track', ontrack)
    pc.addEventListener('addstream', onaddstream)

    // Try to set a local (muted) preview from senders
    try {
      if (pc.getSenders) {
        const senders = pc.getSenders() || []
        const localTracks = senders.map(s => s.track).filter(Boolean)
        if (localTracks.length && localAudioRef.current) {
          localAudioRef.current.muted = true
          localAudioRef.current.srcObject = new MediaStream(localTracks)
        }
      }
    } catch (err) {
      // not critical
    }

    sessionHandlersRef.current.set(session, { ontrack, onaddstream })
  }, [tryPlayAudio])

  // SIP config state (exposed to UI)
  const [sipConfig, setSipConfig] = useState(() => {
    const domain = import.meta.env.VITE_SIP_DOMAIN || ''
    const ext = import.meta.env.VITE_SIP_EXT || ''
    const password = import.meta.env.VITE_SIP_PASSWORD || ''
    const websocket = import.meta.env.VITE_SIP_WS || ''
    const uri = import.meta.env.VITE_SIP_URI || ''
    return { websocket, uri, password, domain, ext }
  })

  // ── Register ──
  const register = useCallback((config) => {
    try {
      // Stop existing UA if any
      if (uaRef.current) {
        uaRef.current.stop()
        uaRef.current = null
      }

      const cfg = config || sipConfig
      const socket = new JsSIP.WebSocketInterface(cfg.websocket)

      const configuration = {
        sockets:         [socket],
        uri:             cfg.uri,
        password:        cfg.password,
        register:        true,
        session_timers:  false,
        register_expires: 600,
        connection_recovery_enabled: true,
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
        addLog('warning', 'WebSocket disconnected — waiting for reconnect...')
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

      userAgent.on('registrationExpiring', () => {
        addLog('warning', 'SIP registration expiring — renewing...')
        try {
          userAgent.register()
        } catch (err) {
          addLog('error', `Failed to renew registration: ${err.message}`)
        }
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

          // Try to show a system notification for incoming call
          try {
            if (typeof Notification !== 'undefined') {
              if (Notification.permission === 'default') Notification.requestPermission()
              if (Notification.permission === 'granted') {
                if (notificationRef.current) notificationRef.current.close()
                notificationRef.current = new Notification('Incoming call', { body: `From ${session.remote_identity.uri.user}` })
              }
            }
          } catch (err) {
            // ignore notification errors
          }

          // Try to play a simple ringtone via AudioContext; may require user gesture
          try {
            if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
            const ctx = audioCtxRef.current
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.value = 600
            gain.gain.value = 0.02
            osc.connect(gain)
            gain.connect(ctx.destination)
            oscillatorRef.current = { osc, gain }
            osc.start()
          } catch (err) {
            // autoplay blocked or unsupported
          }
        }

        // Setup audio handlers for this session's PeerConnection
        // Some browsers create the pc asynchronously; try immediate then listen for peerconnection change
        try {
          setupSessionAudio(session)
        } catch (err) {
          addLog('warning', `setupSessionAudio error: ${err.message}`)
        }

        // Also watch for when remote tracks become available after 'confirmed'
        session.on('confirmed', () => {
          try {
            setupSessionAudio(session)
          } catch (err) {
            addLog('warning', `setupSessionAudio on confirmed: ${err.message}`)
          }
          addLog('success', 'Call connected — audio stream started')
          setCallStatus('connected')
          startCallTimer()
          // Close incoming notification and stop ringtone
          try { if (notificationRef.current) { notificationRef.current.close(); notificationRef.current = null } } catch (e) {}
          try { if (oscillatorRef.current) { oscillatorRef.current.osc.stop(); oscillatorRef.current = null } } catch (e) {}
          // start polling getStats for RTP metrics every second
          try {
            const pc = session.connection
            if (pc && pc.getStats) {
              const pollId = setInterval(async () => {
                try {
                  const stats = await pc.getStats()
                  // basic aggregation
                  let jitter = 0, rtt = 0, packetsSent = 0, packetsReceived = 0, bytesSent = 0, bytesReceived = 0, packetLoss = 0
                  stats.forEach(report => {
                    if (report.type === 'inbound-rtp') {
                      packetsReceived += report.packetsReceived || 0
                      bytesReceived += report.bytesReceived || 0
                      jitter = report.jitter || jitter
                    }
                    if (report.type === 'outbound-rtp') {
                      packetsSent += report.packetsSent || 0
                      bytesSent += report.bytesSent || 0
                    }
                    if (report.type === 'candidate-pair' && report.currentRoundTripTime) {
                      rtt = report.currentRoundTripTime * 1000
                    }
                    if (report.type === 'remote-inbound-rtp' && report.packetsLost) {
                      packetLoss = report.packetsLost || packetLoss
                    }
                  })

                  updateRTPMetrics({ jitter: Number(jitter) || 0, rtt: Number(rtt) || 0, packetsSent, packetsReceived, bytesSent, bytesReceived, packetLoss })
                } catch (err) {
                  // ignore per-interval errors
                }
              }, 1000)
              rtpPollRef.current.set(session, pollId)
            }
          } catch (err) {
            // ignore
          }
        })

        session.on('progress', () => {
          addLog('info', 'Remote party ringing...')
          setCallStatus('ringing')
        })

        session.on('ended', () => {
          addLog('info', 'Call ended')
          setCallStatus('idle')
          setCurrentCall(null)
          setIncomingCall(null)
          stopCallTimer()
          cleanupSessionAudio(session)
          // stop rtp polling
          const pid = rtpPollRef.current.get(session)
          if (pid) {
            clearInterval(pid)
            rtpPollRef.current.delete(session)
          }
          try { if (notificationRef.current) { notificationRef.current.close(); notificationRef.current = null } } catch (e) {}
          try { if (oscillatorRef.current) { oscillatorRef.current.osc.stop(); oscillatorRef.current = null } } catch (e) {}
        })

        session.on('failed', (e) => {
          addLog('error', `Call failed: ${e.cause}`)
          setCallStatus('idle')
          setCurrentCall(null)
          setIncomingCall(null)
          stopCallTimer()
          cleanupSessionAudio(session)
          const pid = rtpPollRef.current.get(session)
          if (pid) {
            clearInterval(pid)
            rtpPollRef.current.delete(session)
          }
          try { if (notificationRef.current) { notificationRef.current.close(); notificationRef.current = null } } catch (e) {}
          try { if (oscillatorRef.current) { oscillatorRef.current.osc.stop(); oscillatorRef.current = null } } catch (e) {}
        })

        // Ensure we cleanup if user terminates locally
        session.on('terminated', () => {
          cleanupSessionAudio(session)
        })
      })

      userAgent.start()
      uaRef.current = userAgent
      setUa(userAgent)

      // Save last used config
      setSipConfig(cfg)

      addLog('info', 'SIP User Agent initialized')

    } catch (error) {
      addLog('error', `SIP initialization error: ${error.message}`)
    }
  }, [addLog, startCallTimer, stopCallTimer])

  // ── Auto register on mount ──
  useEffect(() => {
    // Read configuration from Vite environment variables (prefix VITE_)
    const domain = import.meta.env.VITE_SIP_DOMAIN || ''
    const ext = import.meta.env.VITE_SIP_EXT || ''
    const password = import.meta.env.VITE_SIP_PASSWORD || ''
    const websocket = import.meta.env.VITE_SIP_WS || ''
    const uri = import.meta.env.VITE_SIP_URI || ''

    if (websocket && uri && password) {
      register({ websocket, uri, password, domain, ext })
    } else {
      addLog('warning', 'SIP environment variables are not fully configured. Configure .env or use Settings.')
    }

    return () => {
      if (uaRef.current) {
        try {
          uaRef.current.stop()
          uaRef.current = null
          addLog('info', 'SIP User Agent stopped on unmount')
        } catch (err) {
          // ignore errors during unmount
        }
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update RTP Metrics ──
  const updateRTPMetrics = useCallback((metrics) => {
    setRtpMetrics(prev => ({ ...prev, ...metrics }))
  }, [])

  // Subscribe to backend socket events to surface server data into SIPContext
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    const onInit = (data) => {
      if (data.sipLog) {
        // normalize server sipLog entries if necessary
        setSipLogs(data.sipLog.map(e => ({ timestamp: e.timestamp || new Date().toISOString(), time: e.timestamp || new Date().toLocaleTimeString(), level: 'info', message: `${e.method} ${e.from} → ${e.to} ${e.detail || ''}` })))
      }
    }

    const onSipEvent = (entry) => {
      const msg = `${entry.method} ${entry.from || ''} → ${entry.to || ''}: ${entry.detail || ''}`
      addLog('info', msg)
    }

    const onQuality = (q) => {
      if (q && q.callId) {
        updateRTPMetrics({ jitter: q.jitter, packetLoss: q.packetLoss, rtt: q.latency })
      }
    }

    socket.on('init', onInit)
    socket.on('sip_event', onSipEvent)
    socket.on('quality_update', onQuality)

    return () => {
      socket.off('init', onInit)
      socket.off('sip_event', onSipEvent)
      socket.off('quality_update', onQuality)
    }
  }, [socket, addLog, updateRTPMetrics])

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

    const sipTarget = sipConfig.domain
      ? `sip:${target}@${sipConfig.domain}`
      : `sip:${target}`

    const session = uaRef.current.call(sipTarget, options)

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
    // stop ringtone/notification immediately on user answer
    try { if (notificationRef.current) { notificationRef.current.close(); notificationRef.current = null } } catch (e) {}
    try { if (oscillatorRef.current) { oscillatorRef.current.osc.stop(); oscillatorRef.current = null } } catch (e) {}
  }, [incomingCall, addLog])

  // ── Reject Call ──
  const rejectCall = useCallback(() => {
    if (!incomingCall) return
    incomingCall.terminate()
    setIncomingCall(null)
    setCallStatus('idle')
    addLog('info', 'Incoming call rejected')
    try { if (notificationRef.current) { notificationRef.current.close(); notificationRef.current = null } } catch (e) {}
    try { if (oscillatorRef.current) { oscillatorRef.current.osc.stop(); oscillatorRef.current = null } } catch (e) {}
  }, [incomingCall, addLog])

  // ── Hangup ──
  const hangupCall = useCallback(() => {
    if (!currentCall) return
    currentCall.terminate()
    setCurrentCall(null)
    setCallStatus('idle')
    stopCallTimer()
    addLog('info', 'Call terminated')
    try { if (notificationRef.current) { notificationRef.current.close(); notificationRef.current = null } } catch (e) {}
    try { if (oscillatorRef.current) { oscillatorRef.current.osc.stop(); oscillatorRef.current = null } } catch (e) {}
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
    sipConfig,
    setSipConfig,
    updateRTPMetrics
  }

  return (
    <SIPContext.Provider value={value}>
      {/* Hidden audio elements for remote and local preview. Kept in provider so they persist across app. */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
      <audio
        ref={localAudioRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      {children}
    </SIPContext.Provider>
  )
}