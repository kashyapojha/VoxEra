import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, X, Delete } from 'lucide-react'

const DialPad = ({ onCall, onClear, disabled }) => {
  const [number, setNumber] = useState('')

  const buttons = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
    { num: '*', letters: '' },
    { num: '0', letters: '+' },
    { num: '#', letters: '' },
  ]

  const handlePress = (num) => {
    if (disabled) return
    setNumber(prev => prev + num)
  }

  const handleBackspace = () => {
    setNumber(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    if (disabled) return
    setNumber('')
    if (onClear) onClear()
  }

  const handleCall = () => {
    if (disabled) return
    if (number && onCall) {
      onCall(number)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full max-w-xs">
        <input
          type="text"
          value={number}
          readOnly
          placeholder="Enter number"
          className="w-full text-center text-3xl font-light bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-accent/50 transition-colors"
        />
        {number && (
          <button
            onClick={handleBackspace}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Delete size={20} className="text-gray-400" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {buttons.map((btn, index) => (
          <motion.button
            key={btn.num}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePress(btn.num)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            disabled={disabled}
            className={`w-20 h-20 rounded-2xl glass flex flex-col items-center justify-center transition-all duration-300 neon-glow-hover ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'}`}
          >
            <span className="text-2xl font-semibold">{btn.num}</span>
            {btn.letters && (
              <span className="text-xs text-gray-500 mt-1">{btn.letters}</span>
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClear}
          disabled={disabled}
          className={`w-16 h-16 rounded-full glass flex items-center justify-center transition-all duration-300 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'}`}
        >
          <X size={24} className="text-gray-400" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCall}
          disabled={!number || disabled}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            (!number || disabled)
              ? 'bg-white/5 cursor-not-allowed opacity-60'
              : 'bg-gradient-primary neon-glow hover:shadow-[0_0_40px_rgba(91,46,255,0.6)]'
          }`}
        >
          <Phone size={28} className="text-white" />
        </motion.button>
      </div>
    </div>
  )
}

export default DialPad
