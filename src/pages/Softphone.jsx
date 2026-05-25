import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Settings, User } from 'lucide-react'
import GlassCard from '../components/UI/GlassCard'
import DialPad from '../components/Softphone/DialPad'
import CallControls from '../components/Softphone/CallControls'
import CallTimer from '../components/Softphone/CallTimer'
import IncomingCallModal from '../components/Softphone/IncomingCallModal'
import { useSIP } from '../context/SIPContext'

const Softphone = () => {
  const { callStatus, callDuration, makeCall, hangupCall, muteAudio, unmuteAudio, holdCall, unholdCall, isRegistered } = useSIP()
  const { sipConfig } = useSIP()
  const [isMuted, setIsMuted] = useState(false)
  const [isOnHold, setIsOnHold] = useState(false)
  const [autoAnswer, setAutoAnswer] = useState(() => JSON.parse(localStorage.getItem('autoAnswer') || 'false'))
  const [recordCalls, setRecordCalls] = useState(() => JSON.parse(localStorage.getItem('recordCalls') || 'false'))
  const [dnd, setDnd] = useState(() => JSON.parse(localStorage.getItem('dnd') || 'false'))

  const handleCall = (number) => {
    if (isRegistered) {
      makeCall(number)
    }
  }

  const handleHangup = () => {
    hangupCall()
    setIsMuted(false)
    setIsOnHold(false)
  }

  const handleMute = () => {
    if (isMuted) {
      unmuteAudio()
      setIsMuted(false)
    } else {
      muteAudio()
      setIsMuted(true)
    }
  }

  const handleHold = () => {
    if (isOnHold) {
      unholdCall()
      setIsOnHold(false)
    } else {
      holdCall()
      setIsOnHold(true)
    }
  }

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
          <GlassCard className="flex flex-col items-center justify-center p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-3 h-3 rounded-full ${isRegistered ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-400">
                {isRegistered ? 'SIP Registered' : 'Not Registered'}
              </span>
            </div>

            {callStatus !== 'idle' && callStatus !== 'ended' && (
              <CallTimer callStatus={callStatus} callDuration={callDuration} />
            )}

            <DialPad onCall={handleCall} />

            {callStatus !== 'idle' && (
              <div className="mt-8">
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

          <div className="space-y-6">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Settings size={20} className="text-accent" />
                <h3 className="text-lg font-semibold">Quick Settings</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-gray-300">Auto-answer calls</span>
                  <div
                    onClick={() => { setAutoAnswer(v => { localStorage.setItem('autoAnswer', JSON.stringify(!v)); return !v }) }}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${autoAnswer ? 'bg-gradient-primary' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${autoAnswer ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-gray-300">Call recording</span>
                  <div
                    onClick={() => { setRecordCalls(v => { localStorage.setItem('recordCalls', JSON.stringify(!v)); return !v }) }}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${recordCalls ? 'bg-gradient-primary' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${recordCalls ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-gray-300">Do not disturb</span>
                  <div
                    onClick={() => { setDnd(v => { localStorage.setItem('dnd', JSON.stringify(!v)); return !v }) }}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${dnd ? 'bg-gradient-primary' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${dnd ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <User size={20} className="text-accent" />
                <h3 className="text-lg font-semibold">My Profile</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-400 mb-1">Extension</p>
                  <p className="font-semibold">{sipConfig?.ext || '1001'}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-400 mb-1">SIP URI</p>
                  <p className="font-semibold">{sipConfig?.uri || 'sip:your.ext@domain.com'}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <p className={`font-semibold ${isRegistered ? 'text-green-400' : 'text-yellow-400'}`}>{isRegistered ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </motion.div>
    </>
  )
}

export default Softphone
