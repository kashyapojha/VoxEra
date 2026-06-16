import { motion } from 'framer-motion'
import { Phone, Clock, Users, TrendingUp } from 'lucide-react'
import GlassCard from '../components/UI/GlassCard'
import PageHeader from '../components/UI/PageHeader'
import ActiveCalls from '../components/Monitoring/ActiveCalls'
import NetworkStatus from '../components/Monitoring/NetworkStatus'
import RealtimeChart from '../components/Analytics/RealtimeChart'
import SIPLogs from '../components/Monitoring/SIPLogs'
import { useSip } from '../context/SIPContext'
import { useSocket } from '../context/SocketContext'
import { useEffect, useState } from 'react'

const ACCENT_STATS = [
  { color: 'text-accent-cyan', bg: 'icon-badge-cyan' },
  { color: 'text-accent-mint', bg: 'icon-badge-mint' },
  { color: 'text-accent-violet', bg: 'icon-badge-violet' },
  { color: 'text-accent-amber', bg: 'icon-badge-amber' },
]

const Dashboard = () => {
  const { isRegistered, currentCall, callDuration } = useSip()
  const { socket, backendUrl } = useSocket()
  const [statsBackend, setStatsBackend] = useState({ totalCalls: 0, completedCalls: 0 })

  useEffect(() => {
    let mounted = true
    fetch(`${backendUrl.replace(/\/$/, '')}/api/stats`)
      .then((res) => res.json())
      .then((data) => { if (mounted) setStatsBackend(data || { totalCalls: 0 }) })
      .catch(() => {})
    const onStats = (payload) => { if (payload) setStatsBackend((prev) => ({ ...prev, ...payload })) }
    if (socket) socket.on('stats_update', onStats)
    return () => { mounted = false; if (socket) socket.off('stats_update', onStats) }
  }, [backendUrl, socket])

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const totalCalls = statsBackend.totalCalls || 0
  const completedCalls = statsBackend.completedCalls || 0
  const successRate = totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : '0.0'

  const stats = [
    { label: 'Total Calls', value: totalCalls.toString(), icon: Phone },
    { label: 'Call Duration', value: currentCall ? formatDuration(callDuration) : '--:--', icon: Clock },
    { label: 'SIP Status', value: isRegistered ? 'Online' : 'Offline', icon: Users },
    { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Dashboard"
        description="Monitor your VoIP infrastructure in real-time"
        live
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const accent = ACCENT_STATS[index % ACCENT_STATS.length]
          return (
            <GlassCard key={stat.label} hover accent={['cyan', 'mint', 'violet', 'amber'][index % 4]}>
              <div className={`icon-badge mb-4 ${accent.bg}`}>
                <Icon size={22} className={accent.color} />
              </div>
              <p className="font-mono text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-muted text-sm">{stat.label}</p>
            </GlassCard>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RealtimeChart />
        <ActiveCalls />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetworkStatus />
        <SIPLogs />
      </div>
    </motion.div>
  )
}

export default Dashboard
