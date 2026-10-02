import { describe, expect, it } from 'vitest'
import {
  createMediaDeliveryManifest,
  createMediaUrlResolver,
  mediaHttpPolicy,
  planMediaMigration,
  versionedObjectKey,
  PUBLIC_POSTER_MANIFEST,
  type MediaDeliveryEntry,
} from '../../lib/media/delivery'

const publicVideo: MediaDeliveryEntry = {
  logicalPath: 'videos/exercises/squat.mp4',
  sha256: 'a'.repeat(64),
  bytes: 42,
  contentType: 'video/mp4',
  kind: 'video',
  visibility: 'public-versioned',
}

const privateVideo: MediaDeliveryEntry = {
  ...publicVideo,
  logicalPath: 'feedback/owner/opaque.mp4',
  visibility: 'private-user',
}

describe('media delivery contract', () => {
  it('creates an immutable strict manifest without mutating inputs', () => {
    const input = [publicVideo]
    const manifest = createMediaDeliveryManifest(input)
    expect(manifest).not.toBe(input)
    expect(manifest[0]).not.toBe(publicVideo)
    expect(Object.isFrozen(manifest)).toBe(true)
    expect(publicVideo.logicalPath).toBe('videos/exercises/squat.mp4')
  })

  it.each(['../secret.mp4', '/absolute.mp4', 'a//b.mp4', 'a\\b.mp4'])(
    'rejects unsafe paths: %s',
    logicalPath => expect(() => createMediaDeliveryManifest([{ ...publicVideo, logicalPath }])).toThrow(),
  )

  it('rejects invalid hashes, sizes and MIME types', () => {
    expect(() => createMediaDeliveryManifest([{ ...publicVideo, sha256: 'bad' }])).toThrow()
    expect(() => createMediaDeliveryManifest([{ ...publicVideo, bytes: -1 }])).toThrow()
    expect(() => createMediaDeliveryManifest([{ ...publicVideo, contentType: 'video' }])).toThrow()
  })

  it('uses deterministic content-versioned names', () => {
    expect(versionedObjectKey(publicVideo)).toBe('videos/exercises/squat.aaaaaaaaaaaaaaaa.mp4')
  })

  it('resolves public local and CDN URLs but never emits a private URL', () => {
    expect(createMediaUrlResolver({ mode: 'local' }).resolve(publicVideo)).toMatchObject({
      kind: 'public',
      url: '/videos/exercises/squat.mp4',
    })
    expect(createMediaUrlResolver({
      mode: 'cdn',
      publicBaseUrl: 'https://media.example.test/',
    }).resolve(publicVideo)).toMatchObject({
      kind: 'public',
      url: 'https://media.example.test/videos/exercises/squat.aaaaaaaaaaaaaaaa.mp4',
    })
    expect(createMediaUrlResolver({ mode: 'local' }).resolve(privateVideo)).toEqual({
      kind: 'signature-required',
      objectKey: 'feedback/owner/opaque.mp4',
      cacheControl: 'private, no-store',
    })
  })

  it('requires immutable public caching and Range support for video', () => {
    expect(mediaHttpPolicy(publicVideo, ['https://app.example.test'])).toMatchObject({
      cacheControl: 'public, max-age=31536000, immutable',
      corsAllowedMethods: ['GET', 'HEAD'],
      corsAllowedOrigins: ['https://app.example.test'],
      rangeRequests: 'required-for-video',
    })
    expect(mediaHttpPolicy(privateVideo, [])).toMatchObject({
      cacheControl: 'private, no-store',
      corsAllowedOrigins: [],
    })
  })

  it('plans idempotent upload, skip and fail-closed conflict decisions', () => {
    const key = versionedObjectKey(publicVideo)
    expect(planMediaMigration([publicVideo], [])[0].kind).toBe('upload')
    expect(planMediaMigration([publicVideo], [{
      objectKey: key,
      sha256: publicVideo.sha256,
      bytes: publicVideo.bytes,
      contentType: publicVideo.contentType,
    }])[0].kind).toBe('skip-identical')
    expect(planMediaMigration([publicVideo], [{
      objectKey: key,
      sha256: 'b'.repeat(64),
      bytes: publicVideo.bytes,
      contentType: publicVideo.contentType,
    }])[0].kind).toBe('conflict')
  })

  it('bounds the deployed public poster manifest to 17 files and 216510 bytes', () => {
    expect(PUBLIC_POSTER_MANIFEST).toHaveLength(17)
    expect(PUBLIC_POSTER_MANIFEST.reduce((total, entry) => total + entry.bytes, 0)).toBe(216510)
    expect(PUBLIC_POSTER_MANIFEST.every(entry => entry.visibility === 'public-versioned')).toBe(true)
  })
})
