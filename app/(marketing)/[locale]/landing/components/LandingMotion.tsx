'use client'

import { useEffect } from 'react'
import gsap from 'gsap'

export default function LandingMotion() {
  useEffect(() => {
    const media = gsap.matchMedia()

    media.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      context => {
        const { motion } = context.conditions as { motion: boolean; reduced: boolean }
        const elements = gsap.utils.toArray<HTMLElement>('[data-landing-reveal]')

        if (!motion) {
          gsap.set(elements, { clearProps: 'all' })
          return
        }

        const observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            observer.unobserve(entry.target)
            gsap.fromTo(
              entry.target,
              { autoAlpha: 0, y: 28 },
              { autoAlpha: 1, y: 0, duration: 0.72, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
            )
          }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })

        elements.forEach(element => observer.observe(element))
        return () => observer.disconnect()
      },
    )

    return () => media.revert()
  }, [])

  return null
}
