/**
 * Incoming / ringback tones + browser notifications for SIP calls.
 * Uses Web Audio (no asset files) — works after user has interacted with the page.
 */

let audioCtx = null
let incomingTimer = null
let ringbackTimer = null
let titleTimer = null
const originalTitle = typeof document !== 'undefined' ? document.title : 'VoxEra'

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playDualTone(freq1, freq2, durationSec, volume = 0.12) {
  const ctx = getAudioContext()
  if (!ctx) return

  const t0 = ctx.currentTime
  ;[freq1, freq2].forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durationSec)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + durationSec)
  })
}

/** US-style ring: 440+480 Hz, 2s on / 2s off */
export function startIncomingRing() {
  stopIncomingRing()
  const tick = () => playDualTone(440, 480, 1.8, 0.18)
  tick()
  incomingTimer = setInterval(tick, 4000)
}

export function stopIncomingRing() {
  if (incomingTimer) {
    clearInterval(incomingTimer)
    incomingTimer = null
  }
}

/** Softer ringback for outbound while waiting for answer */
export function startRingback() {
  stopRingback()
  const tick = () => playDualTone(350, 440, 1.2, 0.08)
  tick()
  ringbackTimer = setInterval(tick, 3000)
}

export function stopRingback() {
  if (ringbackTimer) {
    clearInterval(ringbackTimer)
    ringbackTimer = null
  }
}

export function stopAllCallAlerts() {
  stopIncomingRing()
  stopRingback()
  stopTitleFlash()
}

export function flashDocumentTitle(label) {
  stopTitleFlash()
  let on = true
  titleTimer = setInterval(() => {
    document.title = on ? `📞 ${label}` : originalTitle
    on = !on
  }, 800)
}

export function stopTitleFlash() {
  if (titleTimer) {
    clearInterval(titleTimer)
    titleTimer = null
  }
  if (typeof document !== 'undefined') {
    document.title = originalTitle
  }
}

export async function notifyIncomingCall(caller) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  const show = () => {
    try {
      const n = new Notification('Incoming call — VoxEra', {
        body: `${caller} is calling you`,
        tag: 'voxera-incoming-call',
        requireInteraction: true,
      })
      n.onclick = () => {
        window.focus()
        n.close()
      }
    } catch (e) {
      console.warn('[SIP] Notification failed:', e)
    }
  }

  if (Notification.permission === 'granted') {
    show()
    return
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') show()
  }
}

/** Call once after user registers so notifications work later */
export function primeCallNotifications() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
  getAudioContext()
}
