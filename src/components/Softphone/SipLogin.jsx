/**
 * SipLogin.jsx
 * Manual SIP registration — extension and password entered by the user.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Lock, User, Wifi, Loader } from 'lucide-react'
import { useSip } from '../../context/SIPContext'
import { env, resolveSipPassword } from '../../config/env'

const SipLogin = () => {
  const {
    register,
    unregister,
    isRegistered,
    isRegistering,
    registrationError,
    extension,
    connectionStatus,
    sipConfig,
  } = useSip()

  const [ext, setExt] = useState(() => localStorage.getItem('sip_ext') || env.sipExtension || '')
  const [pass, setPass] = useState(() => {
    const initialExt = localStorage.getItem('sip_ext') || env.sipExtension || ''
    const storedPass =
      localStorage.getItem('sip_ext') === initialExt
        ? sessionStorage.getItem('sip_pass')
        : ''
    return resolveSipPassword(
      initialExt,
      storedPass || sipConfig.password || env.sipPassword
    )
  })

  const handleRegister = (e) => {
    e.preventDefault()
    if (!ext.trim() || !pass.trim()) return
    register(ext.trim(), pass.trim())
  }

  const handleUnregister = () => {
    unregister()
    setPass('')
  }

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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Phone size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">SIP Registration</h3>
            <p className="text-xs text-gray-500">Connect to Asterisk PBX</p>
          </div>
          <span className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.border} ${sc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
            {sc.label}
          </span>
        </div>

        {!isRegistered && (
          <p className="text-xs text-blue-300/90 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 mb-1">
            Two-browser test: Browser A → <span className="font-mono">1001</span> / password{' '}
            <span className="font-mono">1001</span>. Browser B (incognito) →{' '}
            <span className="font-mono">1002</span> / password <span className="font-mono">1002</span>.
            Each browser must show a different extension below after Register.
          </p>
        )}

        {isRegistered ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <Wifi size={18} className="text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Registered as — ready to receive calls</p>
                <p className="font-mono font-semibold text-white text-lg">{extension}</p>
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
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                SIP Extension
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={ext}
                  onChange={(e) => {
                    const next = e.target.value.trim()
                    setExt(next)
                    setPass(resolveSipPassword(next, pass))
                  }}
                  placeholder="e.g. 1001"
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 transition-colors font-mono"
                  disabled={isRegistering}
                  autoComplete="username"
                />
              </div>
            </div>

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

            {env.sipExtension && ext && ext !== env.sipExtension && (
              <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Extension {ext} uses its own password (e.g. {ext} → password <span className="font-mono">{ext}</span>), not the default {env.sipExtension} password.
              </p>
            )}

            {registrationError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {registrationError}
              </p>
            )}

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
