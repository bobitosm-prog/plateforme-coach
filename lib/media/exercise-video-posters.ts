const LOCAL_EXERCISE_POSTERS = Object.freeze<Record<string, string>>({
  'arnold-press.mp4': '/images/video-posters/arnold-press.webp',
  'developpe-militaire-barre-debout.mp4': '/images/video-posters/developpe-militaire-barre-debout.webp',
  'developpe-militaire-barre.mp4': '/images/video-posters/developpe-militaire-barre.webp',
  'developpe-militaire.mp4': '/images/video-posters/developpe-militaire.webp',
  'elevations-frontales-halteres.mp4': '/images/video-posters/elevations-frontales-halteres.webp',
  'elevations-laterales-halteres.mp4': '/images/video-posters/elevations-laterales-halteres.webp',
  'hack-squat-machine.mp4': '/images/video-posters/hack-squat-machine.webp',
  'hip-thrust.mp4': '/images/video-posters/hip-thrust.webp',
  'kettlebell-swing.mp4': '/images/video-posters/kettlebell-swing.webp',
  'leg-extension.mp4': '/images/video-posters/leg-extension.webp',
  'leg-press.mp4': '/images/video-posters/leg-press.webp',
  'pull-over-poulie-haute.mp4': '/images/video-posters/pull-over-poulie-haute.webp',
  'rowing-barre.mp4': '/images/video-posters/rowing-barre.webp',
  'souleve-de-terre-roumain.mp4': '/images/video-posters/souleve-de-terre-roumain.webp',
  'souleve-de-terre.mp4': '/images/video-posters/souleve-de-terre.webp',
  'squat-barre.mp4': '/images/video-posters/squat-barre.webp',
  'tractions-pronation.mp4': '/images/video-posters/tractions-pronation.webp',
})

export function resolveLocalExerciseVideoPoster(videoUrl: string | null | undefined): string | null {
  if (!videoUrl?.startsWith('/videos/exercises/')) return null
  const filename = videoUrl.split('?')[0]?.split('/').at(-1)
  return filename ? LOCAL_EXERCISE_POSTERS[filename] ?? null : null
}

export const LOCAL_EXERCISE_VIDEO_POSTERS = LOCAL_EXERCISE_POSTERS
