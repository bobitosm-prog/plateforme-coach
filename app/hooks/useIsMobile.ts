'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect if the viewport is mobile (<= breakpoint).
 * SSR-safe: returns false on server, syncs on client mount.
 * Listens to resize via matchMedia for dynamic updates.
 */
export function useIsMobile(breakpointPx: number = 640): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpointPx])

  return isMobile
}
