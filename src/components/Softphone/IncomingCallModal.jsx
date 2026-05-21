import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff } from 'lucide-react'
import { useSIP } from '../../context/SIPContext'

const IncomingCallModal = () => {
  const { incomingCall, answerCall, rejectCall } = useSIP()

  if (!incomingCall) return null

  const caller = incomingCall.remote_identity?.uri?.user || 'Unknown'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="glass-card max-w-md w-full text-center"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center animate-pulse-slow">
              <Phone size={40} className="text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Incoming Call</h2>
              <p className="text-3xl font-light text-accent">{caller}</p>
              <p className="text-gray-400 mt-2">is calling you...</p>
            </div>

            <div className="flex gap-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all duration-300 neon-glow"
              >
                <PhoneOff size={24} className="text-white" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center hover:shadow-[0_0_40px_rgba(91,46,255,0.6)] transition-all duration-300 neon-glow"
              >
                <Phone size={24} className="text-white" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default IncomingCallModal
