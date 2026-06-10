/**
 * IncomingCallModal.jsx
 * Shows when an incoming SIP call arrives.
 * Uses SipContext — not useSip from hooks folder.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff } from 'lucide-react'
import { useSip } from '../../context/SIPContext'

const IncomingCallModal = () => {
  const {
    incomingCall,
    incomingFrom,
    pendingCaller,
    sipInvitePending,
    sipSessionReady,    // FIX: use dedicated flag instead of deriving from incomingCall object
    registrationError,
    answerCall,
    rejectCall,
  } = useSip()

  if (!incomingCall && !pendingCaller) return null

  const caller = incomingFrom || pendingCaller || 'Unknown'

  // FIX: sipSessionReady is set synchronously in onIncomingCall before React state async flush.
  // This guarantees Answer is enabled the moment JsSIP delivers the session — no race condition.
  const sipReady = sipSessionReady || Boolean(incomingCall)
  const waitingForSip = Boolean(pendingCaller && !sipReady)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="glass-card max-w-sm w-full text-center p-8 rounded-2xl border border-white/10"
        >
          <div className="flex flex-col items-center gap-6">

            {/* Pulsing avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center">
                <Phone size={36} className="text-white" />
              </div>
              <span className="absolute inset-0 rounded-full bg-gradient-primary opacity-30 animate-ping" />
            </div>

            {/* Caller info */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Incoming Call</p>
              <p className="text-4xl font-mono font-light text-white">{caller}</p>
              <p className="text-sm text-gray-400 mt-1">is calling you...</p>
              <p className="text-xs text-amber-400/90 mt-2">
                {sipReady
                  ? 'Click Answer to connect'
                  : 'Waiting for SIP — Answer enables when this tab receives the call'}
              </p>
              {waitingForSip && sipInvitePending && (
                <p className="text-xs text-red-300/90 mt-2 max-w-xs mx-auto">
                  If Answer stays disabled: Softphone → Unregister → Register on{' '}
                  <span className="font-mono">this tab only</span> (one tab per extension).
                </p>
              )}
              {registrationError && waitingForSip && (
                <p className="text-xs text-red-400/90 mt-2 max-w-xs mx-auto">{registrationError}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-10">
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={rejectCall}
                  className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                >
                  <PhoneOff size={22} className="text-white" />
                </motion.button>
                <span className="text-xs text-gray-500">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={answerCall}
                  disabled={!sipReady}
                  className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Phone size={22} className="text-white" />
                </motion.button>
                <span className="text-xs text-gray-500">Answer</span>
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default IncomingCallModal