import { useSIP } from '../../context/SIPContext'
import { Activity, ArrowUpRight, ArrowDownLeft, Clock, Signal } from 'lucide-react'
import GlassCard from '../UI/GlassCard'

const RTPMetrics = () => {
  const { rtpMetrics } = useSIP()

  const metrics = [
    {
      label: 'Packets Sent',
      value: rtpMetrics.packetsSent.toLocaleString(),
      icon: ArrowUpRight,
      color: 'text-green-400'
    },
    {
      label: 'Packets Received',
      value: rtpMetrics.packetsReceived.toLocaleString(),
      icon: ArrowDownLeft,
      color: 'text-blue-400'
    },
    {
      label: 'Bytes Sent',
      value: `${(rtpMetrics.bytesSent / 1024).toFixed(2)} KB`,
      icon: ArrowUpRight,
      color: 'text-purple-400'
    },
    {
      label: 'Bytes Received',
      value: `${(rtpMetrics.bytesReceived / 1024).toFixed(2)} KB`,
      icon: ArrowDownLeft,
      color: 'text-cyan-400'
    },
    {
      label: 'Jitter',
      value: `${rtpMetrics.jitter.toFixed(2)} ms`,
      icon: Activity,
      color: 'text-yellow-400'
    },
    {
      label: 'RTT',
      value: `${rtpMetrics.rtt.toFixed(2)} ms`,
      icon: Clock,
      color: 'text-orange-400'
    },
    {
      label: 'Packet Loss',
      value: `${rtpMetrics.packetLoss.toFixed(2)}%`,
      icon: Signal,
      color: 'text-red-400'
    },
  ]

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-6">
        <Activity size={20} className="text-accent" />
        <h3 className="text-lg font-semibold">RTP Metrics</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <div
              key={index}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={metric.color} />
                <span className="text-xs text-gray-400">{metric.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{metric.value}</p>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

export default RTPMetrics
