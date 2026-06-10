import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Phone, BarChart, Settings, LogOut, Menu, X, PieChart, PhoneOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSip } from '../../context/SIPContext'

const Navbar = ({ onMenuClick, isMobileMenuOpen }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const {
    isRegistered,
    sipOnline,
    extension,
    incomingCall,
    incomingFrom,
    answerCall,
    rejectCall,
  } = useSip()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart },
    { path: '/softphone', label: 'Softphone', icon: Phone },
    { path: '/analytics', label: 'Analytics', icon: PieChart },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
    setIsDropdownOpen(false)
  }

  return (
    <>
    {incomingCall && (
      <div className="sticky top-0 z-[100] bg-green-600/95 border-b border-green-400/40 px-4 py-2 flex items-center justify-between gap-3">
        <p className="text-sm text-white font-medium truncate">
          Incoming call from <span className="font-mono">{incomingFrom || 'Unknown'}</span>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={rejectCall}
            className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
            aria-label="Decline call"
          >
            <PhoneOff size={18} />
          </button>
          <button
            type="button"
            onClick={answerCall}
            className="px-3 py-1.5 rounded-full bg-white text-green-700 text-sm font-semibold hover:bg-green-50"
          >
            Answer
          </button>
        </div>
      </div>
    )}
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
            <img src="/voxera-logo.png" alt="VoxEra Logo" className="w-24 h-24" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold gradient-text">VoxEra</span>
              <span className="text-xs text-gray-400">Enterprise Communications</span>
            </div>
            <div className="flex items-center gap-2">
              {isRegistered && extension && (
                <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                  ext {extension}
                </span>
              )}
              <span className={`text-sm px-2 py-1 rounded-full ${
                sipOnline ? 'bg-green-500/20 text-green-400'
                  : isRegistered ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/10 text-red-400'
              }`}>
                {sipOnline ? 'SIP ready' : isRegistered ? 'SIP reconnecting' : 'SIP offline'}
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
    </>
  )
}

export default Navbar
