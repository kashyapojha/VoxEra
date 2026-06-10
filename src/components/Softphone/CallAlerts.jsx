/**
 * Headless — plays ringtone / ringback and flashes tab title during calls.
 */
import { useEffect } from 'react'
import { useSip } from '../../context/SIPContext'
import {
  startIncomingRing,
  stopIncomingRing,
  startRingback,
  stopRingback,
  stopAllCallAlerts,
  flashDocumentTitle,
  stopTitleFlash,
  notifyIncomingCall,
} from '../../utils/callAlerts'

export default function CallAlerts() {
  const { incomingCall, incomingFrom, callStatus, currentCall } = useSip()

  // Incoming ring + notification
  useEffect(() => {
    if (incomingCall && callStatus === 'incoming') {
      const caller = incomingFrom || 'Unknown'
      startIncomingRing()
      flashDocumentTitle(`Call from ${caller}`)
      notifyIncomingCall(caller)
      return () => {
        stopIncomingRing()
        stopTitleFlash()
      }
    }
    stopIncomingRing()
    return undefined
  }, [incomingCall, incomingFrom, callStatus])

  // Outbound ringback while waiting for answer
  useEffect(() => {
    if (
      currentCall
      && callStatus === 'ringing'
      && currentCall.direction === 'outgoing'
      && !incomingCall
    ) {
      startRingback()
      const callee = currentCall.remote_identity?.uri?.user || '...'
      flashDocumentTitle(`Calling ${callee}`)
      return () => {
        stopRingback()
        stopTitleFlash()
      }
    }
    stopRingback()
    return undefined
  }, [currentCall, callStatus, incomingCall])

  // Stop everything when idle / connected
  useEffect(() => {
    if (callStatus === 'connected' || callStatus === 'idle' || callStatus === 'ended') {
      stopAllCallAlerts()
    }
  }, [callStatus])

  return null
}
