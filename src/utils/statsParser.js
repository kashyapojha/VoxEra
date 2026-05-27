/**
 * statsParser.js
 * Utility functions for parsing WebRTC getStats() reports.
 *
 * WebRTC Report Types:
 * - inbound-rtp      : stats for incoming RTP stream (packets received, jitter, loss)
 * - outbound-rtp     : stats for outgoing RTP stream (packets sent, bytes sent)
 * - remote-inbound-rtp: stats reported by remote peer about our outgoing stream (RTT, fraction lost)
 * - candidate-pair   : ICE candidate pair currently in use (RTT via STUN)
 * - local-candidate  : our ICE candidate (host, srflx, relay)
 * - remote-candidate : remote ICE candidate
 * - codec            : codec info (mimeType, clockRate, channels)
 */

/**
 * Calculate call quality score based on jitter, RTT, and packet loss.
 * Returns: 'Excellent' | 'Good' | 'Fair' | 'Poor'
 *
 * Thresholds based on ITU-T G.114 and WebRTC best practices:
 * - Jitter   > 30ms  → noticeable degradation
 * - RTT      > 150ms → perceptible delay
 * - PacketLoss > 5%  → audio artifacts
 */
export function calculateCallQuality(jitter, rtt, packetLoss) {
  let score = 100

  // Jitter penalty
  if (jitter > 50)      score -= 40
  else if (jitter > 30) score -= 25
  else if (jitter > 15) score -= 10

  // RTT penalty
  if (rtt > 300)        score -= 40
  else if (rtt > 150)   score -= 25
  else if (rtt > 80)    score -= 10

  // Packet loss penalty
  if (packetLoss > 10)  score -= 40
  else if (packetLoss > 5)  score -= 25
  else if (packetLoss > 1)  score -= 10

  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

/**
 * Parse all WebRTC stats reports into a structured object.
 * @param {RTCStatsReport} statsReport - result of pc.getStats()
 * @param {Object} prev - previous stats snapshot for delta calculations
 * @param {number} intervalMs - polling interval in ms (used for bitrate calc)
 */
export function parseStats(statsReport, prev, intervalMs = 1000) {
  const result = {
    jitter:           0,
    rtt:              0,
    packetLoss:       0,
    bitrate:          0,
    codec:            'Unknown',
    iceCandidateType: 'Unknown',
    callQuality:      'Unknown',
    // raw values for graphs
    packetsReceived:  0,
    packetsLost:      0,
    bytesSent:        0,
    bytesReceived:    0,
  }

  const reports = {}
  statsReport.forEach(report => { reports[report.id] = report })

  statsReport.forEach(report => {

    // ── inbound-rtp ──
    // Contains: jitter, packetsReceived, packetsLost, bytesReceived
    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      console.debug('[WebRTC] inbound-rtp:', report)

      result.jitter           = Math.round((report.jitter || 0) * 1000) // convert s → ms
      result.packetsReceived  = report.packetsReceived || 0
      result.packetsLost      = report.packetsLost || 0
      result.bytesReceived    = report.bytesReceived || 0

      // Packet loss % = lost / (lost + received) * 100
      const total = result.packetsReceived + result.packetsLost
      result.packetLoss = total > 0
        ? parseFloat(((result.packetsLost / total) * 100).toFixed(2))
        : 0

      // Bitrate = (bytesReceived delta * 8) / interval seconds → kbps
      const prevBytes = prev?.bytesReceived || 0
      const bytesDelta = result.bytesReceived - prevBytes
      result.bitrate = bytesDelta > 0
        ? Math.round((bytesDelta * 8) / (intervalMs / 1000) / 1000) // kbps
        : 0

      // Codec name from codecId reference
      if (report.codecId && reports[report.codecId]) {
        const codec = reports[report.codecId]
        result.codec = codec.mimeType
          ? codec.mimeType.replace('audio/', '').toUpperCase()
          : 'Unknown'
        console.debug('[WebRTC] codec:', codec.mimeType)
      }
    }

    // ── outbound-rtp ──
    // Contains: bytesSent, packetsSent
    if (report.type === 'outbound-rtp' && report.kind === 'audio') {
      console.debug('[WebRTC] outbound-rtp:', report)
      result.bytesSent = report.bytesSent || 0
    }

    // ── remote-inbound-rtp ──
    // Contains: roundTripTime (RTT in seconds), fractionLost
    // This is reported by the remote peer about OUR outgoing stream
    if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
      console.debug('[WebRTC] remote-inbound-rtp:', report)
      if (report.roundTripTime !== undefined) {
        result.rtt = Math.round(report.roundTripTime * 1000) // convert s → ms
      }
    }

    // ── candidate-pair ──
    // Contains: currentRoundTripTime, state (succeeded = active pair)
    // Fallback RTT source if remote-inbound-rtp RTT not available
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      console.debug('[WebRTC] candidate-pair:', report)
      if (result.rtt === 0 && report.currentRoundTripTime !== undefined) {
        result.rtt = Math.round(report.currentRoundTripTime * 1000)
      }

      // Get ICE candidate type from local candidate
      if (report.localCandidateId && reports[report.localCandidateId]) {
        const localCand = reports[report.localCandidateId]
        console.debug('[WebRTC] local-candidate:', localCand)
        // candidateType: 'host' | 'srflx' (STUN) | 'relay' (TURN)
        result.iceCandidateType = localCand.candidateType || 'Unknown'
      }
    }

  })

  // Calculate final call quality
  result.callQuality = calculateCallQuality(result.jitter, result.rtt, result.packetLoss)

  return result
}