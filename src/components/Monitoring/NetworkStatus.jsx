import { Wifi, Signal, Server, Cpu } from 'lucide-react'
import GlassCard from '../UI/GlassCard'
import { useSip } from '../../context/SIPContext'

const NetworkStatus = () => {
  const { rtpMetrics, isRegistered } = useSip()

  const getStatusColor = (value, type) => {
    if (type === 'latency') {
      return value < 50 ? 'text-green-400' : value < 100 ? 'text-yellow-400' : 'text-red-400'
    }
    if (type === 'packetLoss') {
      return value < 1 ? 'text-green-400' : value < 3 ? 'text-yellow-400' : 'text-red-400'
    }
    if (type === 'usage') {
      return value < 50 ? 'text-green-400' : value < 80 ? 'text-yellow-400' : 'text-red-400'
    }
    return 'text-gray-400'
  }

  const stats = [
    {
      label: 'RTT',
      value: `${rtpMetrics.rtt.toFixed(2)} ms`,
      icon: Signal,
      color: getStatusColor(rtpMetrics.rtt, 'latency')
    },
    {
      label: 'Jitter',
      value: `${rtpMetrics.jitter.toFixed(2)} ms`,
      icon: Signal,
      color: getStatusColor(rtpMetrics.jitter, 'latency')
    },
    {
      label: 'Packet Loss',
      value: `${rtpMetrics.packetLoss.toFixed(2)}%`,
      icon: Signal,
      color: getStatusColor(rtpMetrics.packetLoss, 'packetLoss')
    },
    {
      label: 'Packets Sent',
      value: rtpMetrics.packetsSent.toLocaleString(),
      icon: Wifi,
      color: 'text-blue-400'
    },
    {
      label: 'Packets Received',
      value: rtpMetrics.packetsReceived.toLocaleString(),
      icon: Wifi,
      color: 'text-green-400'
    },
    {
      label: 'SIP Status',
      value: isRegistered ? 'Registered' : 'Not Registered',
      icon: Server,
      color: isRegistered ? 'text-green-400' : 'text-red-400'
    },
  ]

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-6">
        <Wifi size={20} className="text-accent" />
        <h3 className="text-lg font-semibold">Network Status</h3>
      </div>

      {!isRegistered ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <Server size={48} className="mb-2 opacity-50" />
          <p>Not connected to SIP server</p>
          <p className="text-sm mt-1">Register to see network metrics</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={stat.color} />
                  <span className="text-xs text-gray-400">{stat.label}</span>
                </div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}

export default NetworkStatus
