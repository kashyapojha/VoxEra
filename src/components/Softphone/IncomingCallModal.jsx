/**
 * IncomingCallModal.jsx
 * Shows when an incoming SIP call arrives.
 * Uses SipContext — not useSip from hooks folder.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff } from 'lucide-react'
import { useSip } from '../../context/SIPContext'

const IncomingCallModal = () => {
  const { incomingCall, incomingFrom, answerCall, rejectCall } = useSip()

  if (!incomingCall) return null

  const caller = incomingFrom || 'Unknown'

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
              <p className="text-xs text-amber-400/90 mt-2">Ringing — click Answer to connect</p>
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
                  className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg"
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