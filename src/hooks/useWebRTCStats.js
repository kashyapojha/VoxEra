/**
 * useWebRTCStats.js
 * Custom React hook that polls WebRTC getStats() every second
 * while a JsSIP call session is active.
 *
 * Usage:
 *   const stats = useWebRTCStats(currentCall)
 *
 * Returns live stats updated every second:
 *   { jitter, rtt, packetLoss, bitrate, codec, iceCandidateType, callQuality, history }
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { parseStats } from '../utils/statsParser'

const POLL_INTERVAL_MS = 1000
const MAX_HISTORY = 60 // keep last 60 data points for graphs

const defaultStats = {
  jitter:           0,
  rtt:              0,
  packetLoss:       0,
  bitrate:          0,
  codec:            'N/A',
  iceCandidateType: 'N/A',
  callQuality:      'N/A',
  packetsReceived:  0,
  packetsLost:      0,
  bytesSent:        0,
  bytesReceived:    0,
}

export function useWebRTCStats(session) {
  const [stats, setStats]     = useState(defaultStats)
  const [history, setHistory] = useState([]) // array of stats snapshots for graphs

  const intervalRef = useRef(null)
  const prevStatsRef = useRef(null) // previous snapshot for delta calculations

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      console.info('[useWebRTCStats] Polling stopped')
    }
  }, [])

  const pollStats = useCallback(async (pc) => {
    if (!pc || pc.connectionState === 'closed') {
      stopPolling()
      return
    }

    try {
      const report = await pc.getStats()
      const parsed = parseStats(report, prevStatsRef.current, POLL_INTERVAL_MS)
      prevStatsRef.current = parsed

      setStats(parsed)

      // Append to history for graph rendering
      setHistory(prev => {
        const point = {
          time:        new Date().toLocaleTimeString('en-US', { hour12: false }),
          jitter:      parsed.jitter,
          rtt:         parsed.rtt,
          packetLoss:  parsed.packetLoss,
          bitrate:     parsed.bitrate,
        }
        return [...prev.slice(-MAX_HISTORY + 1), point]
      })

    } catch (err) {
      console.warn('[useWebRTCStats] getStats error:', err)
    }
  }, [stopPolling])

  useEffect(() => {
    // No active session — reset and stop
    if (!session) {
      stopPolling()
      setStats(defaultStats)
      setHistory([])
      prevStatsRef.current = null
      return
    }

    let cancelled = false
    let waitTimer = null

    const startPolling = (pc) => {
      if (cancelled || !pc) return
      console.info('[useWebRTCStats] Starting polling — connection state:', pc.connectionState)
      pollStats(pc)
      intervalRef.current = setInterval(() => pollStats(pc), POLL_INTERVAL_MS)
    }

    const pc = session.connection
    if (pc) {
      startPolling(pc)
    } else {
      console.info('[useWebRTCStats] Waiting for RTCPeerConnection on session…')
      waitTimer = setInterval(() => {
        const livePc = session.connection
        if (livePc) {
          clearInterval(waitTimer)
          startPolling(livePc)
        }
      }, 200)
    }

    return () => {
      cancelled = true
      if (waitTimer) clearInterval(waitTimer)
      stopPolling()
      setStats(defaultStats)
      setHistory([])
      prevStatsRef.current = null
    }
  }, [session, pollStats, stopPolling])

  return { stats, history }
}