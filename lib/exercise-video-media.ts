// Validated videos imported from the exercise-production branch.
// Keep this manifest with the media files so every deployment contains its links.
const publishedVideos = new Set([
  "ab-roller",
  "abduction-machine",
  "adduction-machine",
  "arnold-press",
  "battle-ropes",
  "box-jump",
  "burpees",
  "cable-crunch",
  "crunch",
  "curl-barre-droite",
  "curl-barre-ez",
  "curl-concentre",
  "curl-halteres",
  "curl-halteres-simultane",
  "curl-incline",
  "curl-machine",
  "curl-poulie-basse",
  "curl-pupitre",
  "curl-spider",
  "developpe-assis-halteres",
  "developpe-couche-barre",
  "developpe-couche-halteres",
  "developpe-couche-machine",
  "developpe-incline-barre",
  "developpe-incline-halteres",
  "developpe-militaire",
  "dips",
  "dips-pectoraux",
  "dips-triceps",
  "donkey-calf-raise",
  "elevations-frontales-disque",
  "elevations-laterales-halteres",
  "elliptique",
  "extension-jambes-machine",
  "extension-nuque-haltere",
  "squat-barre"
])

export function exerciseMedia(url?: string | null) {
  if (!url) return { video: undefined, poster: undefined }
  const filename = url.split('?')[0].split('/').pop() || ''
  const slug = filename.replace(/\.mp4$/, '')
  if (publishedVideos.has(slug)) return {
    video: `/videos/exercises/${slug}.mp4?v=moovx-20261006`,
    poster: `/images/video-posters/${slug}.webp`,
  }
  return { video: url, poster: undefined }
}
