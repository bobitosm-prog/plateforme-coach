import { versionedObjectKey } from './naming'
import type { MediaDeliveryEntry, MediaUrlResolver } from './types'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}
export function createMediaUrlResolver(input: {
  readonly mode: 'local' | 'cdn'
  readonly publicBaseUrl?: string
}): MediaUrlResolver {
  const base = input.mode === 'cdn' ? trimTrailingSlash(input.publicBaseUrl ?? '') : ''
  if (input.mode === 'cdn' && !/^https:\/\//.test(base)) {
    throw new Error('CDN publicBaseUrl must use HTTPS')
  }

  return {
    resolve(entry: MediaDeliveryEntry) {
      if (entry.visibility === 'private-user') {
        return {
          kind: 'signature-required',
          objectKey: entry.logicalPath,
          cacheControl: 'private, no-store',
        } as const
      }
      const path = input.mode === 'cdn' ? versionedObjectKey(entry) : entry.logicalPath
      return {
        kind: 'public',
        url: input.mode === 'cdn' ? `${base}/${path}` : `/${path}`,
        cacheControl: 'public, max-age=31536000, immutable',
      } as const
    },
  }
}
