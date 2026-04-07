'use client'
import { useEffect, useRef, useCallback } from 'react'

export function useWakeLock(isActive: boolean) {
  const wlRef = useRef<any>(null)

  const acquire = useCallback(async () => {
    if (!isActive || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    try {
      if (wlRef.current) try { await wlRef.current.release() } catch {}
      wlRef.current = await (navigator as any).wakeLock.request('screen')
    } catch {}
  }, [isActive])

  useEffect(() => {
    if (isActive) acquire()
    else if (wlRef.current) { wlRef.current.release().catch(() => {}); wlRef.current = null }
  }, [isActive, acquire])

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible' && isActive) acquire() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis) }
  }, [isActive, acquire])

  useEffect(() => () => { if (wlRef.current) wlRef.current.release().catch(() => {}) }, [])
}
