import { motion } from 'framer-motion'
import { Phone, Clock, Users, TrendingUp } from 'lucide-react'
import GlassCard from '../components/UI/GlassCard'
import ActiveCalls from '../components/Monitoring/ActiveCalls'
import NetworkStatus from '../components/Monitoring/NetworkStatus'
import RealtimeChart from '../components/Analytics/RealtimeChart'
import SIPLogs from '../components/Monitoring/SIPLogs'
import { useSip } from '../context/SipContext'
import { useSocket } from '../context/SocketContext'
import { useEffect, useState } from 'react'

const Dashboard = () => {
  const { isRegistered, currentCall, callDuration } = useSip()
  const { socket, backendUrl } = useSocket()
  const [statsBackend, setStatsBackend] = useState({ totalCalls: 0, completedCalls: 0 })

  useEffect(() => {
    let mounted = true
    fetch(`${backendUrl.replace(/\/$/, '')}/api/stats`)
      .then(res => res.json())
      .then(data => { if (!mounted) return; setStatsBackend(data || { totalCalls: 0 }) })
      .catch(() => {})

    const onStats = (payload) => {
      if (payload) setStatsBackend(prev => ({ ...prev, ...payload }))
    }
    if (socket) socket.on('stats_update', onStats)
    return () => { mounted = false; if (socket) socket.off('stats_update', onStats) }
  }, [backendUrl, socket])

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const totalCalls     = statsBackend.totalCalls || 0
  const completedCalls = statsBackend.completedCalls || 0
  const successRate    = totalCalls > 0
    ? ((completedCalls / totalCalls) * 100).toFixed(1)
    : '0.0'

  const stats = [
    {
      label: 'Total Calls',
      value: totalCalls.toString(),
      icon: Phone,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      label: 'Call Duration',
      value: currentCall ? formatDuration(callDuration) : '--:--',
      icon: Clock,
      color: 'text-green-400',
      bg: 'bg-green-500/10'
    },
    {
      label: 'SIP Status',
      value: isRegistered ? 'Online' : 'Offline',
      icon: Users,
      color: isRegistered ? 'text-purple-400' : 'text-red-400',
      bg: isRegistered ? 'bg-purple-500/10' : 'bg-red-500/10'
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      icon: TrendingUp,
      color: 'text-accent',
      bg: 'bg-accent/10'
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Monitor your VoIP infrastructure in real-time</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <GlassCard key={index} hover glow>
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                <Icon size={24} className={stat.color} />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </GlassCard>
          )
        })}
      </div>

      {/* CHART + ACTIVE CALLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RealtimeChart />
        <ActiveCalls />
      </div>

      {/* NETWORK + SIP LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetworkStatus />
        <SIPLogs />
      </div>
    </motion.div>
  )
}

export default Dashboard