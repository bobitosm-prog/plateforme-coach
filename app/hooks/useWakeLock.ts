'use client'
import { useEffect, useRef } from 'react'
import { browserVisibilityPort, createBrowserWakeLockPort } from '../../lib/training/workout-runtime-browser'

export function useWakeLock(isActive: boolean) {
  const portRef = useRef<ReturnType<typeof createBrowserWakeLockPort> | null>(null)
  if (portRef.current == null) portRef.current = createBrowserWakeLockPort()

  useEffect(() => {
    const port = portRef.current!
    if (!isActive) {
      void Promise.resolve(port.release()).catch(() => undefined)
      return
    }
    void Promise.resolve(port.acquire()).catch(() => undefined)
    const unsubscribe = browserVisibilityPort.subscribe(() => {
      if (browserVisibilityPort.isVisible()) void Promise.resolve(port.acquire()).catch(() => undefined)
    })
    return () => {
      unsubscribe()
      void Promise.resolve(port.release()).catch(() => undefined)
    }
  }, [isActive])
}
