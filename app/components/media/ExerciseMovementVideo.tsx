'use client'

import { resolveExerciseVideoPoster, resolveLocalExerciseVideoPoster } from '../../../lib/media/exercise-video-posters'
import DeferredVideo from './DeferredVideo'

interface ExerciseMovementVideoProps {
  name: string
  videoUrl?: string | null
  posterUrl?: string | null
  compact?: boolean
}

export default function ExerciseMovementVideo({
  name,
  videoUrl,
  posterUrl,
  compact = false,
}: ExerciseMovementVideoProps) {
  if (!videoUrl) return null

  const resolvedPoster = posterUrl || resolveExerciseVideoPoster(videoUrl)
  const fallbackPoster = resolveLocalExerciseVideoPoster(videoUrl)

  return (
    <div style={{
      aspectRatio: compact ? '16 / 9' : '9 / 16',
      background: '#fff',
      borderRadius: compact ? 10 : 12,
      maxHeight: compact ? 180 : '55vh',
      overflow: 'hidden',
      width: '100%',
    }}>
      <DeferredVideo
        activation="user"
        ariaLabel={`Lire la démonstration de ${name}`}
        autoPlay
        controls
        loop
        muted
        poster={resolvedPoster}
        posterFallback={fallbackPoster}
        src={videoUrl}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}
