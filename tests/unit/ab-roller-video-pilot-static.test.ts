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

  it('uses local posters for the five validated shoulder, leg and curl videos', () => {
    const session = source('app/components/WorkoutSession.tsx')
    for (const slug of ['developpe-militaire', 'squat-barre', 'developpe-assis-halteres', 'arnold-press', 'curl-concentre']) {
      expect(session).toContain(`videoUrl?.includes('${slug}.mp4')`)
      expect(session).toContain(`'/images/video-posters/${slug}.webp'`)
    }
  })

  it('publishes only the five matching exercise rows through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_shoulder_legs_curl_videos.sql')
    for (const id of [
      'e38482e6-f20a-4552-b307-ceb60d974e3a',
      '7691cf60-503b-402d-a2c2-149f6112c542',
      '1031f4de-c6b2-4fe2-8b3f-d396b8ef4224',
      '4b420e0b-08aa-441b-94ea-43de1031e7ac',
      '1843e6ea-e387-4cde-84de-25d7db2b2e40',
    ]) expect(operation).toContain(id)
    for (const slug of ['developpe-militaire', 'squat-barre', 'developpe-assis-halteres', 'arnold-press', 'curl-concentre']) {
      expect(operation).toContain(`/videos/exercises/${slug}.mp4?v=1`)
    }
    expect(operation.match(/is distinct from/g)).toHaveLength(5)
  })

  it('uses local posters for the eight newly validated exercise videos', () => {
    const session = source('app/components/WorkoutSession.tsx')
    for (const slug of ['curl-halteres', 'developpe-couche-halteres', 'developpe-incline-barre', 'developpe-incline-halteres', 'dips-pectoraux', 'dips-triceps', 'donkey-calf-raise']) {
      expect(session).toContain(`videoUrl?.includes('${slug}.mp4')`)
      expect(session).toContain(`'/images/video-posters/${slug}.webp'`)
    }
    expect(session).toContain("videoUrl?.includes('/dips.mp4')")
    expect(session).toContain("'/images/video-posters/dips.webp'")
  })

  it('publishes only the eight canonical exercise rows through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_eight_validated_videos.sql')
    for (const id of [
      '21c4f23d-9de8-46ac-8b01-288770114156',
      '6d1481f8-1268-4904-8813-f1489995de77',
      '16fe52fe-eb99-4c38-81c9-e4a2952db88f',
      'c7cc2bc5-5fd9-4abb-9b44-4f90e8181174',
      'd4ed9190-3ea8-4408-9b53-81c52a2cfaba',
      'fdda49d3-d68b-431b-a3ef-8e970323d9b6',
      '57a8eb7d-3bf6-48bb-9b61-62761403f647',
      '6459ea74-cea8-480a-8f6f-463545d9ca2d',
    ]) expect(operation).toContain(id)
    for (const slug of ['curl-halteres', 'developpe-couche-halteres', 'developpe-incline-barre', 'developpe-incline-halteres', 'dips', 'dips-pectoraux', 'dips-triceps', 'donkey-calf-raise']) {
      expect(operation).toContain(`/videos/exercises/${slug}.mp4?v=1`)
    }
    expect(operation.match(/is distinct from/g)).toHaveLength(8)
  })

  it('uses local posters for the five newly validated elevation, cardio and extension videos', () => {
    const session = source('app/components/WorkoutSession.tsx')
    for (const slug of ['elevations-frontales-disque', 'elevations-laterales-halteres', 'elliptique', 'extension-jambes-machine', 'extension-nuque-haltere']) {
      expect(session).toContain(`videoUrl?.includes('${slug}.mp4')`)
      expect(session).toContain(`'/images/video-posters/${slug}.webp'`)
    }
  })

  it('publishes the five exercises and the Leg extension alias through idempotent SQL', () => {
    const operation = source('supabase/operations/publish_elevations_elliptique_extensions_videos.sql')
    for (const id of [
      'de4666ec-b699-4836-8788-37452d64caac',
      '42858a6c-b6b2-4797-976d-11942d57c78f',
      '7c4a85df-d287-42f1-8876-c9a0371c0666',
      '95063cbd-ca22-4ec4-b2f5-49c32d0ecbfd',
      '3a2df83f-7a09-4379-8cc1-4728e713abb8',
      'a5b3962a-d0f1-4c93-88e0-573474700521',
    ]) expect(operation).toContain(id)
    for (const slug of ['elevations-frontales-disque', 'elevations-laterales-halteres', 'elliptique', 'extension-jambes-machine', 'extension-nuque-haltere']) {
      expect(operation).toContain(`/videos/exercises/${slug}.mp4?v=1`)
    }
    expect(operation.match(/is distinct from/g)).toHaveLength(6)
  })
})
