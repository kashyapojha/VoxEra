import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'

const Landing = () => {
  const { backendUrl, socket } = useSocket()
  const [callsProcessed, setCallsProcessed] = useState('0')

  useEffect(() => {
    let mounted = true
    fetch(`${backendUrl.replace(/\/$/, '')}/api/stats`)
      .then(res => res.json())
      .then(data => { if (!mounted) return; setCallsProcessed(String(data?.totalCalls || 0)) })
      .catch(() => {})

    const onStats = (p) => {
      if (p && mounted && p.totalCalls !== undefined) setCallsProcessed(String(p.totalCalls))
    }
    if (socket) socket.on('stats_update', onStats)
    return () => { mounted = false; if (socket) socket.off('stats_update', onStats) }
  }, [backendUrl, socket])

  const stats = [
    { value: '99.9%',          label: 'Uptime' },
    { value: callsProcessed,   label: 'Calls Processed' },
    { value: '45ms',           label: 'Avg Latency' },
    { value: '24/7',           label: 'Support' },
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      {/* NAV */}
      <nav className="relative z-10 glass border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Phone className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold gradient-text">VoIPSight</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
              Login
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg bg-gradient-primary text-white font-semibold hover:shadow-[0_0_30px_rgba(91,46,255,0.5)] transition-all duration-300"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl lg:text-7xl font-bold mb-6">
              <span className="gradient-text">Next-Gen</span> SIP Softphone
              <br />& Call Monitoring
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Enterprise-grade VoIP solution with real-time monitoring,
              advanced analytics, and seamless integration for modern communication needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="px-8 py-4 rounded-xl bg-gradient-primary text-white font-semibold text-lg hover:shadow-[0_0_40px_rgba(91,46,255,0.6)] transition-all duration-300 flex items-center justify-center gap-2"
              >
                Launch Dashboard
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 rounded-xl glass text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Sign In
              </Link>
            </div>
          </motion.div>

          {/* STATS */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="glass-card text-center hover:scale-105 transition-transform duration-300"
              >
                <p className="text-3xl lg:text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-gray-400 mt-2">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 glass border-t border-white/10 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Phone className="text-white" size={16} />
            </div>
            <span className="font-bold gradient-text">VoIPSight</span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 VoIPSight. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing