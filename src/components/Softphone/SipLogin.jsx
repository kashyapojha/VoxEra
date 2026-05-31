/**
 * SipLogin.jsx
 * Dynamic SIP login form — user enters their own extension and password.
 * Replaces hardcoded .env credentials.
 *
 * Each user registers their own SIP extension dynamically.
 * Multiple browser tabs can register different extensions simultaneously.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Lock, User, Wifi, WifiOff, Loader } from 'lucide-react'
import { useSip } from '../../context/SIPContext'

const SipLogin = () => {
  const {
    register,
    unregister,
    isRegistered,
    isRegistering,
    registrationError,
    extension,
    connectionStatus
  } = useSip()

  const [ext,  setExt]  = useState(localStorage.getItem('sip_ext') || '')
  const [pass, setPass] = useState('')

  const handleRegister = (e) => {
    e.preventDefault()
    if (!ext.trim() || !pass.trim()) return
    register(ext.trim(), pass.trim())
  }

  const handleUnregister = () => {
    unregister()
    setPass('')
  }

  // ── Status indicator ──
  const statusConfig = {
    connected:    { color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  dot: 'bg-green-400',  label: 'Connected'    },
    connecting:   { color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  dot: 'bg-amber-400',  label: 'Connecting...' },
    disconnected: { color: 'text-gray-400',   bg: 'bg-gray-500/15',   border: 'border-gray-500/30',   dot: 'bg-gray-500',   label: 'Disconnected'  },
  }
  const sc = statusConfig[connectionStatus] || statusConfig.disconnected

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm mx-auto"
    >
      <div className="glass-card rounded-2xl border border-white/8 p-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Phone size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">SIP Registration</h3>
            <p className="text-xs text-gray-500">Connect to Asterisk PBX</p>
          </div>
          {/* Connection status badge */}
          <span className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.border} ${sc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
            {sc.label}
          </span>
        </div>

        {/* Registered state */}
        {isRegistered ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <Wifi size={18} className="text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Registered as</p>
                <p className="font-mono font-semibold text-white">{extension}</p>
              </div>
            </div>
            <button
              onClick={handleUnregister}
              className="w-full py-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 text-sm font-semibold hover:bg-red-500/25 transition-colors"
            >
              Unregister
            </button>
          </div>
        ) : (
          /* Login form */
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Extension field */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                SIP Extension
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={ext}
                  onChange={e => setExt(e.target.value)}
                  placeholder="e.g. 1001"
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors font-mono"
                  disabled={isRegistering}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                SIP Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors"
                  disabled={isRegistering}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error message */}
            {registrationError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {registrationError}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isRegistering || !ext.trim() || !pass.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:shadow-[0_0_24px_rgba(91,46,255,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRegistering ? (
                <>
                  <Loader size={15} className="animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Phone size={15} />
                  Register SIP
                </>
              )}
            </button>

          </form>
        )}
      </div>
    </motion.div>
  )
}

export default SipLogin