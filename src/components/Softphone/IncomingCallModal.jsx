/**
 * IncomingCallModal.jsx
 * Shows only when JsSIP has delivered a real SIP session — Answer is always enabled.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff } from 'lucide-react'
import { useSip } from '../../context/SIPContext'

const IncomingCallModal = () => {
  const { incomingCall, incomingFrom, answerCall, rejectCall } = useSip()

  if (!incomingCall) return null

  const caller = incomingFrom || incomingCall.remote_identity?.uri?.user || 'Unknown'

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
          className="glass-card max-w-sm w-full text-center p-8 rounded-2xl border border-[var(--border-light)] neon-glow relative overflow-hidden"
        >
          <div className="pulse-rings opacity-40">
            <div className="pulse-ring" />
            <div className="pulse-ring" />
          </div>

          <div className="flex flex-col items-center gap-6 relative z-10">
            <div className="relative">
              <div className="logo-mark w-20 h-20">
                <Phone size={32} className="text-[var(--bg-deep)]" />
              </div>
              <span className="absolute inset-0 rounded-xl opacity-30 animate-pulse-ring" style={{ boxShadow: '0 0 0 2px var(--accent-cyan)' }} />
            </div>

            <div>
              <p className="text-xs text-muted uppercase tracking-widest mb-1 font-mono">Incoming Call</p>
              <p className="text-4xl font-mono font-bold gradient-text">{caller}</p>
              <p className="text-sm text-muted mt-1">is calling you...</p>
              <p className="text-xs text-accent-mint mt-2 flex items-center justify-center gap-1.5">
                <span className="live-dot" /> Click Answer to connect
              </p>
            </div>

            <div className="flex gap-10">
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={rejectCall}
                  className="w-14 h-14 rounded-full border border-accent-rose/40 bg-accent-rose/10 flex items-center justify-center hover:bg-accent-rose/20 transition-colors"
                >
                  <PhoneOff size={22} className="text-accent-rose" />
                </motion.button>
                <span className="text-xs text-muted">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={answerCall}
                  className="w-14 h-14 rounded-full btn-primary !p-0 !w-14 !h-14 animate-pulse"
                >
                  <Phone size={22} />
                </motion.button>
                <span className="text-xs text-muted">Answer</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default IncomingCallModal
