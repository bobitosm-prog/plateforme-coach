'use client'
import { useState, useEffect } from 'react'
import { getExerciseImages } from '../../lib/exercise-media'

interface Props {
  name: string
  size?: number
  animate?: boolean
}

export default function ExercisePreview({ name, size = 56, animate = true }: Props) {
  const [showEnd, setShowEnd] = useState(false)
  const [error, setError] = useState(false)
  const images = getExerciseImages(name)

  useEffect(() => {
    if (!animate || !images.start || !images.end) return
    const id = setInterval(() => setShowEnd(p => !p), 1500)
    return () => clearInterval(id)
  }, [animate, images.start, images.end])

  if (!images.start || error) {
    return (
      <div style={{
        width: size, height: size, background: '#141310', border: '1px solid #3D3B38',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 8,
      }}>
        <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none">
          <path d="M6 12H18M4 8H6V16H4V8ZM18 8H20V16H18V8Z" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={showEnd && images.end ? images.end : images.start}
      alt={name}
      onError={() => setError(true)}
      loading="lazy"
      style={{
        width: size, height: size, objectFit: 'cover',
        border: '1px solid #3D3B38', flexShrink: 0, borderRadius: 8,
        transition: 'opacity 0.3s',
      }}
    />
  )
}
