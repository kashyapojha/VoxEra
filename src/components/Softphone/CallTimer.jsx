import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

const CallTimer = ({ callStatus, callDuration }) => {
  const [displayTime, setDisplayTime] = useState('00:00')

  useEffect(() => {
    if (callStatus === 'connected') {
      const minutes = Math.floor(callDuration / 60)
      const seconds = callDuration % 60
      setDisplayTime(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    } else {
      setDisplayTime('00:00')
    }
  }, [callDuration, callStatus])

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return 'Calling...'
      case 'ringing':
        return 'Ringing...'
      case 'connected':
        return 'Connected'
      case 'ended':
        return 'Call Ended'
      case 'failed':
        return 'Call Failed'
      default:
        return 'Ready'
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-gray-400">
        <Clock size={16} />
        <span className="text-sm">{getStatusText()}</span>
      </div>
      {callStatus === 'connected' && (
        <div className="text-4xl font-light text-white">{displayTime}</div>
      )}
    </div>
  )
}

export default CallTimer
