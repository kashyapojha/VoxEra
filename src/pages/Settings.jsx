import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Bell, Shield, Phone, Globe, Save, LogOut } from 'lucide-react'
import GlassCard from '../components/UI/GlassCard'
import { useSIP } from '../context/SIPContext'

const Settings = () => {
  const { isRegistered, register, unregister } = useSIP()
  const [sipConfig, setSipConfig] = useState({
    websocket: 'wss://sip.voipsight.com:8089/ws',
    uri: 'sip:1001@voipsight.com',
    password: ''
  })

  const handleSIPRegister = () => {
    register(sipConfig)
  }

  const handleSIPUnregister = () => {
    unregister()
  }

  const settingsSections = [
    {
      icon: User,
      title: 'Profile Settings',
      items: [
        { label: 'Display Name', type: 'text', value: 'John Doe' },
        { label: 'Email', type: 'email', value: 'john@example.com' },
        { label: 'Extension', type: 'text', value: '1001' }
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
                      onChange={(e) => setSipConfig({ ...sipConfig, uri: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={sipConfig.password}
                      onChange={(e) => setSipConfig({ ...sipConfig, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isRegistered ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-400">
                      {isRegistered ? 'Registered' : 'Not Registered'}
                    </span>
                  </div>
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
                        className="px-6 py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:shadow-[0_0_30px_rgba(91,46,255,0.5)] transition-all duration-300"
                      >
                        Register
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
            <button className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-colors">
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
