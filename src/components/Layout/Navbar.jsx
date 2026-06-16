import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Phone, BarChart, Settings, LogOut, Menu, X, PieChart, PhoneOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSip } from '../../context/SIPContext'
import LogoMark from '../UI/LogoMark'

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
        <div className="sticky top-0 z-[100] glass border-b border-accent-mint/30 px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium truncate">
            Incoming from{' '}
            <span className="font-mono text-accent-mint">{incomingFrom || 'Unknown'}</span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={rejectCall}
              className="p-2 rounded-full border border-accent-rose/40 text-accent-rose hover:bg-accent-rose/10 transition-colors"
              aria-label="Decline call"
            >
              <PhoneOff size={18} />
            </button>
            <button type="button" onClick={answerCall} className="btn-primary !py-1.5 !px-4 !text-xs">
              Answer
            </button>
          </div>
        </div>
      )}
      <nav className="glass-nav px-6 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted hover:text-white"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Link to="/dashboard">
              <LogoMark size="sm" subtitle={false} />
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              {isRegistered && extension && (
                <span className="text-xs font-mono text-muted">ext {extension}</span>
              )}
              <span className={`status-pill ${sipOnline ? '' : '!border-accent-rose/20 !text-accent-rose !bg-accent-rose/5'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sipOnline ? 'live-dot !w-1.5 !h-1.5' : 'bg-accent-rose'}`} />
                {sipOnline ? 'SIP ready' : isRegistered ? 'Reconnecting' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-200
                    ${isActive(item.path)
                      ? 'bg-white/[0.08] text-white border border-[var(--border-light)] neon-glow'
                      : 'text-muted hover:text-white hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-full transition-colors"
              >
                <div className="logo-mark w-8 h-8">
                  <span className="text-xs font-bold text-[var(--bg-deep)]">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <span className="hidden md:block text-sm text-secondary">{user?.name || 'User'}</span>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 glass rounded-xl overflow-hidden border border-[var(--border-light)]"
                  >
                    <div className="px-4 py-3 border-b border-subtle">
                      <p className="font-semibold text-sm">{user?.name || 'User'}</p>
                      <p className="text-xs text-muted truncate">{user?.email || ''}</p>
                    </div>
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-sm"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings size={16} className="text-accent-cyan" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-accent-rose w-full text-sm"
                    >
                      <LogOut size={16} />
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
