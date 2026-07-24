import type { MediaDeliveryEntry } from './types'

const SHA256 = /^[a-f0-9]{64}$/
const CONTENT_TYPE = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i

function hasSafePath(path: string): boolean {
  return path.length > 0
    && !path.startsWith('/')
    && !path.includes('\\')
    && path.split('/').every(part => part !== '' && part !== '.' && part !== '..')
}
export function validateMediaDeliveryEntry(entry: MediaDeliveryEntry): readonly string[] {
  const errors: string[] = []
  if (!hasSafePath(entry.logicalPath)) errors.push('logicalPath: invalid')
  if (!SHA256.test(entry.sha256)) errors.push('sha256: invalid')
  if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0) errors.push('bytes: invalid')
  if (!CONTENT_TYPE.test(entry.contentType)) errors.push('contentType: invalid')
  return errors
}

export function createMediaDeliveryManifest(
  entries: readonly MediaDeliveryEntry[],
): readonly MediaDeliveryEntry[] {
  const paths = new Set<string>()
  const result = entries.map(entry => {
    const errors = validateMediaDeliveryEntry(entry)
    if (errors.length > 0) throw new Error(`Invalid media manifest entry: ${errors.join(', ')}`)
    if (paths.has(entry.logicalPath)) throw new Error('Invalid media manifest entry: duplicate logicalPath')
    paths.add(entry.logicalPath)
    return Object.freeze({ ...entry })
  })
  return Object.freeze(result)
}
