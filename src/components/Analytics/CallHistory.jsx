import { History, PhoneIncoming, PhoneOutgoing, Clock, Calendar } from 'lucide-react'
import GlassCard from '../UI/GlassCard'
import { useSip } from '../../context/SIPContext'
import { useSocket } from '../../context/SocketContext'
import { useEffect, useState } from 'react'

const CallHistory = () => {
  const { sipLogs } = useSip()
  const { socket, backendUrl } = useSocket()
  const [callHistory, setCallHistory] = useState([])

  useEffect(() => {
    let mounted = true
    fetch(`${backendUrl.replace(/\/$/, '')}/api/calls`)
      .then(res => res.json())
      .then(data => {
        if (!mounted) return
        if (Array.isArray(data)) {
          // normalize timestamps and durations
          const normalized = data.map((c, i) => ({
            id: c.id ?? i,
            caller: c.caller || c.from || 'Unknown',
            direction: c.direction || 'outbound',
            status: c.status || 'completed',
            duration: Number(c.duration) || 0,
            timestamp: c.timestamp ? new Date(c.timestamp) : new Date()
          }))
          setCallHistory(normalized)
        }
      }).catch(() => {})

    const onUpdate = (payload) => {
      if (!payload) return
      // payload could be an array or single entry
      if (Array.isArray(payload)) setCallHistory(payload.map((c, i) => ({ id: c.id ?? i, caller: c.caller || c.from || 'Unknown', direction: c.direction || 'outbound', status: c.status || 'completed', duration: Number(c.duration) || 0, timestamp: c.timestamp ? new Date(c.timestamp) : new Date() })))
      else setCallHistory(prev => [{ id: payload.id ?? Date.now(), caller: payload.caller || payload.from || 'Unknown', direction: payload.direction || 'outbound', status: payload.status || 'completed', duration: Number(payload.duration) || 0, timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date() }, ...prev])
    }

    if (socket) socket.on('call_history_update', onUpdate)

    return () => {
      mounted = false
      if (socket) socket.off('call_history_update', onUpdate)
    }
  }, [socket, backendUrl])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20'
      case 'missed':
        return 'text-red-400 bg-red-500/20'
      case 'failed':
        return 'text-orange-400 bg-orange-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getDirectionIcon = (direction) => {
    return direction === 'inbound' ? PhoneIncoming : PhoneOutgoing
  }

  const getDirectionColor = (direction) => {
    return direction === 'inbound' ? 'text-blue-400' : 'text-purple-400'
  }

  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Call History</h3>
        </div>
        <span className="text-sm text-gray-400">{callHistory.length} calls</span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
        {callHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <History size={48} className="mb-2 opacity-50" />
            <p>No call history</p>
          </div>
        ) : (
          callHistory.map((call) => {
            const DirectionIcon = getDirectionIcon(call.direction)
            return (
              <div
                key={call.id}
                className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary/20 flex items-center justify-center">
                      <DirectionIcon size={18} className={getDirectionColor(call.direction)} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{call.caller}</p>
                      <p className={`text-xs ${getDirectionColor(call.direction)}`}>
                        {call.direction}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(call.status)}`}>
                    {call.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{call.duration > 0 ? formatDuration(call.duration) : '--:--'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{call.timestamp.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{call.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </GlassCard>
  )
}

export default CallHistory
