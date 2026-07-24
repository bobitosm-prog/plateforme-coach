'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  attachDeferredVideoSource,
  DEFERRED_VIDEO_ERROR_MESSAGE,
  mayAutoPlayVideo,
  releaseDeferredVideo,
} from '../../../lib/media/deferred-video'

interface DeferredVideoProps {
  readonly src: string
  readonly ariaLabel: string
  readonly activation: 'mount' | 'user'
  readonly poster?: string | null
  readonly autoPlay?: boolean
  readonly controls?: boolean
  readonly loop?: boolean
  readonly muted?: boolean
  readonly playsInline?: boolean
  readonly className?: string
  readonly style?: CSSProperties
}

export default function DeferredVideo({
  src,
  ariaLabel,
  activation,
  poster,
  autoPlay = false,
  controls = true,
  loop = false,
  muted = false,
  playsInline = true,
  className,
  style,
}: DeferredVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activated, setActivated] = useState(activation === 'mount')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    activation === 'mount' ? 'loading' : 'idle',
  )

  useEffect(() => {
    const video = videoRef.current
    if (!activated || !video) return
    attachDeferredVideoSource(video, src)
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (mayAutoPlayVideo({ autoPlay, muted, reducedMotion })) {
      void video.play().catch(() => undefined)
    }
    return () => releaseDeferredVideo(video)
  }, [activated, autoPlay, muted, src])

  if (status === 'error') {
    return (
      <div role="status" data-video-state="error" style={{ ...style, display: 'grid', placeItems: 'center' }}>
        {DEFERRED_VIDEO_ERROR_MESSAGE}
      </div>
    )
  }

  if (!activated) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        data-video-state="idle"
        onClick={() => {
          setStatus('loading')
          setActivated(true)
        }}
        style={{
          ...style,
          alignItems: 'center',
          background: poster ? `center / cover no-repeat url("${poster}")` : '#000',
          border: 0,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          minHeight: 160,
          position: 'relative',
        }}
      >
        <span style={{ background: 'rgba(0,0,0,0.72)', borderRadius: 999, padding: '10px 16px' }}>
          Lire la vidéo
        </span>
      </button>
    )
  }

  return (
    <video
      ref={videoRef}
      aria-label={ariaLabel}
      className={className}
      controls={controls}
      data-video-state={status}
      loop={loop}
      muted={muted}
      onCanPlay={() => setStatus('ready')}
      onError={() => {
        releaseDeferredVideo(videoRef.current)
        setStatus('error')
      }}
      playsInline={playsInline}
      poster={poster ?? undefined}
      preload="none"
      style={style}
    />
  )
}
