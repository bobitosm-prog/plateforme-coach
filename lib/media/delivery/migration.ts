import { versionedObjectKey } from './naming'
import type { MediaDeliveryEntry, MigrationDecision, RemoteObjectMetadata } from './types'

export function planMediaMigration(
  manifest: readonly MediaDeliveryEntry[],
  remote: readonly RemoteObjectMetadata[],
): readonly MigrationDecision[] {
  const byKey = new Map(remote.map(object => [object.objectKey, object]))
  return Object.freeze(manifest.map<MigrationDecision>(entry => {
    const objectKey = versionedObjectKey(entry)
    const existing = byKey.get(objectKey)
    if (!existing) return { kind: 'upload', entry, objectKey }
    if (
      existing.sha256 === entry.sha256
      && existing.bytes === entry.bytes
      && existing.contentType === entry.contentType
    ) {
      return { kind: 'skip-identical', entry, objectKey }
    }
    return { kind: 'conflict', entry, objectKey }
  }))
}
