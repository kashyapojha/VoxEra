import { motion } from 'framer-motion'
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, Volume2, VolumeX } from 'lucide-react'

const CallControls = ({
  callStatus,
  onHangup,
  onMute,
  onUnmute,
  onHold,
  onUnhold,
  isMuted,
  isOnHold
}) => {
  const controls = [
    {
      icon: isMuted ? MicOff : Mic,
      label: isMuted ? 'Unmute' : 'Mute',
      action: isMuted ? onUnmute : onMute,
      color: 'bg-white/10 hover:bg-white/20',
      disabled: callStatus !== 'connected'
    },
    {
      icon: isOnHold ? Play : Pause,
      label: isOnHold ? 'Resume' : 'Hold',
      action: isOnHold ? onUnhold : onHold,
      color: 'bg-white/10 hover:bg-white/20',
      disabled: callStatus !== 'connected'
    },
    {
      icon: Volume2,
      label: 'Speaker',
      action: () => {},
      color: 'bg-white/10 hover:bg-white/20',
      disabled: callStatus !== 'connected'
    },
  ]

  return (
    <div className="flex items-center justify-center gap-4">
      {controls.map((control, index) => (
        <motion.button
          key={control.label}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={control.action}
          disabled={control.disabled}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
            control.disabled ? 'opacity-50 cursor-not-allowed' : control.color
          }`}
        >
          <control.icon size={20} className="text-white" />
        </motion.button>
      ))}

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onHangup}
        disabled={callStatus === 'idle'}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
          callStatus !== 'idle'
            ? 'bg-red-500 hover:bg-red-600 neon-glow'
            : 'bg-white/5 cursor-not-allowed opacity-50'
        }`}
      >
        <PhoneOff size={24} className="text-white" />
      </motion.button>
    </div>
  )
}

export default CallControls
