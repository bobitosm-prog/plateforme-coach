import type { MediaDeliveryEntry } from './types'

export interface MediaHttpPolicy {
  readonly cacheControl: string
  readonly corsAllowedMethods: readonly ('GET' | 'HEAD')[]
  readonly corsAllowedOrigins: readonly string[]
  readonly exposeHeaders: readonly ('Accept-Ranges' | 'Content-Length' | 'Content-Range' | 'ETag')[]
  readonly rangeRequests: 'required-for-video' | 'optional'
}
export function mediaHttpPolicy(
  entry: MediaDeliveryEntry,
  publicOrigins: readonly string[],
): MediaHttpPolicy {
  return Object.freeze({
    cacheControl: entry.visibility === 'public-versioned'
      ? 'public, max-age=31536000, immutable'
      : 'private, no-store',
    corsAllowedMethods: Object.freeze(['GET', 'HEAD'] as const),
    corsAllowedOrigins: Object.freeze(entry.visibility === 'public-versioned' ? [...publicOrigins] : []),
    exposeHeaders: Object.freeze(['Accept-Ranges', 'Content-Length', 'Content-Range', 'ETag'] as const),
    rangeRequests: entry.kind === 'video' ? 'required-for-video' : 'optional',
  })
}
