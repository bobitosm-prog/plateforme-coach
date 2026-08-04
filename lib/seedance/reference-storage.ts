import 'server-only'

import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const STAGING_PROJECT_REF = 'cycbnnojcymjnaqomlyj'
const PRODUCTION_PROJECT_REF = 'njlzossopgknanhkzcbk'
const REQUIRED_BUCKET = 'seedance-references'
const DEFAULT_TTL_SECONDS = 900
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024
const RETENTION_MS = 24 * 60 * 60 * 1000
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const OBJECT_PATH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/

export type SeedanceReferenceUrlClass = 'local_test' | 'staging_https' | 'production_https'

export class SeedanceReferenceStorageError extends Error {
  constructor(readonly code: string) {
    super(`Seedance reference storage failed: ${code}`)
    this.name = 'SeedanceReferenceStorageError'
  }
}

interface ReferenceStorageConfig {
  url: string
  serviceRoleKey: string
  bucket: string
  ttlSeconds: number
  maxBytes: number
  allowedHost: string
}

export interface SeedanceReferenceUpload {
  objectPath: string
  signedUrl: string
  expiresAt: string
}

function integerEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new SeedanceReferenceStorageError('INVALID_CONFIGURATION')
  return parsed
}

function config(): ReferenceStorageConfig {
  const url = process.env.SEEDANCE_REFERENCE_SUPABASE_URL?.trim() ?? ''
  const serviceRoleKey = process.env.SEEDANCE_REFERENCE_SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  const bucket = process.env.SEEDANCE_REFERENCE_BUCKET?.trim() ?? ''
  const allowedHost = process.env.SEEDANCE_REFERENCE_ALLOWED_HOST?.trim() ?? ''
  const expectedHost = `${STAGING_PROJECT_REF}.supabase.co`

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new SeedanceReferenceStorageError('INVALID_CONFIGURATION')
  }
  if (
    parsed.protocol !== 'https:'
    || parsed.hostname !== expectedHost
    || parsed.username
    || parsed.password
    || allowedHost !== expectedHost
    || bucket !== REQUIRED_BUCKET
    || !serviceRoleKey
  ) {
    throw new SeedanceReferenceStorageError('INVALID_CONFIGURATION')
  }

  return {
    url: parsed.origin,
    serviceRoleKey,
    bucket,
    ttlSeconds: integerEnv('SEEDANCE_REFERENCE_SIGNED_URL_TTL_SECONDS', DEFAULT_TTL_SECONDS),
    maxBytes: integerEnv('SEEDANCE_REFERENCE_MAX_BYTES', DEFAULT_MAX_BYTES),
    allowedHost,
  }
}

