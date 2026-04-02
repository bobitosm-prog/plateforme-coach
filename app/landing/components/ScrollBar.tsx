'use client'
import { useEffect, useState } from 'react'

export default function ScrollBar() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      setPct(total > 0 ? (window.scrollY / total) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 2,
        zIndex: 9999,
        background: 'var(--gold)',
        width: `${pct}%`,
        transition: 'width 0.08s linear',
        boxShadow: '0 0 12px rgba(201,168,76,0.6)',
      }}
    />
  )
}
