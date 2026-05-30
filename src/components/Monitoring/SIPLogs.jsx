import { useSip } from '../../context/SIPContext'
import { FileText, AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import GlassCard from '../UI/GlassCard'

const SIPLogs = () => {
  const { sipLogs } = useSip()
  const logs = sipLogs || []
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [sipLogs])

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />
      case 'warning':
        return <AlertCircle size={16} className="text-yellow-400" />
      case 'success':
        return <CheckCircle size={16} className="text-green-400" />
      default:
        return <Info size={16} className="text-blue-400" />
    }
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'success':
        return 'text-green-400'
      default:
        return 'text-blue-400'
    }
  }

  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">SIP Logs</h3>
        </div>
        <span className="text-sm text-gray-400">{logs.length} entries</span>
      </div>

      <div ref={listRef} className="h-96 overflow-y-auto scrollbar-hide space-y-2">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText size={48} className="mb-2 opacity-50" />
            <p>No logs yet</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {getLevelIcon(log.level)}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${getLevelColor(log.level)}`}>{log.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {log.time || (log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  )
}

export default SIPLogs
