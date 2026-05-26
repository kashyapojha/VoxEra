import { motion } from 'framer-motion'
import { BarChart, PieChart } from 'lucide-react'
import GlassCard from '../components/UI/GlassCard'
import RealtimeChart from '../components/Analytics/RealtimeChart'
import CallHistory from '../components/Analytics/CallHistory'
import { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'

const Analytics = () => {
  const [calls, setCalls] = useState([])
  const { socket, backendUrl } = useSocket()

  useEffect(() => {
    let mounted = true
    fetch(`${backendUrl.replace(/\/$/, '')}/api/calls`)
      .then(res => res.json())
      .then(data => {
        if (!mounted) return
        if (Array.isArray(data)) setCalls(data.map(c => ({ ...c, duration: Number(c.duration) || 0, timestamp: c.timestamp ? new Date(c.timestamp) : new Date() })))
      }).catch(() => {})

    const onUpdate = (payload) => {
      if (!payload) return
      if (Array.isArray(payload)) setCalls(payload.map(c => ({ ...c, duration: Number(c.duration) || 0, timestamp: c.timestamp ? new Date(c.timestamp) : new Date() })))
      else setCalls(prev => [{ ...payload, duration: Number(payload.duration) || 0, timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date() }, ...prev])
    }

    if (socket) socket.on('call_history_update', onUpdate)

    return () => {
      mounted = false
      if (socket) socket.off('call_history_update', onUpdate)
    }
  }, [backendUrl, socket])

  const completedCalls = calls.filter(c => c.status === 'completed').length
  const failedCalls = calls.filter(c => c.status === 'failed').length
  const missedCalls = calls.filter(c => c.status === 'missed' || c.status === 'no-answer').length
  const inProgress = calls.filter(c => c.status === 'in-progress' || c.status === 'connected').length
  const totalCalls = calls.length

  const callStats = [
    { label: 'Completed', value: completedCalls, color: 'bg-green-500' },
    { label: 'Missed', value: missedCalls, color: 'bg-red-500' },
    { label: 'Failed', value: failedCalls, color: 'bg-orange-500' },
    { label: 'In Progress', value: inProgress, color: 'bg-blue-500' }
  ]

  // Top callers
  const callersMap = {}
  calls.forEach(c => {
    const caller = c.caller || c.from || 'Unknown'
    callersMap[caller] = (callersMap[caller] || 0) + 1
  })
  const topCallers = Object.entries(callersMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,calls]) => ({ name, calls }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-gray-400">Detailed call analytics and reporting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GlassCard>
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={20} className="text-accent" />
            <h3 className="text-lg font-semibold">Call Distribution</h3>
          </div>
          {totalCalls === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <PieChart size={48} className="mb-2 opacity-50" />
              <p>No call data available</p>
              <p className="text-sm mt-1">Make calls to see analytics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {callStats.map((stat, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">{stat.label}</span>
                    <span className="text-sm font-semibold">{stat.value}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: totalCalls > 0 ? `${(stat.value / totalCalls) * 100}%` : '0%' }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={`h-full ${stat.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-6">
            <BarChart size={20} className="text-accent" />
            <h3 className="text-lg font-semibold">Top Callers</h3>
          </div>
          {topCallers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <BarChart size={48} className="mb-2 opacity-50" />
              <p>No caller data available</p>
              <p className="text-sm mt-1">Make calls to see top callers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCallers.map((caller, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-white">{caller.name}</p>
                    <p className="text-xs text-gray-400">{caller.calls} calls</p>
                  </div>
                  <span className="text-sm text-gray-300">{caller.duration}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

  

      <CallHistory />
    </motion.div>
  )
}

export default Analytics
