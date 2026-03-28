'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Force clear all caches left by old service worker
    caches.keys().then(names => names.forEach(name => caches.delete(name)))

    // Re-register with updated sw.js (which has no caching)
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  }, [])

  return null
}
