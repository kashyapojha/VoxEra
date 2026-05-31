/**
 * useSip.js
 * Convenience hook — re-exports useSip from SipContext.
 * Keeps import paths consistent across the app.
 *
 * Usage:
 *   import { useSip } from '../hooks/useSip'
 *   const { isRegistered, makeCall, callStatus } = useSip()
 */

export { useSip } from '../context/SIPContext'