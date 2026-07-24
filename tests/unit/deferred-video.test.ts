import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DeferredVideo from '../../app/components/media/DeferredVideo'
import {
  attachDeferredVideoSource,
  DEFERRED_VIDEO_ERROR_MESSAGE,
  mayAutoPlayVideo,
  releaseDeferredVideo,
  type DeferredVideoElement,
} from '../../lib/media/deferred-video'
import {
  LOCAL_EXERCISE_VIDEO_POSTERS,
  resolveExerciseVideoPoster,
  resolveLocalExerciseVideoPoster,
} from '../../lib/media/exercise-video-posters'

function fakeVideo() {
  const calls: string[] = []
  const video: DeferredVideoElement = {
    src: '',
    load: () => calls.push('load'),
    pause: () => calls.push('pause'),
    play: async () => { calls.push('play') },
    removeAttribute: name => {
      calls.push(`remove:${name}`)
      video.src = ''
    },
  }
  return { calls, video }
}

describe('deferred video lifecycle', () => {
  it('keeps the source absent from server markup before effects or user activation', () => {
    const modal = renderToStaticMarkup(createElement(DeferredVideo, {
      activation: 'mount',
      ariaLabel: 'Démonstration',
      autoPlay: true,
      muted: true,
      poster: '/images/video-posters/squat-barre.webp',
      src: '/videos/exercises/squat-barre.mp4?v=4',
    }))
    const user = renderToStaticMarkup(createElement(DeferredVideo, {
      activation: 'user',
      ariaLabel: 'Lire la vidéo',
      src: 'https://storage.invalid/private-token',
    }))
    expect(modal).toContain('<video')
    expect(modal).toContain('preload="none"')
    expect(modal).toContain('/images/video-posters/squat-barre.webp')
    expect(modal).not.toContain('squat-barre.mp4')
    expect(user).toContain('data-video-state="idle"')
    expect(user).not.toContain('storage.invalid')
  })

  it('attaches only after activation and cleans up idempotently for Strict Mode', () => {
    const first = fakeVideo()
    attachDeferredVideoSource(first.video, '/local/video.mp4')
    expect(first.video.src).toBe('/local/video.mp4')
    expect(first.calls).toEqual(['load'])

    releaseDeferredVideo(first.video)
    releaseDeferredVideo(first.video)
    expect(first.video.src).toBe('')
    expect(first.calls).toEqual([
      'load',
      'pause', 'remove:src', 'load',
      'pause', 'remove:src', 'load',
    ])

    attachDeferredVideoSource(first.video, '/local/video.mp4')
    expect(first.video.src).toBe('/local/video.mp4')
  })

  it('autoplays only muted video when reduced motion is not requested', () => {
    expect(mayAutoPlayVideo({ autoPlay: true, muted: true, reducedMotion: false })).toBe(true)
    expect(mayAutoPlayVideo({ autoPlay: true, muted: false, reducedMotion: false })).toBe(false)
    expect(mayAutoPlayVideo({ autoPlay: true, muted: true, reducedMotion: true })).toBe(false)
    expect(mayAutoPlayVideo({ autoPlay: false, muted: true, reducedMotion: false })).toBe(false)
  })

  it('exposes a fixed sanitized error without source details', () => {
    expect(DEFERRED_VIDEO_ERROR_MESSAGE).toBe('La vidéo est temporairement indisponible.')
    expect(DEFERRED_VIDEO_ERROR_MESSAGE).not.toMatch(/https?:|token|supabase/i)
  })
})

describe('exercise video posters', () => {
  it('maps each verified local exercise video to one existing WebP poster', () => {
    expect(Object.keys(LOCAL_EXERCISE_VIDEO_POSTERS)).toHaveLength(17)
    for (const [video, poster] of Object.entries(LOCAL_EXERCISE_VIDEO_POSTERS)) {
      expect(resolveLocalExerciseVideoPoster(`/videos/exercises/${video}?v=4`)).toBe(poster)
      expect(resolveExerciseVideoPoster(`/videos/exercises/${video}?v=4`)).toMatch(
        /^https:\/\/media\.moovx\.ch\/images\/video-posters\/.+\.[a-f0-9]{16}\.webp$/,
      )
      expect(poster).toMatch(/^\/images\/video-posters\/.+\.webp$/)
    }
  })

  it('fails closed for remote, unknown and protected video names', () => {
    expect(resolveLocalExerciseVideoPoster('https://example.invalid/video.mp4')).toBeNull()
    expect(resolveExerciseVideoPoster('https://example.invalid/video.mp4')).toBeNull()
    expect(resolveLocalExerciseVideoPoster('/videos/exercises/unknown.mp4')).toBeNull()
    expect(resolveLocalExerciseVideoPoster('/videos/exercises/developpe-couche-barre.mp4')).toBeNull()
  })
})
