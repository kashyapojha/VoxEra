/**
 * Softphone.jsx
 * Main softphone page — uses dynamic SipContext.
 * Shows SipLogin form when not registered.
 * Shows dialpad and call controls when registered.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, PhoneOff } from 'lucide-react'
import GlassCard from '../components/UI/GlassCard'
import PageHeader from '../components/UI/PageHeader'
import DialPad from '../components/Softphone/DialPad'
import CallControls from '../components/Softphone/CallControls'
import CallTimer from '../components/Softphone/CallTimer'
import SipLogin from '../components/Softphone/SipLogin'
import { useSip } from '../hooks/useSip'
import { useWebRTCStats } from '../hooks/useWebRTCStats'
import { CallQualityPanel } from '../components/QoS/QoSComponents'

const Softphone = () => {
  const {
    isRegistered,
    sipOnline,
    connectionStatus,
    registrationError,
    extension,
    callStatus,
    incomingCall,
    incomingFrom,
    answerCall,
    rejectCall,
    callDuration,
    currentCall,
    rtpMetrics,
    makeCall,
    hangupCall,
    muteAudio,
    unmuteAudio,
    holdCall,
    unholdCall,
  } = useSip()

  const { stats, history } = useWebRTCStats(currentCall)

  const [isMuted,  setIsMuted]  = useState(false)
  const [isOnHold, setIsOnHold] = useState(false)

  const isInCall = callStatus !== 'idle' && callStatus !== 'ended'

  const handleCall = (number) => {
    if (sipOnline && number) makeCall(number)
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto"
      >
        <PageHeader title="Softphone" description="Make and receive SIP calls" live={isRegistered} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT — Dialpad or Login ── */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-8">

              {/* Registration status bar */}
              <div className="flex items-center gap-2 mb-6">
                <span className={sipOnline ? 'live-dot' : `w-2 h-2 rounded-full ${isRegistered ? 'bg-accent-amber animate-pulse' : 'bg-accent-rose'}`} />
                <span className="text-sm text-muted">
                  {sipOnline
                    ? `Registered as extension ${extension} — ready for calls`
                    : isRegistered
                      ? `Extension ${extension} — WebSocket reconnecting (cannot receive calls yet)`
                      : 'Not registered — enter credentials below'}
                </span>
              </div>

              {isRegistered && !sipOnline && (
                <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                  SIP transport is down on this tab. Wait for reconnect or click Unregister → Register again.
                  {connectionStatus === 'connecting' ? ' (reconnecting…)' : ''}
                </div>
              )}

              {registrationError && isRegistered && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                  {registrationError}
                </div>
              )}

              {incomingCall && (
                <div className="mb-6 w-full p-6 rounded-2xl bg-green-500/10 border-2 border-green-500/40 text-center">
                  <p className="text-xs text-green-300 uppercase tracking-widest mb-1">Incoming call</p>
                  <p className="text-3xl font-mono text-white mb-4">{incomingFrom || 'Unknown'}</p>
                  <div className="flex justify-center gap-6">
                    <button
                      type="button"
                      onClick={rejectCall}
                      className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600"
                    >
                      <PhoneOff size={22} className="text-white" />
                    </button>
                    <button
                      type="button"
                      onClick={answerCall}
                      className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 animate-pulse"
                    >
                      <Phone size={22} className="text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* Show SipLogin if not registered */}
              {!isRegistered ? (
                <SipLogin />
              ) : (
                <div className="flex flex-col items-center">

                  {/* Call timer */}
                  {isInCall && (
                    <div className="mb-6 w-full">
                      <CallTimer callStatus={callStatus} callDuration={callDuration} />
                    </div>
                  )}

                  {/* Dialpad */}
                  <DialPad onCall={handleCall} disabled={!sipOnline || isInCall || !!incomingCall} />

                  {/* Call controls */}
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

                  {/* Call Quality Panel */}
                  <div className="mt-8 w-full">
                    <CallQualityPanel stats={stats} history={history} isActive={isInCall} />
                  </div>

                </div>
              )}
            </GlassCard>
          </div>

          {/* ── RIGHT — Profile + Metrics ── */}
          <div className="space-y-6">

            {/* SIP Login card — always visible on right when not registered */}
            {!isRegistered && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={16} className="text-accent" />
                  <span className="text-sm font-semibold">Quick Connect</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Enter your SIP extension and password to register with the Asterisk PBX server.
                  Each browser tab can register a different extension.
                </p>
              </GlassCard>
            )}

            {/* Profile card — only when registered */}
            {isRegistered && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <User size={18} className="text-accent" />
                  <h3 className="text-sm font-semibold">My Profile</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-xs text-gray-500 mb-1">Extension</p>
                    <p className="font-mono font-bold text-xl text-white">{extension}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className={`font-semibold text-sm ${sipOnline ? 'text-green-400' : 'text-amber-400'}`}>
                      {sipOnline ? 'Online' : 'Reconnecting'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-xs text-gray-500 mb-1">Call State</p>
                    <p className="font-semibold capitalize text-blue-400 text-sm">{callStatus}</p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* RTP Metrics — only during call */}
            {isInCall && (
              <GlassCard>
                <h3 className="text-sm font-semibold mb-4 text-white">RTP Metrics</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Jitter',            value: `${rtpMetrics?.jitter ?? 0} ms`           },
                    { label: 'RTT',               value: `${rtpMetrics?.rtt ?? 0} ms`               },
                    { label: 'Packet Loss',       value: `${rtpMetrics?.packetLoss ?? 0}%`          },
                    { label: 'Packets Sent',      value: `${rtpMetrics?.packetsSent ?? 0}`          },
                    { label: 'Packets Received',  value: `${rtpMetrics?.packetsReceived ?? 0}`      },
                  ].map(m => (
                    <div key={m.label} className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{m.label}</span>
                      <span className="text-white font-mono">{m.value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Helper text */}
            <GlassCard>
              <p className="text-xs text-gray-500 leading-relaxed">
                {!isRegistered
                  ? 'Register your SIP extension to start making and receiving calls.'
                  : !isInCall
                  ? 'Enter an extension on the dialpad and press call to connect.'
                  : 'Call in progress. Use the controls to manage your call.'}
              </p>
            </GlassCard>

          </div>
        </div>
      </motion.div>
    </>
  )
}

export default Softphone