function clientFor(settings: ReferenceStorageConfig) {
  return createClient(settings.url, settings.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function extensionFor(mimeType: string): 'png' | 'jpg' | 'webp' {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'
  throw new SeedanceReferenceStorageError('MIME_NOT_ALLOWED')
}

function validateObjectPath(objectPath: string): string {
  if (!OBJECT_PATH_RE.test(objectPath)) throw new SeedanceReferenceStorageError('INVALID_OBJECT_PATH')
  return objectPath
}

export function isSeedanceReferenceStorageEnabled(): boolean {
  const nonProduction = process.env.VERCEL_ENV !== 'production'
    && (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview' || process.env.MOOVX_ENVIRONMENT === 'staging')
  return nonProduction
    && Boolean(process.env.SEEDANCE_REFERENCE_SUPABASE_URL)
    && Boolean(process.env.SEEDANCE_REFERENCE_SUPABASE_SERVICE_ROLE_KEY)
}

export function classifySeedanceReferenceUrl(value: string): SeedanceReferenceUrlClass {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new SeedanceReferenceStorageError('INVALID_REFERENCE_URL')
  }
  if (url.username || url.password) throw new SeedanceReferenceStorageError('URL_CREDENTIALS_FORBIDDEN')

  if (url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost') && url.port) {
    return 'local_test'
  }
  if (url.protocol !== 'https:') throw new SeedanceReferenceStorageError('REFERENCE_URL_FORBIDDEN')

  const allowedHost = process.env.SEEDANCE_REFERENCE_ALLOWED_HOST?.trim()
  if (allowedHost && url.hostname === allowedHost && allowedHost === `${STAGING_PROJECT_REF}.supabase.co`) {
    return 'staging_https'
  }
  if (url.hostname === `${PRODUCTION_PROJECT_REF}.supabase.co`) return 'production_https'
  throw new SeedanceReferenceStorageError('REFERENCE_HOST_FORBIDDEN')
}

export function assertSeedanceProviderReferenceUrl(value: string): SeedanceReferenceUrlClass {
  const classification = classifySeedanceReferenceUrl(value)
  if (classification === 'local_test' && process.env.SEEDANCE_PROVIDER_MODE === 'mock') return classification
  if (classification !== 'staging_https') throw new SeedanceReferenceStorageError('REFERENCE_CLASS_FORBIDDEN')

  const settings = config()
  const url = new URL(value)
  const prefix = `/storage/v1/object/sign/${settings.bucket}/`
  if (!url.pathname.startsWith(prefix) || !url.searchParams.has('token')) {
    throw new SeedanceReferenceStorageError('SIGNED_URL_REQUIRED')
  }
  return classification
}

export function objectPathFromSignedReferenceUrl(value: string): string {
  assertSeedanceProviderReferenceUrl(value)
  const settings = config()
  const url = new URL(value)
  const prefix = `/storage/v1/object/sign/${settings.bucket}/`
  return validateObjectPath(decodeURIComponent(url.pathname.slice(prefix.length)))
}

export function referenceObjectPathFromParams(params: unknown): string | null {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return null
  const path = (params as Record<string, unknown>).seedance_reference_path
  return typeof path === 'string' && OBJECT_PATH_RE.test(path) ? path : null
}

async function verifySignedUrl(signedUrl: string, allowedHost: string): Promise<void> {
  assertSeedanceProviderReferenceUrl(signedUrl)
  const response = await fetch(signedUrl, { method: 'HEAD', redirect: 'manual' })
  if (response.status >= 300 && response.status < 400) throw new SeedanceReferenceStorageError('REDIRECT_FORBIDDEN')
  if (!response.ok) throw new SeedanceReferenceStorageError('SIGNED_URL_UNREADABLE')
  const responseUrl = new URL(response.url || signedUrl)
  if (responseUrl.hostname !== allowedHost || responseUrl.origin !== new URL(signedUrl).origin) {
    throw new SeedanceReferenceStorageError('REDIRECT_ORIGIN_FORBIDDEN')
  }
}

export async function createSignedSeedanceReference(objectPath: string): Promise<SeedanceReferenceUpload> {
  const settings = config()
  const validPath = validateObjectPath(objectPath)
  const storage = clientFor(settings).storage.from(settings.bucket)
  const { data, error } = await storage.createSignedUrl(validPath, settings.ttlSeconds)
  if (error || !data?.signedUrl) throw new SeedanceReferenceStorageError('SIGNING_FAILED')
  await verifySignedUrl(data.signedUrl, settings.allowedHost)
  return {
    objectPath: validPath,
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + settings.ttlSeconds * 1000).toISOString(),
  }
}

export async function uploadSeedanceReference(input: {
  bytes: Uint8Array
  mimeType: string
  correlationId: string
}): Promise<SeedanceReferenceUpload> {
  const settings = config()
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) throw new SeedanceReferenceStorageError('MIME_NOT_ALLOWED')
  if (input.bytes.byteLength > settings.maxBytes) throw new SeedanceReferenceStorageError('FILE_TOO_LARGE')
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/.test(input.correlationId)) {
    throw new SeedanceReferenceStorageError('INVALID_CORRELATION_ID')
  }

  const objectPath = `${input.correlationId}/${randomUUID()}.${extensionFor(input.mimeType)}`
  const storage = clientFor(settings).storage.from(settings.bucket)
  const { error } = await storage.upload(objectPath, input.bytes, {
    cacheControl: '0',
    contentType: input.mimeType,
    upsert: false,
  })
  if (error) throw new SeedanceReferenceStorageError('UPLOAD_FAILED')

  try {
    return await createSignedSeedanceReference(objectPath)
  } catch (error: unknown) {
    await storage.remove([objectPath]).catch(() => undefined)
    throw error
  }
}

export async function removeSeedanceReference(objectPath: string): Promise<void> {
  const settings = config()
  const { error } = await clientFor(settings).storage.from(settings.bucket).remove([validateObjectPath(objectPath)])
  if (error) throw new SeedanceReferenceStorageError('CLEANUP_FAILED')
}

export async function purgeExpiredSeedanceReferences(now = Date.now()): Promise<number> {
  const settings = config()
  const storage = clientFor(settings).storage.from(settings.bucket)
  const { data: folders, error: folderError } = await storage.list('', { limit: 1000 })
  if (folderError) throw new SeedanceReferenceStorageError('PURGE_LIST_FAILED')

  const expired: string[] = []
  for (const folder of folders ?? []) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/.test(folder.name)) continue
    const { data: objects, error } = await storage.list(folder.name, { limit: 1000 })
    if (error) throw new SeedanceReferenceStorageError('PURGE_LIST_FAILED')
    for (const object of objects ?? []) {
      const createdAt = object.created_at ? Date.parse(object.created_at) : Number.NaN
      const path = `${folder.name}/${object.name}`
      if (Number.isFinite(createdAt) && now - createdAt >= RETENTION_MS && OBJECT_PATH_RE.test(path)) expired.push(path)
    }
  }
  if (expired.length === 0) return 0
  const { error } = await storage.remove(expired)
  if (error) throw new SeedanceReferenceStorageError('PURGE_REMOVE_FAILED')
  return expired.length
}
