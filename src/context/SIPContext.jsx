import { createContext, useContext, useState, useCallback, useEffect } from 'react'
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
  const [ua, setUa] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [currentCall, setCurrentCall] = useState(null)
  const [callStatus, setCallStatus] = useState('idle')
  const [callDuration, setCallDuration] = useState(0)
  const [incomingCall, setIncomingCall] = useState(null)
  const [sipLogs, setSipLogs] = useState([])
  const [rtpMetrics, setRtpMetrics] = useState({
    packetsSent: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    jitter: 0,
    rtt: 0,
    packetLoss: 0
  })

  let callTimer = null

  const addLog = useCallback((level, message) => {
    const timestamp = new Date().toISOString()
    setSipLogs(prev => [...prev, { timestamp, level, message }].slice(-100))
  }, [])

  const startCallTimer = () => {
    setCallDuration(0)

    callTimer = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)
  }

  const stopCallTimer = () => {
    if (callTimer) {
      clearInterval(callTimer)
      callTimer = null
    }

    setCallDuration(0)
  }

  const register = useCallback((config) => {
    try {
      const socket = new JsSIP.WebSocketInterface(config.websocket)

      const configuration = {
        sockets: [socket],
        uri: config.uri,
        password: config.password,
        register: true,
        session_timers: false
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
        addLog('success', 'SIP registered successfully')
        setIsRegistered(true)
      })

      userAgent.on('registrationFailed', (e) => {
        addLog('error', `Registration failed: ${e.cause}`)
        setIsRegistered(false)
      })

      userAgent.on('newRTCSession', (data) => {
        if (data.session) {
          if (data.originator === 'local') {
            addLog('info', `Outgoing call to ${data.session.remote_identity.uri.user}`)
            setCurrentCall(data.session)
            setCallStatus('calling')
          } else {
            addLog('info', `Incoming call from ${data.session.remote_identity.uri.user}`)
            setIncomingCall(data.session)
          }

          data.session.on('progress', () => {
            setCallStatus('ringing')
          })

          data.session.on('confirmed', () => {
            setCallStatus('connected')
            addLog('success', 'Call established')
            startCallTimer()
          })

          data.session.on('ended', () => {
            setCallStatus('ended')
            setCurrentCall(null)
            stopCallTimer()
            addLog('info', 'Call ended')
          })

          data.session.on('failed', (e) => {
            setCallStatus('failed')
            setCurrentCall(null)
            addLog('error', `Call failed: ${e.cause}`)
          })
        }
      })

      userAgent.start()
      setUa(userAgent)

      addLog('success', 'SIP User Agent initialized')

    } catch (error) {
      addLog('error', `SIP initialization error: ${error.message}`)
    }
  }, [addLog])

  useEffect(() => {
    register({
      websocket: 'ws://172.29.175.83:8088/ws',
      uri: 'sip:1001@172.29.175.83;transport=ws',
      password: '1234'
    })
  }, [])

  const unregister = useCallback(() => {
    if (ua) {
      ua.stop()
      setIsRegistered(false)
      addLog('info', 'SIP unregistered')
    }
  }, [ua, addLog])

  const makeCall = useCallback((target) => {
    if (ua && isRegistered) {
      const eventHandlers = {
        progress: () => {
          setCallStatus('ringing')
        },

        confirmed: () => {
          setCallStatus('connected')
          startCallTimer()
        },

        ended: () => {
          setCallStatus('ended')
          setCurrentCall(null)
          stopCallTimer()
        },

        failed: () => {
          setCallStatus('failed')
          setCurrentCall(null)
        }
      }

      const options = {
        eventHandlers,
        mediaConstraints: {
          audio: true,
          video: false
        }
      }

      const session = ua.call(target, options)

      setCurrentCall(session)

      addLog('info', `Initiating call to ${target}`)
    }
  }, [ua, isRegistered, addLog])

  const answerCall = useCallback(() => {
    if (incomingCall) {
      const session = incomingCall

      session.answer({
        mediaConstraints: {
          audio: true,
          video: false
        }
      })

      setCurrentCall(session)
      setIncomingCall(null)

      addLog('info', 'Incoming call answered')
    }
  }, [incomingCall, addLog])

  const rejectCall = useCallback(() => {
    if (incomingCall) {
      incomingCall.terminate()
      setIncomingCall(null)

      addLog('info', 'Incoming call rejected')
    }
  }, [incomingCall, addLog])

  const hangupCall = useCallback(() => {
    if (currentCall) {
      currentCall.terminate()
      setCurrentCall(null)
      setCallStatus('idle')

      stopCallTimer()

      addLog('info', 'Call terminated')
    }
  }, [currentCall, addLog])

  const holdCall = useCallback(() => {
    if (currentCall) {
      currentCall.hold()
      addLog('info', 'Call placed on hold')
    }
  }, [currentCall, addLog])

  const unholdCall = useCallback(() => {
    if (currentCall) {
      currentCall.unhold()
      addLog('info', 'Call resumed from hold')
    }
  }, [currentCall, addLog])

  const muteAudio = useCallback(() => {
    if (currentCall) {
      currentCall.mute({ audio: true })
      addLog('info', 'Audio muted')
    }
  }, [currentCall, addLog])

  const unmuteAudio = useCallback(() => {
    if (currentCall) {
      currentCall.unmute({ audio: true })
      addLog('info', 'Audio unmuted')
    }
  }, [currentCall, addLog])

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