import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'
import { ImageValidationError } from '@/lib/photos/sanitize-image'
import { writeTrustedPhoto } from '@/lib/photos/trusted-photo-writer'

export const runtime = 'nodejs'
export const maxDuration = 30
const MAX_BYTES = 4_000_000 // Below the hosting request limit; raw binary, not base64.

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    cookies: { getAll: () => cookieStore.getAll() },
  })
  const { data: { user }, error } = await db.auth.getUser()
  if (error || !user) return Response.json({error:'Non autorisé'},{status:401})
  const limit = checkRateLimit(`photo-upload:${user.id}`,10,60_000)
  if (!limit.allowed) return Response.json({error:'Trop de photos. Réessayez dans une minute.'},{status:429,headers:{'Retry-After':String(limit.retryAfter || 60)}})
  const bucket = new URL(req.url).searchParams.get('bucket')
  if (bucket !== 'avatars' && bucket !== 'progress-photos') return Response.json({error:'Destination invalide'},{status:400})
  try {
    if (Number(req.headers.get('content-length')) > MAX_BYTES) throw new ImageValidationError(413)
    if (!req.body) throw new ImageValidationError(415)
    const reader = req.body.getReader(), chunks: Uint8Array[] = []
    const signal = AbortSignal.any([req.signal,AbortSignal.timeout(10_000)])
    const cancel = () => { void reader.cancel().catch(()=>{}) }
    signal.addEventListener('abort',cancel,{once:true})
    let length = 0
    try {
      while (true) {
        signal.throwIfAborted()
        const {done,value} = await reader.read()
        signal.throwIfAborted()
        if (done) break
        length += value.byteLength
        if (length > MAX_BYTES) throw new ImageValidationError(413)
        chunks.push(value)
      }
    } finally { signal.removeEventListener('abort',cancel); await reader.cancel().catch(()=>{}); reader.releaseLock() }
    const path = await writeTrustedPhoto(user.id,bucket,Buffer.concat(chunks,length),req.signal)
    return Response.json({path},{headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    const status = error instanceof ImageValidationError ? error.status : req.signal.aborted ? 422 : 503
    return Response.json({error:status === 413 ? 'Photo trop volumineuse (maximum 4 Mo).' : status === 415
      ? 'Photo illisible. Utilisez JPEG, PNG, WebP ou GIF.' : 'Envoi de la photo indisponible. Réessayez.'},{status})
  }
}
