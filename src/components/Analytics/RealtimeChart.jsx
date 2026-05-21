import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Activity } from 'lucide-react'
import GlassCard from '../UI/GlassCard'
import { useSocket } from '../../context/SocketContext'

const RealtimeChart = () => {
  const [data, setData] = useState([])
  const { isConnected } = useSocket()

  useEffect(() => {
    if (!isConnected) {
      setData([])
      return
    }

    const now = new Date()
    const newData = []
    
    for (let i = 0; i < 20; i++) {
      const time = new Date(now - (19 - i) * 1000)
      newData.push({
        time: time.toLocaleTimeString(),
        calls: 0,
        bandwidth: 0,
        latency: 0
      })
    }
    
    setData(newData)
  }, [isConnected])

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Realtime Analytics</h3>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 text-xs rounded-full ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="h-64">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Activity size={48} className="mb-2 opacity-50" />
            <p>No data available</p>
            <p className="text-sm mt-1">Connect to SIP server to see real-time analytics</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B2EFF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#5B2EFF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBandwidth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A6FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00A6FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => value.split(':')[1]}
              />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(8, 17, 32, 0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="calls" 
                stroke="#5B2EFF" 
                fillOpacity={1} 
                fill="url(#colorCalls)"
                name="Active Calls"
              />
              <Area 
                type="monotone" 
                dataKey="bandwidth" 
                stroke="#00A6FF" 
                fillOpacity={1} 
                fill="url(#colorBandwidth)"
                name="Bandwidth (Mbps)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  )
}

export default RealtimeChart
