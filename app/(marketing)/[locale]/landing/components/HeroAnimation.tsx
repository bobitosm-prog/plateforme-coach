'use client'

import { useEffect, useRef } from 'react'

/**
 * Client-only scroll parallax for the decorative hero background.
 * Primary LCP content remains visible in the server-rendered HTML.
 */
export default function HeroAnimation() {
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const bgEl = document.querySelector('.hero-bg-container') as HTMLElement | null
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!bgEl || reducedMotion.matches) return

    const onScroll = () => {
      const y = window.scrollY * 0.3
      bgEl.style.transform = `translate3d(0, ${y}px, 0) scale(1.05)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
