'use client'
import { useEffect, useRef } from 'react'

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    document.body.style.cursor = 'none'
    const move = (e: MouseEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`
    }
    document.addEventListener('mousemove', move)
    return () => {
      document.removeEventListener('mousemove', move)
      document.body.style.cursor = 'auto'
    }
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 20,
        height: 20,
        pointerEvents: 'none',
        zIndex: 99999,
        mixBlendMode: 'difference',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 20,
          height: 1,
          top: '50%',
          left: 0,
          background: '#D4A843',
          transform: 'translateY(-50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          height: 20,
          width: 1,
          left: '50%',
          top: 0,
          background: '#D4A843',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  )
}
