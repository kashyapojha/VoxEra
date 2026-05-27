import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Phone, BarChart, Settings, LogOut, Menu, X, PieChart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSIP } from '../../context/SIPContext'

const Navbar = ({ onMenuClick, isMobileMenuOpen }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isRegistered } = useSIP()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart },
    { path: '/softphone', label: 'Softphone', icon: Phone },
    { path: '/reports', label: 'Reports', icon: PieChart },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
    setIsDropdownOpen(false)
  }

  return (
    <nav className="glass border-b border-white/10 px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Phone className="text-white" size={20} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold gradient-text">VoIPSight</span>
              <span className={`text-sm px-2 py-1 rounded-full ${isRegistered ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {isRegistered ? 'Online' : 'Offline'}
              </span>
            </div>
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300
                  ${isActive(item.path)
                    ? 'bg-gradient-primary text-white neon-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <span className="text-sm font-bold">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <span className="hidden md:block text-sm">{user?.name || 'User'}</span>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-48 glass rounded-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="font-semibold text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-400">{user?.email || ''}</p>
                  </div>
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-red-400 w-full"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
