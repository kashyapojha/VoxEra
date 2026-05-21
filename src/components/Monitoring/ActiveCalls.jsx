import { Phone, PhoneOff, Clock, User } from 'lucide-react'
import GlassCard from '../UI/GlassCard'
import { useSIP } from '../../context/SIPContext'

const ActiveCalls = () => {
  const { currentCall, incomingCall, callDuration, callStatus } = useSIP()

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

  const activeCalls = []
  if (currentCall) {
    activeCalls.push({
      id: 1,
      caller: currentCall.remote_identity?.uri?.user || 'Unknown',
      duration: callDuration,
      status: callStatus,
      direction: 'outbound'
    })
  }
  if (incomingCall) {
    activeCalls.push({
      id: 2,
      caller: incomingCall.remote_identity?.uri?.user || 'Unknown',
      duration: 0,
      status: 'ringing',
      direction: 'inbound'
    })
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Phone size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Active Calls</h3>
        </div>
        <span className="text-sm text-gray-400">{activeCalls.length} active</span>
      </div>

      <div className="space-y-3">
        {activeCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Phone size={48} className="mb-2 opacity-50" />
            <p>No active calls</p>
          </div>
        ) : (
          activeCalls.map((call) => (
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
