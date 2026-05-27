import { useState } from 'react'
import { motion } from 'framer-motion'
import { User } from 'lucide-react'
import GlassCard from '../components/UI/GlassCard'
import DialPad from '../components/Softphone/DialPad'
import CallControls from '../components/Softphone/CallControls'
import CallTimer from '../components/Softphone/CallTimer'
import IncomingCallModal from '../components/Softphone/IncomingCallModal'
import { useSIP } from '../context/SIPContext'
import { useWebRTCStats } from '../hooks/useWebRTCStats'
import { CallQualityPanel } from '../components/QoS/QoSComponents'

const Softphone = () => {
  const {
    currentCall,
    callStatus,
    callDuration,
    makeCall,
    hangupCall,
    muteAudio,
    unmuteAudio,
    holdCall,
    unholdCall,
    isRegistered,
    sipConfig
  } = useSIP()

  const { stats, history } = useWebRTCStats(currentCall)

  const [isMuted,  setIsMuted]  = useState(false)
  const [isOnHold, setIsOnHold] = useState(false)

  // Extract extension number from SIP URI — sip:1001@host → 1001
  const extension = sipConfig?.uri
    ? sipConfig.uri.replace('sip:', '').split('@')[0]
    : '—'

  const handleCall = (number) => {
    if (isRegistered && number) makeCall(number)
  }

  const handleHangup = () => {
    hangupCall()
    setIsMuted(false)
    setIsOnHold(false)
  }

  const handleMute = () => {
    if (isMuted) { unmuteAudio(); setIsMuted(false) }
    else         { muteAudio();   setIsMuted(true)  }
  }

  const handleHold = () => {
    if (isOnHold) { unholdCall(); setIsOnHold(false) }
    else          { holdCall();   setIsOnHold(true)  }
  }

  const isInCall = callStatus !== 'idle' && callStatus !== 'ended'

  return (
    <>
      <IncomingCallModal />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Softphone</h1>
          <p className="text-gray-400">Make and receive SIP calls</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── DIALPAD PANEL ── */}
          <GlassCard className="flex flex-col items-center justify-center p-8">

            {/* Registration status */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-3 h-3 rounded-full animate-pulse ${isRegistered ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-400">
                {isRegistered ? 'SIP Registered' : 'Not Registered — go to Settings'}
              </span>
            </div>

            {/* Call timer — only during active call */}
            {isInCall && (
              <CallTimer callStatus={callStatus} callDuration={callDuration} />
            )}

            {/* Dialpad */}
            <DialPad onCall={handleCall} disabled={!isRegistered} />

            <div className="mt-8 w-full">
              <CallQualityPanel stats={stats} history={history} isActive={isInCall} />
            </div>

            {/* Call controls — only during active call */}
            {isInCall && (
              <div className="mt-8 w-full">
                <CallControls
                  callStatus={callStatus}
                  onHangup={handleHangup}
                  onMute={handleMute}
                  onUnmute={handleMute}
                  onHold={handleHold}
                  onUnhold={handleHold}
                  isMuted={isMuted}
                  isOnHold={isOnHold}
                />
              </div>
            )}
          </GlassCard>

          {/* ── PROFILE PANEL ── */}
          <div className="space-y-6">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <User size={20} className="text-accent" />
                <h3 className="text-lg font-semibold">My Profile</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-400 mb-1">Extension</p>
                  <p className="font-semibold font-mono text-lg">{extension}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-400 mb-1">SIP URI</p>
                  <p className="font-semibold text-sm break-all">{sipConfig?.uri || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-400 mb-1">WebSocket</p>
                  <p className="font-semibold text-sm break-all">{sipConfig?.websocket || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <p className={`font-semibold ${isRegistered ? 'text-green-400' : 'text-red-400'}`}>
                    {isRegistered ? 'Online' : 'Offline'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-400 mb-1">Call State</p>
                  <p className="font-semibold capitalize text-blue-400">{callStatus}</p>
                </div>
              </div>
            </GlassCard>

            {/* How to call info box */}
            {!isRegistered && (
              <GlassCard>
                <p className="text-sm text-gray-400 leading-relaxed">
                  To make calls, go to <span className="text-white font-semibold">Settings</span> and register your SIP extension first.
                </p>
              </GlassCard>
            )}

            {isRegistered && !isInCall && (
              <GlassCard>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Enter an extension number on the dialpad and press the call button to start a call.
                </p>
              </GlassCard>
            )}
          </div>

        </div>
      </motion.div>
    </>
  )
}

export default Softphone