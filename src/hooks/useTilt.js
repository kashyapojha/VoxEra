import { useRef, useCallback } from 'react'

/**
 * JS-driven 3D tilt — snaps back on mouseleave.
 * Ambient motion stays in CSS keyframes only.
 */
export function useTilt(maxTilt = 12, lift = 8) {
  const ref = useRef(null)

  const onMouseMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -maxTilt
    const rotateY = ((x - centerX) / centerX) * maxTilt
    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${lift}px)`
  }, [maxTilt, lift])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
  }, [])

  return { ref, onMouseMove, onMouseLeave }
}

export default useTilt
