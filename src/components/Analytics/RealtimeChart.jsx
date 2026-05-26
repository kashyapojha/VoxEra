import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity } from 'lucide-react'
import GlassCard from '../UI/GlassCard'
import { useSocket } from '../../context/SocketContext'

const generateEmptyData = () => {
  const now = Date.now()
  return Array.from({ length: 20 }, (_, i) => {
    const t = new Date(now - (19 - i) * 3000)
    return {
      time: t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      calls: 0,
      latency: 0
    }
  })
}

const RealtimeChart = () => {
  const [data, setData] = useState(generateEmptyData)
  const { isConnected, socket } = useSocket()

  // Tick every 3 seconds to keep chart moving even with no calls
  useEffect(() => {
    const ticker = setInterval(() => {
      setData(prev => {
        const now = new Date()
        const last = prev[prev.length - 1]
        const point = {
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          calls: last?.calls || 0,
          latency: last?.latency || 0
        }
        return [...prev.slice(-19), point]
      })
    }, 3000)
    return () => clearInterval(ticker)
  }, [])

  // Update from socket
  useEffect(() => {
    if (!socket) return

    const onActive = (payload) => {
      setData(prev => {
        const now = new Date()
        const point = {
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          calls: Number(Array.isArray(payload) ? payload.length : payload?.activeCalls) || 0,
          latency: Number(payload?.latency) || 0
        }
        return [...prev.slice(-19), point]
      })
    }

    const onQuality = (q) => {
      setData(prev => {
        if (!prev.length) return prev
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), { ...last, latency: Number(q.latency) || last.latency }]
      })
    }

    socket.on('active_calls_update', onActive)
    socket.on('quality_update', onQuality)
    return () => {
      socket.off('active_calls_update', onActive)
      socket.off('quality_update', onQuality)
    }
  }, [socket])

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Realtime Analytics</h3>
        </div>
        <span className={`px-3 py-1 text-xs rounded-full ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5B2EFF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#5B2EFF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00A6FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00A6FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="time"
              stroke="#555"
              fontSize={10}
              tickFormatter={(v) => v.slice(3, 8)}
              interval={4}
            />
            <YAxis stroke="#555" fontSize={10} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(8,17,32,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value, name) => [
                name === 'calls' ? `${value} calls` : `${value} ms`,
                name === 'calls' ? 'Active Calls' : 'Latency'
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Area type="monotone" dataKey="calls" stroke="#5B2EFF" fillOpacity={1} fill="url(#colorCalls)" name="calls" />
            <Area type="monotone" dataKey="latency" stroke="#00A6FF" fillOpacity={1} fill="url(#colorLatency)" name="latency" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#5B2EFF]" />
          <span className="text-xs text-gray-400">Active Calls</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00A6FF]" />
          <span className="text-xs text-gray-400">Latency (ms)</span>
        </div>
      </div>
    </GlassCard>
  )
}

export default RealtimeChart