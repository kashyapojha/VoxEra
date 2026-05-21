import { motion } from 'framer-motion'
import { Phone, Clock, TrendingUp, Users, AlertCircle, BarChart } from 'lucide-react'
import GlassCard from '../components/UI/GlassCard'
import ActiveCalls from '../components/Monitoring/ActiveCalls'
import NetworkStatus from '../components/Monitoring/NetworkStatus'
import RealtimeChart from '../components/Analytics/RealtimeChart'
import SIPLogs from '../components/Monitoring/SIPLogs'
import { useSIP } from '../context/SIPContext'

const Dashboard = () => {
  const { sipLogs, currentCall, isRegistered, callDuration } = useSIP()

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const completedCalls = sipLogs.filter(log => log.level === 'success').length
  const failedCalls = sipLogs.filter(log => log.level === 'error').length
  const totalCalls = completedCalls + failedCalls
  const successRate = totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : '0.0'

  const stats = [
    {
      label: 'Total Calls',
      value: totalCalls.toString(),
      change: '0%',
      icon: Phone,
      color: 'text-blue-400'
    },
    {
      label: 'Current Duration',
      value: currentCall ? formatDuration(callDuration) : '--:--',
      change: '0%',
      icon: Clock,
      color: 'text-green-400'
    },
    {
      label: 'SIP Status',
      value: isRegistered ? 'Online' : 'Offline',
      change: isRegistered ? '+100%' : '-100%',
      icon: Users,
      color: isRegistered ? 'text-purple-400' : 'text-red-400'
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      change: '0%',
      icon: TrendingUp,
      color: 'text-accent'
    }
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <GlassCard key={index} hover glow>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary/20 flex items-center justify-center">
                  <Icon size={24} className={stat.color} />
                </div>
                <span className={`text-sm font-semibold ${stat.change.startsWith('+') ? 'text-green-400' : 'text-gray-400'}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </GlassCard>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
