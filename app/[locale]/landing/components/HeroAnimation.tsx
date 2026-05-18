'use client'

import { useEffect, useRef } from 'react'

/**
 * Client-only GSAP animations for the hero section.
 * Handles: scroll parallax on background image.
 * Does NOT handle initial reveal (that's CSS animation in the server-rendered HTML).
 */
export default function HeroAnimation() {
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const bgEl = document.querySelector('.hero-bg-container') as HTMLElement | null
    if (!bgEl) return

    const onScroll = () => {
      const y = window.scrollY * 0.3
      bgEl.style.transform = `translate3d(0, ${y}px, 0) scale(1.05)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
