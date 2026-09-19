import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export class PhotoAccessError extends Error {
  constructor(public readonly status = 400) { super('Photo unavailable') }
}
const MAX_BYTES = 5_000_000
type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

async function beforeAbort<T>(work: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  let onAbort: () => void = () => {}
  const aborted = new Promise<never>((_,reject) => {
    onAbort = () => reject(new PhotoAccessError(422))
    signal.addEventListener('abort',onAbort,{once:true})
  })
  try { return await Promise.race([Promise.resolve(work),aborted]) }
  finally { signal.removeEventListener('abort',onAbort) }
}

/** Only the configured Storage origin and the verified user's own folder. */
export function ownProgressPhotoPath(input: unknown, userId: string, origin: string): string {
  if (typeof input !== 'string' || input.length > 8192 || !userId) throw new PhotoAccessError()
  try {
    const base = new URL(origin)
    const url = new URL(input)
    if (base.protocol !== 'https:' || url.origin !== base.origin || url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error()
    // Reject ambiguous/traversal encodings before URL normalization can erase them.
    if (/%2f|%5c|%2e|\\|\/\.\.?\//i.test(input.split('?')[0])) throw new Error()
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/progress-photos\/(.+)$/)
    if (!match) throw new Error()
    const parts = match[1].split('/').map(decodeURIComponent)
    if (parts.length < 2 || parts[0] !== userId || parts.some(p => !/^[a-zA-Z0-9._-]+$/.test(p) || p === '.' || p === '..')) throw new Error()
    return parts.join('/')
  } catch { throw new PhotoAccessError() }
}

function imageType(bytes: Buffer): MediaType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png'
  if (bytes.length >= 12 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') return 'image/webp'
  if (['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6))) return 'image/gif'
  return null
}

/** Re-sign through the session client (RLS); never use the submitted URL/token. */
export async function fetchOwnProgressPhoto(db: SupabaseClient, userId: string, input: unknown, requestSignal?: AbortSignal) {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!origin) throw new PhotoAccessError(503)
  const path = ownProgressPhotoPath(input,userId,origin)
  const signal = AbortSignal.any([AbortSignal.timeout(10_000), ...(requestSignal ? [requestSignal] : [])])
  try {
    signal.throwIfAborted()
    const {data,error} = await beforeAbort(db.storage.from('progress-photos').createSignedUrl(path,60),signal)
    if (error || !data?.signedUrl) throw new PhotoAccessError(403)
    if (ownProgressPhotoPath(data.signedUrl,userId,origin) !== path) throw new PhotoAccessError(403)
    const response = await fetch(data.signedUrl,{redirect:'error',signal,cache:'no-store'})
    if (!response.ok || !response.body) throw new PhotoAccessError(422)
    const declared = response.headers.get('content-length')
    if (declared && (!/^\d+$/.test(declared) || Number(declared)>MAX_BYTES)) {
      await response.body.cancel(); throw new PhotoAccessError(413)
    }
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let length = 0
    try {
      while (true) {
        signal.throwIfAborted()
        const {done,value} = await beforeAbort(reader.read(),signal)
        if (done) break
        length += value.byteLength
        if (length>MAX_BYTES) throw new PhotoAccessError(413)
        chunks.push(value)
      }
    } finally { await reader.cancel().catch(()=>{}); reader.releaseLock() }
    const bytes=Buffer.concat(chunks,length)
    const mediaType=imageType(bytes)
    const declaredType=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    if (!mediaType || declaredType !== mediaType) throw new PhotoAccessError(415)
    return {base64:bytes.toString('base64'),mediaType}
  } catch(error) {
    if (error instanceof PhotoAccessError) throw error
    throw new PhotoAccessError(422)
  }
}

export function safePhotoError(error: unknown) {
  const status=error instanceof PhotoAccessError ? error.status : 502
  return Response.json({error:status===413 ? 'Photo trop volumineuse (maximum 5 Mo).' : status===415
    ? 'Format photo non pris en charge. Utilisez JPEG, PNG, WebP ou GIF.' : 'Photo ou analyse indisponible. Réessayez avec une photo de votre compte.'}, {status})
}
