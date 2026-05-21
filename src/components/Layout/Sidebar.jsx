import { Link, useLocation } from 'react-router-dom'
import { Phone, BarChart, Settings, Activity, Clock, Users, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart },
    { path: '/softphone', label: 'Softphone', icon: Phone },
    { path: '/analytics', label: 'Analytics', icon: Activity },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  const quickActions = [
    { label: 'Active Calls', icon: Phone, count: 3 },
    { label: 'Call History', icon: Clock, count: 24 },
    { label: 'Users', icon: Users, count: 12 },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <>
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-50 w-64 glass border-r border-white/10 lg:hidden"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Phone className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold gradient-text">VoIPSight</span>
          </div>

          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                    ${isActive(item.path)
                      ? 'bg-gradient-primary text-white neon-glow'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </motion.div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside className="hidden lg:flex flex-col w-64 glass border-r border-white/10 h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Phone className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold gradient-text">VoIPSight</span>
          </div>

          <div className="space-y-2 mb-8">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                    ${isActive(item.path)
                      ? 'bg-gradient-primary text-white neon-glow'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <div key={action.label} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="text-accent" />
                      <span className="text-sm text-gray-300">{action.label}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{action.count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-primary/20">
              <Zap size={20} className="text-accent" />
              <div>
                <p className="text-sm font-semibold text-white">Pro Plan</p>
                <p className="text-xs text-gray-400">All features unlocked</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
