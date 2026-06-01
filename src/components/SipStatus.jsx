import React from 'react'
import { useSip } from '../hooks/useSip'

/**
 * SIP Status Component
 * Displays current SIP connection and registration status
 */
export function SipStatus() {
  const { 
    isRegistered, 
    connectionStatus, 
    extension, 
    callStatus,
    callDuration,
    incomingCall,
    incomingFrom,
    registrationError
  } = useSip()

  const isConnected = connectionStatus === 'connected'
  const hasIncomingCall = callStatus === 'incoming' || !!incomingCall
  const error = registrationError
  const statusMessage = connectionStatus === 'connecting' ? 'Connecting to SIP server...' : null

  const getStatusColor = () => {
    if (!isConnected) return 'text-red-400'
    if (!isRegistered) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getStatusBgColor = () => {
    if (!isConnected) return 'bg-red-500/10'
    if (!isRegistered) return 'bg-yellow-500/10'
    return 'bg-green-500/10'
  }

  const getStatusBorderColor = () => {
    if (!isConnected) return 'border-red-400/30'
    if (!isRegistered) return 'border-yellow-400/30'
    return 'border-green-400/30'
  }

  const getStatusIcon = () => {
    if (!isConnected) {
      return (
        <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 011.1 9.5c0-.823.023-1.077.088-1.5H2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H4.088c.065.423.088.677.088 1.5a6 6 0 01-1.5-1.5h1.412a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H3.088c.065.423.088.677.088 1.5a6 6 0 001.5 1.5v-1.412a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H4.088C4.023 18.923 4 19.177 4 20a6 6 0 001.5-1.5v1.412a.5.5 0 01.5.5h2a.5.5 0 01.5-.5v-2a.5.5 0 01-.5-.5H8.088c.065-.423.088-.677.088-1.5a6 6 0 00-1.5-1.5v1.412a.5.5 0 01.5.5h2a.5.5 0 01.5-.5v-2a.5.5 0 01-.5-.5H8.088C8.023 11.577 8 11.323 8 10.5a6 6 0 001.5-1.5v1.412a.5.5 0 01.5.5h2a.5.5 0 01.5-.5v-2a.5.5 0 01-.5-.5H9.088C9.023 7.077 9 6.823 9 6a6 6 0 001.5 1.5V6.088a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-1.412A6 6 0 0114.5 10.5a6 6 0 00-1.023-3.36" clipRule="evenodd" />
        </svg>
      )
    }
    if (!isRegistered) {
      return (
        <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 1114.869 2.7c.401.82 0 1.989-.188 4.1H16.48a1 1 0 01-.996 1.09A9 9 0 103.89 3.11a1 1 0 011.106-.894h2.611a1 1 0 01.996 1.09A7.002 7.002 0 005 13v-2.101a1 1 0 10-2 0V4a1 1 0 011-1h2.101z" clipRule="evenodd" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  return (
    <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      {/* Main Status */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusBgColor()} ${getStatusBorderColor()}`}>
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            {isConnected ? (isRegistered ? 'Registered' : 'Registering...') : 'Disconnected'}
          </p>
          <p className={`text-xs ${getStatusColor()}`}>
            {extension ? `Extension: ${extension}` : 'Not registered'}
          </p>
        </div>
        {isRegistered && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-400/30 rounded">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-300 font-medium">Online</span>
          </div>
        )}
      </div>

      {/* Call Status */}
      {hasIncomingCall && (
        <div className="p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
          <p className="text-xs font-semibold text-blue-200 mb-1">📞 Incoming Call</p>
          <p className="text-sm text-blue-100">{incomingFrom || 'Unknown'}</p>
        </div>
      )}

      {callStatus !== 'idle' && (
        <div className="p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-purple-200">
              {callStatus === 'calling' && '☎️ Calling...'}
              {callStatus === 'ringing' && '📢 Ringing...'}
              {callStatus === 'connected' && '🔊 Connected'}
              {callStatus === 'on-hold' && '⏸️ On Hold'}
            </p>
            {callStatus === 'connected' && (
              <p className="text-xs text-purple-300 font-mono">{formatDuration(callDuration)}</p>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
          <p className="text-xs text-red-200">⚠️ {error}</p>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && !error && (
        <div className="p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
          <p className="text-xs text-blue-200">{statusMessage}</p>
        </div>
      )}
    </div>
  )
}

export default SipStatus
