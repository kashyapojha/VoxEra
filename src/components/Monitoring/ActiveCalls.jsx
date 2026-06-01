import { Phone, PhoneOff, Clock, User } from 'lucide-react'
import GlassCard from '../UI/GlassCard'
import { useSip } from '../../context/SIPContext'
import { useSocket } from '../../context/SocketContext'
import { useEffect, useState } from 'react'

const ActiveCalls = () => {
  const { currentCall, incomingCall, callDuration, callStatus } = useSip()
  const { socket, backendUrl } = useSocket()
  const [activeCalls, setActiveCalls] = useState([])

  useEffect(() => {
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
    const secs = Math.max(0, Number(seconds) || 0)
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  const displayDuration = (call) => {
    if (call.status === 'ringing' || call.status === 'calling') return 'Ringing...'
    if (call.connectedAt) {
      return formatDuration(Math.floor((Date.now() - call.connectedAt) / 1000))
    }
    return formatDuration(call.duration)
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

  const mergedCalls = [...activeCalls]

  if (currentCall && callStatus === 'connected') {
    const remote = currentCall.remote_identity?.uri?.user || 'Unknown'
    const callId = currentCall.request?.call_id || currentCall.id
    const idx = mergedCalls.findIndex(c => c.id === callId)
    const localEntry = {
      id: callId || 'local',
      caller: remote,
      callee: '',
      duration: callDuration,
      connectedAt: null,
      status: 'connected',
      direction: 'outbound',
    }
    if (idx >= 0) {
      mergedCalls[idx] = { ...mergedCalls[idx], duration: mergedCalls[idx].duration ?? callDuration }
    } else {
      mergedCalls.unshift(localEntry)
    }
  }

  if (incomingCall) {
    const remote = incomingCall.remote_identity?.uri?.user || 'Unknown'
    const callId = incomingCall.request?.call_id || 'incoming'
    if (!mergedCalls.find(c => c.id === callId)) {
      mergedCalls.unshift({
        id: callId,
        caller: remote,
        duration: 0,
        status: 'ringing',
        direction: 'inbound',
      })
    }
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
                    <p className="font-semibold text-white">
                      {call.caller}{call.callee ? ` → ${call.callee}` : ''}
                    </p>
                    <p className={`text-xs ${getDirectionColor(call.direction)}`}>
                      {call.direction || 'call'}
                    </p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(call.status)}`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock size={14} />
                  <span className="text-sm font-mono">{displayDuration(call)}</span>
                </div>
                <button type="button" className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
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
