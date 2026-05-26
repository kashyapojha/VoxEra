import { Phone, PhoneOff, Clock, User } from 'lucide-react'
import GlassCard from '../UI/GlassCard'
import { useSIP } from '../../context/SIPContext'
import { useSocket } from '../../context/SocketContext'
import { useEffect, useState } from 'react'

const ActiveCalls = () => {
  const { currentCall, incomingCall, callDuration, callStatus } = useSIP()
  const { socket, backendUrl } = useSocket()
  const [activeCalls, setActiveCalls] = useState([])

  useEffect(() => {
    // fetch initial active calls
    let mounted = true
    fetch(`${backendUrl.replace(/\/$/, '')}/api/active-calls`)
      .then(res => res.json())
      .then(data => {
        if (!mounted) return
        if (Array.isArray(data)) setActiveCalls(data)
      })
      .catch(() => {})

    const onActive = (payload) => {
      if (payload && Array.isArray(payload)) setActiveCalls(payload)
    }

    if (socket) socket.on('active_calls_update', onActive)

    return () => {
      mounted = false
      if (socket) socket.off('active_calls_update', onActive)
    }
  }, [socket, backendUrl])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'ringing':
        return 'bg-yellow-500 animate-pulse'
      case 'calling':
        return 'bg-blue-500 animate-pulse'
      default:
        return 'bg-gray-500'
    }
  }

  const getDirectionColor = (direction) => {
    return direction === 'inbound' ? 'text-blue-400' : 'text-purple-400'
  }

  // Merge local activeCalls with current session state for accurate UI
  const mergedCalls = [...activeCalls]
  if (currentCall) {
    const found = mergedCalls.find(c => c.id === 'local')
    if (!found) mergedCalls.unshift({ id: 'local', caller: currentCall.remote_identity?.uri?.user || 'Local', duration: callDuration || 0, status: callStatus || 'connected', direction: 'outbound' })
  }
  if (incomingCall) {
    const found = mergedCalls.find(c => c.id === 'incoming')
    if (!found) mergedCalls.unshift({ id: 'incoming', caller: incomingCall.remote_identity?.uri?.user || 'Unknown', duration: 0, status: 'ringing', direction: 'inbound' })
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Phone size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Active Calls</h3>
        </div>
        <span className="text-sm text-gray-400">{mergedCalls.length} active</span>
      </div>

      <div className="space-y-3">
        {mergedCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Phone size={48} className="mb-2 opacity-50" />
            <p>No active calls</p>
          </div>
        ) : (
          mergedCalls.map((call) => (
            <div
              key={call.id}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary/20 flex items-center justify-center">
                    <User size={20} className="text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{call.caller}</p>
                    <p className={`text-xs ${getDirectionColor(call.direction)}`}>
                      {call.direction}
                    </p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(call.status)}`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock size={14} />
                  <span className="text-sm">
                    {call.status === 'ringing' ? 'Ringing...' : formatDuration(call.duration)}
                  </span>
                </div>
                <button className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                  <PhoneOff size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  )
}

export default ActiveCalls
