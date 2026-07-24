export interface DeferredVideoElement {
  src: string
  pause(): void
  load(): void
  play(): Promise<void>
  removeAttribute(name: 'src'): void
}

export function attachDeferredVideoSource(video: DeferredVideoElement, source: string): void {
  if (!source) return
  video.src = source
  video.load()
}

export function releaseDeferredVideo(video: DeferredVideoElement | null): void {
  if (!video) return
  try { video.pause() } catch {}
  try { video.removeAttribute('src') } catch {}
  try { video.load() } catch {}
}

export function mayAutoPlayVideo(input: {
  readonly autoPlay: boolean
  readonly muted: boolean
  readonly reducedMotion: boolean
}): boolean {
  return input.autoPlay && input.muted && !input.reducedMotion
}

export const DEFERRED_VIDEO_ERROR_MESSAGE = 'La vidéo est temporairement indisponible.'
