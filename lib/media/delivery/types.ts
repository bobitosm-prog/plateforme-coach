export type MediaVisibility = 'public-versioned' | 'private-user'
export type MediaKind = 'image' | 'video' | 'font' | 'other'

export interface MediaDeliveryEntry {
  readonly logicalPath: string
  readonly sha256: string
  readonly bytes: number
  readonly contentType: string
  readonly kind: MediaKind
  readonly visibility: MediaVisibility
}
export interface PublicMediaLocation {
  readonly kind: 'public'
  readonly url: string
  readonly cacheControl: 'public, max-age=31536000, immutable'
}

export interface PrivateMediaLocation {
  readonly kind: 'signature-required'
  readonly objectKey: string
  readonly cacheControl: 'private, no-store'
}

export type MediaLocation = PublicMediaLocation | PrivateMediaLocation

export interface MediaUrlResolver {
  resolve(entry: MediaDeliveryEntry): MediaLocation
}

export type MigrationDecision =
  | { readonly kind: 'upload'; readonly entry: MediaDeliveryEntry; readonly objectKey: string }
  | { readonly kind: 'skip-identical'; readonly entry: MediaDeliveryEntry; readonly objectKey: string }
  | { readonly kind: 'conflict'; readonly entry: MediaDeliveryEntry; readonly objectKey: string }

export interface RemoteObjectMetadata {
  readonly objectKey: string
  readonly sha256: string | null
  readonly bytes: number
  readonly contentType: string
}
