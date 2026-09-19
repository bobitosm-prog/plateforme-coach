import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { sanitizeImage } from './sanitize-image'

/** Narrow server-only capability, not a general-purpose privileged Storage client.
 * Caller supplies ONLY the identity verified by auth.getUser(); no client path/upsert.
 * Raw input is always sanitized inside this boundary before privileged persistence.
 */
export async function writeTrustedPhoto(verifiedUserId: string, bucket: 'avatars' | 'progress-photos', input: Buffer, signal: AbortSignal) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(verifiedUserId)
    || !['avatars','progress-photos'].includes(bucket)) throw new Error('Invalid photo destination')
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if(!url || !key) throw new Error('Photo service unavailable')
  signal.throwIfAborted()
  const bytes=await sanitizeImage(input,4_000_000)
  signal.throwIfAborted()
  const db=createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{fetch:(resource,init)=>fetch(resource,{...init,signal:AbortSignal.any([signal,AbortSignal.timeout(10_000)])})},
  })
  const path=`${verifiedUserId}/${randomUUID()}.jpg`
  const {error}=await db.storage.from(bucket).upload(path,bytes,{contentType:'image/jpeg',cacheControl:'60',upsert:false})
  if(error) throw new Error('Photo upload unavailable')
  return path
}
