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

  it('uses local posters for the validated Battle Ropes and Box Jump videos', () => {
    const session = source('app/components/WorkoutSession.tsx')
    expect(session).toContain("videoUrl?.includes('battle-ropes.mp4')")
    expect(session).toContain("'/images/video-posters/battle-ropes.webp'")
    expect(session).toContain("videoUrl?.includes('box-jump.mp4')")
    expect(session).toContain("'/images/video-posters/box-jump.webp'")
  })

  it('publishes only the canonical Battle Ropes and Box Jump rows through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_battle_ropes_box_jump_videos.sql')
    expect(operation).toContain('d97e1cbe-2e68-4969-b610-6d7278f1c742')
    expect(operation).toContain('/videos/exercises/battle-ropes.mp4?v=1')
    expect(operation).toContain('38923678-4a81-40a7-8555-565eb1cac5a6')
    expect(operation).toContain('/videos/exercises/box-jump.mp4?v=1')
    expect(operation.match(/is distinct from/g)).toHaveLength(2)
  })

  it('uses local posters for the validated Burpees and Cable Crunch videos', () => {
    const session = source('app/components/WorkoutSession.tsx')
    expect(session).toContain("videoUrl?.includes('burpees.mp4')")
    expect(session).toContain("'/images/video-posters/burpees.webp'")
    expect(session).toContain("videoUrl?.includes('cable-crunch.mp4')")
    expect(session).toContain("'/images/video-posters/cable-crunch.webp'")
  })

  it('publishes only the canonical Burpees and Cable Crunch rows through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_burpees_cable_crunch_videos.sql')
    expect(operation).toContain('11c7bf0e-26b1-48cc-b699-96093c05fcc8')
    expect(operation).toContain('/videos/exercises/burpees.mp4?v=1')
    expect(operation).toContain('cd519c55-db25-43f8-b548-dcc47905a83f')
    expect(operation).toContain('/videos/exercises/cable-crunch.mp4?v=1')
    expect(operation.match(/is distinct from/g)).toHaveLength(2)
  })

  it('uses local posters for the validated Crunch and Curl Barre Droite videos', () => {
    const session = source('app/components/WorkoutSession.tsx')
    expect(session).toContain("videoUrl?.includes('/crunch.mp4')")
    expect(session).toContain("'/images/video-posters/crunch.webp'")
    expect(session).toContain("videoUrl?.includes('curl-barre-droite.mp4')")
    expect(session).toContain("'/images/video-posters/curl-barre-droite.webp'")
  })

  it('publishes only the canonical Crunch and Curl Barre Droite rows through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_crunch_curl_barre_droite_videos.sql')
    expect(operation).toContain('25235bd5-a710-4d00-b200-d0e3588f7d23')
    expect(operation).toContain('/videos/exercises/crunch.mp4?v=1')
    expect(operation).toContain('99c3d411-0252-4135-ad68-25d420497fc6')
    expect(operation).toContain('/videos/exercises/curl-barre-droite.mp4?v=1')
    expect(operation.match(/is distinct from/g)).toHaveLength(2)
  })

  it('uses local posters for the four newly validated curl videos', () => {
    const session = source('app/components/WorkoutSession.tsx')
    for (const slug of ['curl-barre-ez', 'curl-halteres-simultane', 'curl-incline', 'curl-machine']) {
      expect(session).toContain(`videoUrl?.includes('${slug}.mp4')`)
      expect(session).toContain(`'/images/video-posters/${slug}.webp'`)
    }
  })

  it('publishes only the four canonical curl rows through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_four_curl_videos.sql')
    for (const id of [
      '15e5650c-a821-46a9-bf28-f1cfd859da38',
      '9be17796-5c34-4a82-bd91-7959f6350848',
      '78f75306-d2b9-4457-8f1f-b2d45209ba67',
      '88f3b1be-0a5e-4bf0-b501-8f42f3d85a3e',
    ]) expect(operation).toContain(id)
    for (const slug of ['curl-barre-ez', 'curl-halteres-simultane', 'curl-incline', 'curl-machine']) {
      expect(operation).toContain(`/videos/exercises/${slug}.mp4?v=1`)
    }
    expect(operation.match(/is distinct from/g)).toHaveLength(4)
  })

  it('uses local posters for the five newly validated exercise videos', () => {
    const session = source('app/components/WorkoutSession.tsx')
    for (const slug of ['curl-poulie-basse', 'curl-pupitre', 'curl-spider', 'developpe-couche-barre', 'developpe-couche-machine']) {
      expect(session).toContain(`videoUrl?.includes('${slug}.mp4')`)
      expect(session).toContain(`'/images/video-posters/${slug}.webp'`)
    }
  })

  it('publishes only the five canonical rows through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_five_validated_videos.sql')
    for (const id of [
      '00dbdad6-b94d-43a5-8463-6b2ba849cc18',
      'b3a84e09-ed26-43f8-b17f-4b8ab4f7c23f',
      'b2eaccb5-9b91-475e-aeba-9d081709d54d',
      '9a14c0cd-a9db-48f0-9016-ee59a1e096db',
      '8afa0acd-d198-47b6-b0b1-de10abfb27fb',
    ]) expect(operation).toContain(id)
    for (const slug of ['curl-poulie-basse', 'curl-pupitre', 'curl-spider', 'developpe-couche-barre', 'developpe-couche-machine']) {
      expect(operation).toContain(`/videos/exercises/${slug}.mp4?v=1`)
    }
    expect(operation.match(/is distinct from/g)).toHaveLength(5)
  })
})
