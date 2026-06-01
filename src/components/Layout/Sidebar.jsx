import { Link, useLocation } from 'react-router-dom'
import { Phone, BarChart, Settings, Activity, Clock, Users } from 'lucide-react'
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
    { label: 'Active Calls', icon: Phone, count: 0 },
    { label: 'Call History', icon: Clock, count:- 0  },
    { label: 'Users', icon: Users, count: 0 },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 glass border-r border-white/10 h-screen flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img src="/voxera-logo.png" alt="VoxEra Logo" className="w-24 h-24" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold gradient-text">VoxEra</span>
              <span className="text-xs text-gray-400">Enterprise Communications</span>
            </div>
          </div>

          <div className="space-y-2 mb-8">
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


        </div>
      </aside>
    </>
  )
}

export default Sidebar
