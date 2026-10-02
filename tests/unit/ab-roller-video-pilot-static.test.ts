import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Ab Roller video pilot', () => {
  it('publishes the canonical exercise video through an idempotent migration', () => {
    const migration = source('supabase/operations/publish_ab_roller_video.sql')
    expect(migration).toContain("196f4ce9-98ba-4119-a705-b1ca509bba59")
    expect(migration).toContain("/videos/exercises/ab-roller.mp4?v=1")
    expect(migration).toContain('is distinct from')
  })

  it('opens the enlarged player from the exercise-list media', () => {
    const modal = source('app/components/modals/ExerciseSearchModal.tsx')
    expect(modal).toContain('Agrandir la vidéo de')
    expect(modal).toContain('onClick={() => openExercise(ex)}')
    expect(modal).toContain('activation="mount"')
  })

  it('opens a video from the active-session exercise title', () => {
    const editor = source('app/components/training/workout-session/WorkoutExerciseEditor.tsx')
    const session = source('app/components/WorkoutSession.tsx')
    expect(editor).toContain('onOpenExerciseVideo(exercise: WorkoutSessionExercise): void')
    expect(editor).toContain('Lire la vidéo de')
    expect(session).toContain('async function openExerciseVideo')
    expect(session).toContain('onOpenExerciseVideo={openExerciseVideo}')
  })
})
