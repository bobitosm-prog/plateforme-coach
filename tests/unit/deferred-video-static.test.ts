import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('deferred video architecture', () => {
  it('centralizes visible video elements in the shared boundary', () => {
    const consumers = [
      'app/components/WorkoutSession.tsx',
      'app/components/ExerciseInfoPopup.tsx',
      'app/components/VideoFeedbackHistory.tsx',
      'app/components/VideoFeedbackModal.tsx',
      'app/components/modals/ExerciseDetailModal.tsx',
      'app/components/modals/ExerciseSearchModal.tsx',
      'app/components/training/ExerciseLibrarySection.tsx',
      'app/components/training/workout-session/WorkoutSessionOverlays.tsx',
      'app/coach/components/CoachVideoReviews.tsx',
    ]
    for (const consumer of consumers) {
      expect(read(consumer), consumer).toContain('DeferredVideo')
      expect(read(consumer), consumer).not.toContain('<video')
    }
  })

  it('keeps source assignment, cleanup and sanitized errors inside the boundary', () => {
    const component = read('app/components/media/DeferredVideo.tsx')
    const lifecycle = read('lib/media/deferred-video.ts')
    expect(component).not.toContain('src={src}')
    expect(component).toContain('preload="none"')
    expect(component).toContain('prefers-reduced-motion: reduce')
    expect(component).not.toMatch(/console\.|https?:\/\//)
    expect(lifecycle).toContain("video.removeAttribute('src')")
    expect(lifecycle).toContain('video.pause()')
    expect(lifecycle).not.toMatch(/console\.|https?:\/\//)
    expect(read('app/components/VideoFeedbackModal.tsx')).toContain('URL.revokeObjectURL')
  })

  it('keeps every generated poster bounded and metadata-free', () => {
    const registry = read('lib/media/exercise-video-posters.ts')
    const matches = [...registry.matchAll(/'[^']+\.mp4': '([^']+\.webp)'/g)]
    expect(matches).toHaveLength(17)
    expect(registry).not.toContain('developpe-couche-barre')
    for (const match of matches) {
      const path = `public${match[1]}`
      expect(existsSync(path), path).toBe(true)
      expect(statSync(path).size, path).toBeLessThan(20_000)
    }
  })
})
