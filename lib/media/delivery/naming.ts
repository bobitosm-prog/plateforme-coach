import type { MediaDeliveryEntry } from './types'

export function versionedObjectKey(entry: MediaDeliveryEntry): string {
  const slash = entry.logicalPath.lastIndexOf('/')
  const directory = slash < 0 ? '' : entry.logicalPath.slice(0, slash + 1)
  const filename = slash < 0 ? entry.logicalPath : entry.logicalPath.slice(slash + 1)
  const dot = filename.lastIndexOf('.')
  const stem = dot <= 0 ? filename : filename.slice(0, dot)
  const extension = dot <= 0 ? '' : filename.slice(dot)
  return `${directory}${stem}.${entry.sha256.slice(0, 16)}${extension}`
}
