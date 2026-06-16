import { Link, useLocation } from 'react-router-dom'
import { Phone, BarChart, Settings, Activity, Clock, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import LogoMark from '../UI/LogoMark'

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
    { label: 'Call History', icon: Clock, count: 0 },
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 glass border-r border-subtle h-screen flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <div className="mb-8">
            <LogoMark size="md" />
          </div>

          <div className="space-y-1 mb-8">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                    ${isActive(item.path)
                      ? 'bg-white/[0.08] text-white border border-[var(--border-light)] neon-glow'
                      : 'text-muted hover:text-white hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="border-t border-subtle pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Quick Stats</h3>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <div key={action.label} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-subtle">
                    <div className="flex items-center gap-3">
                      <Icon size={14} className="text-accent-cyan" />
                      <span className="text-sm text-secondary">{action.label}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-accent-mint">{action.count}</span>
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
