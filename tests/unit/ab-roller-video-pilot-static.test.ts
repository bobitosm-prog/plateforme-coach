import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Ab Roller video pilot', () => {
  it('keeps the current workout design while exposing a video thumbnail in the picker', () => {
    const session = source('app/components/WorkoutSession.tsx')
    expect(session).toContain("select('id, name, muscle_group, equipment, difficulty, description, video_url, gif_url')")
    expect(session).toContain('Agrandir la vidéo de')
    expect(session).toContain('setPreviewExercise(e)')
    expect(session).toContain('<TrainingSheet title={getExerciseName(previewExercise, locale)}')
  })

  it('plays the current catalog video when the active-session title is pressed', () => {
    const session = source('app/components/WorkoutSession.tsx')
    expect(session).toContain('async function openExerciseVideo')
    expect(session).toContain('Lire la vidéo de')
    expect(session).toContain('onClick={() => void openExerciseVideo(exo)}')
  })

  it('publishes only the canonical Ab Roller row through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_ab_roller_video.sql')
    expect(operation).toContain('196f4ce9-98ba-4119-a705-b1ca509bba59')
    expect(operation).toContain('/videos/exercises/ab-roller.mp4?v=1')
    expect(operation).toContain('is distinct from')
  })

  it('uses local posters for the validated abduction and adduction videos', () => {
    const session = source('app/components/WorkoutSession.tsx')
    expect(session).toContain("videoUrl?.includes('abduction-machine.mp4')")
    expect(session).toContain("'/images/video-posters/abduction-machine.webp'")
    expect(session).toContain("videoUrl?.includes('adduction-machine.mp4')")
    expect(session).toContain("'/images/video-posters/adduction-machine.webp'")
  })

  it('publishes only the two canonical machine rows through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_abduction_adduction_videos.sql')
    expect(operation).toContain('07e3148b-894b-4fc9-b81e-efae6167037e')
    expect(operation).toContain('/videos/exercises/abduction-machine.mp4?v=1')
    expect(operation).toContain('0f57f2ec-0401-4892-b857-f0a9dc9efb74')
    expect(operation).toContain('/videos/exercises/adduction-machine.mp4?v=1')
    expect(operation.match(/is distinct from/g)).toHaveLength(2)
  })
})
