import { useState } from 'react'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Bell, Shield, Phone, Globe, Save, LogOut } from 'lucide-react'
import GlassCard from '../components/UI/GlassCard'
import { useSip } from '../context/SIPContext'
import { useAuth } from '../context/AuthContext'
import { env, parseSipUri, hostFromUrl, resolveSipPassword } from '../config/env'

const Settings = () => {
  const {
    isRegistered,
    isRegistering,
    registrationError,
    connectionStatus,
    register,
    unregister,
    sipConfig,
    setSipConfig,
    extension,
  } = useSip()
  const { user, logout } = useAuth()

  // Load saved settings — env-baked SIP values always win over stale localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voipsight_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.sipConfig) {
          const uri = env.sipUri || parsed.sipConfig?.uri || ''
          const { extension: uriExt } = parseSipUri(uri)
          setSipConfig(prev => ({
            ...prev,
            ...parsed.sipConfig,
            ...(env.sipWsUrl ? { websocket: env.sipWsUrl } : {}),
            ...(env.sipUri ? { uri: env.sipUri } : {}),
            password: resolveSipPassword(uriExt, parsed.sipConfig?.password || env.sipPassword),
          }))
        }
      }
    } catch (err) {
      // ignore parse errors
    }
  }, [setSipConfig])

  const parsedSip = parseSipUri(sipConfig.uri || env.sipUri)

  // Keep password aligned with SIP URI extension (1002 URI must not keep 1001 password).
  useEffect(() => {
    if (!parsedSip.extension) return
    const resolved = resolveSipPassword(parsedSip.extension, sipConfig.password)
    if (resolved !== sipConfig.password) {
      setSipConfig((prev) => ({ ...prev, password: resolved }))
    }
  }, [parsedSip.extension, sipConfig.password, setSipConfig])

  const handleSIPRegister = () => {
    // SIP URI is the source of truth — stale localStorage sip_ext must not override it.
    const ext =
      parsedSip.extension ||
      extension ||
      localStorage.getItem('sip_ext') ||
      env.sipExtension

    const storedExt = localStorage.getItem('sip_ext')
    const storedPass = sessionStorage.getItem('sip_pass')
    const explicitPass =
      (sipConfig.password || '').trim() ||
      (storedExt === ext && storedPass ? storedPass.trim() : '')
    const pass = resolveSipPassword(ext, explicitPass)

    const domain =
      hostFromUrl(sipConfig.websocket || env.sipWsUrl) ||
      parsedSip.domain ||
      env.sipDomain

    if (!ext || !pass) {
      return
    }
    register(ext, pass, domain)
  }

  const handleSIPUnregister = () => {
    unregister()
  }

  const settingsSections = [
    {
      icon: User,
      title: 'Profile Settings',
      items: [
        { label: 'Display Name', type: 'text', value: user?.name || 'John Doe' },
        { label: 'Email', type: 'email', value: user?.email || 'john@example.com' },
        { label: 'Department', type: 'text', value: user?.department || '—' }
      ]
    },
    {
      icon: Phone,
      title: 'SIP Configuration',
      isSIP: true
    },
    {
      icon: Bell,
      title: 'Notifications',
      items: [
        { label: 'Incoming calls', type: 'toggle', checked: true },
        { label: 'Call ended', type: 'toggle', checked: true },
        { label: 'Missed calls', type: 'toggle', checked: true },
        { label: 'System alerts', type: 'toggle', checked: false }
      ]
    },
    {
      icon: Shield,
      title: 'Security',
      items: [
        { label: 'Two-factor authentication', type: 'toggle', checked: false },
        { label: 'Call encryption', type: 'toggle', checked: true },
        { label: 'Session timeout', type: 'select', value: '30 minutes' }
      ]
    },
    {
      icon: Globe,
      title: 'Preferences',
      items: [
        { label: 'Language', type: 'select', value: 'English' },
        { label: 'Timezone', type: 'select', value: 'UTC' },
        { label: 'Theme', type: 'select', value: 'Dark' }
      ]
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {settingsSections.map((section, index) => {
          const Icon = section.icon
          return (
            <GlassCard key={index}>
              <div className="flex items-center gap-2 mb-6">
                <Icon size={20} className="text-accent" />
                <h3 className="text-lg font-semibold">{section.title}</h3>
              </div>

              {section.isSIP ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      WebSocket URL
                    </label>
                    <input
                      type="text"
                      value={sipConfig.websocket}
                      onChange={(e) => setSipConfig({ ...sipConfig, websocket: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      SIP URI
                    </label>
                    <input
                      type="text"
                      value={sipConfig.uri}
                      onChange={(e) => {
                        const uri = e.target.value
                        const { extension: uriExt } = parseSipUri(uri)
                        setSipConfig((prev) => ({
                          ...prev,
                          uri,
                          password: uriExt ? uriExt : prev.password,
                        }))
                      }}
                      placeholder="sip:1001@13.62.237.148"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors font-mono text-sm"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Extension (username) is the part before{' '}
                      <span className="font-mono text-gray-400">@</span>
                      {parsedSip.extension ? (
                        <> — currently <span className="font-mono text-accent">{parsedSip.extension}</span></>
                      ) : (
                        <> — e.g. <span className="font-mono text-gray-400">1001</span> in <span className="font-mono text-gray-400">sip:1001@host</span></>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                      {parsedSip.extension ? (
                        <span className="text-gray-500 font-normal">
                          {' '}(for extension <span className="font-mono">{parsedSip.extension}</span>)
                        </span>
                      ) : null}
                    </label>
                    <input
                      type="password"
                      value={sipConfig.password}
                      onChange={(e) => setSipConfig({ ...sipConfig, password: e.target.value })}
                      placeholder={parsedSip.extension || '••••••••'}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      isRegistered ? 'bg-green-500'
                        : isRegistering || connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse'
                          : connectionStatus === 'connected' ? 'bg-yellow-500'
                            : 'bg-red-500'
                    }`} />
                    <span className="text-sm text-gray-400">
                      {isRegistered
                        ? `Registered as ${extension}`
                        : isRegistering
                          ? 'Registering...'
                          : connectionStatus === 'connected'
                            ? 'Connected — waiting for REGISTER response'
                            : connectionStatus === 'connecting'
                              ? 'Connecting WebSocket...'
                              : 'Not Registered'}
                    </span>
                  </div>
                  {parsedSip.extension &&
                    localStorage.getItem('sip_ext') &&
                    localStorage.getItem('sip_ext') !== parsedSip.extension &&
                    !isRegistered && (
                    <p className="text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                      This browser last registered as{' '}
                      <span className="font-mono">{localStorage.getItem('sip_ext')}</span>.
                      Register will use <span className="font-mono">{parsedSip.extension}</span> from the SIP URI above.
                    </p>
                  )}
                  {registrationError && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      {registrationError}
                    </p>
                  )}
                  <div className="flex gap-3">
                    {isRegistered ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSIPUnregister}
                        className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-colors"
                      >
                        Unregister
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSIPRegister}
                        disabled={isRegistering}
                        className="px-6 py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:shadow-[0_0_30px_rgba(91,46,255,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRegistering ? 'Registering...' : 'Register'}
                      </motion.button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                      <span className="text-gray-300">{item.label}</span>
                      {item.type === 'toggle' ? (
                        <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${item.checked ? 'bg-gradient-primary' : 'bg-white/10'}`}>
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${item.checked ? 'right-1' : 'left-1'}`} />
                        </div>
                      ) : item.type === 'select' ? (
                        <select className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50">
                          <option>{item.value}</option>
                        </select>
                      ) : (
                        <input
                          type={item.type}
                          defaultValue={item.value}
                          className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50 w-48"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )
        })}

        <GlassCard>
          <div className="flex items-center gap-2 mb-6">
            <LogOut size={20} className="text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
          </div>
          <div className="space-y-4">
            <button onClick={() => { unregister(); logout(); }} className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-colors">
              Sign Out
            </button>
            <button className="w-full py-3 rounded-xl bg-white/5 text-red-400 font-semibold hover:bg-white/10 transition-colors">
              Delete Account
            </button>
          </div>
        </GlassCard>

        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { /* placeholder: persist settings to localStorage */ localStorage.setItem('voipsight_settings', JSON.stringify({ sipConfig })); }}
            className="px-8 py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:shadow-[0_0_30px_rgba(91,46,255,0.5)] transition-all duration-300 flex items-center gap-2"
          >
            <Save size={20} />
            Save Changes
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default Settings
