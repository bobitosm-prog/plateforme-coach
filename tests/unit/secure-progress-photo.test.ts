import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import sharp from 'sharp'
vi.mock('server-only',()=>({}))
import {fetchOwnProgressPhoto,ownProgressPhotoPath,safePhotoError} from '@/lib/photos/secure-progress-photo'
const origin='https://synthetic.supabase.co', user='00000000-0000-4000-8000-000000000001'
const base=`${origin}/storage/v1/object/sign/progress-photos/${user}/photo.jpg`
const sign=vi.fn()
const db={storage:{from:()=>({createSignedUrl:sign})}} as never
const jpeg=new Uint8Array(await sharp({create:{width:2,height:2,channels:3,background:'#ffffff'}}).jpeg().toBuffer())
beforeEach(()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',origin)
 sign.mockReset().mockResolvedValue({data:{signedUrl:base+'?token=fresh-server'}})
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>new Response(jpeg,{headers:{'Content-Type':'image/jpeg'}})))
})
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.useRealTimers()})
describe('owned Storage image boundary',()=>{
 it.each(['http://127.0.0.1/a','http://169.254.169.254/latest','file:///etc/passwd',
   'https://evil.invalid/a',origin+'.evil.invalid/a',origin+'/storage/v1/object/sign/avatars/'+user+'/a.jpg',
   base.replace(user,'00000000-0000-4000-8000-000000000002'),base.replace('photo.jpg','../other/a.jpg'),
   base.replace('photo.jpg','%2e%2e/a.jpg'),base.replace('photo.jpg','%252e%252e'),base+'#x',
   base.replace(user,user+'%2fother')])('refuses unsafe address before any network request: %s',async url=>{
   await expect(fetchOwnProgressPhoto(db,user,url)).rejects.toMatchObject({status:400})
   expect(sign).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled()
 })
 it('re-signs the owned path, ignores incoming tokens and forbids redirects',async()=>{
   const result=await fetchOwnProgressPhoto(db,user,base+'?token=untrusted-client')
   expect(result.mediaType).toBe('image/jpeg')
   expect(sign).toHaveBeenCalledWith(`${user}/photo.jpg`,60)
   expect(fetch).toHaveBeenCalledWith(base+'?token=fresh-server',expect.objectContaining({redirect:'error',cache:'no-store',signal:expect.any(AbortSignal)}))
 })
 it('preserves support for old public URLs but never fetches them directly',()=>{
   expect(ownProgressPhotoPath(base.replace('/sign/','/public/'),user,origin)).toBe(`${user}/photo.jpg`)
 })
 it('fails closed on RLS denial or a signing destination mismatch',async()=>{
   sign.mockResolvedValueOnce({error:{message:'private token should not leak'}})
   await expect(fetchOwnProgressPhoto(db,user,base)).rejects.toMatchObject({status:403})
   sign.mockResolvedValueOnce({data:{signedUrl:'https://evil.invalid/photo'}})
   await expect(fetchOwnProgressPhoto(db,user,base)).rejects.toBeDefined()
   expect(fetch).not.toHaveBeenCalled()
 })
 it.each([
   {body:jpeg,headers:{'content-type':'image/jpeg','content-length':'5000001'},status:413},
   {body:new Uint8Array(5_000_001),headers:{'content-type':'image/jpeg'},status:413},
   {body:new TextEncoder().encode('<svg>unsafe</svg>'),headers:{'content-type':'image/jpeg'},status:415},
   {body:jpeg,headers:{'content-type':'text/html'},status:415},
   {body:new Uint8Array(),headers:{'content-type':'image/jpeg'},status:415},
 ])('checks actual bytes, not just headers ($status)',async({body,headers,status})=>{
   vi.mocked(fetch).mockResolvedValue(new Response(body,{headers:headers as Record<string,string>}))
   await expect(fetchOwnProgressPhoto(db,user,base)).rejects.toMatchObject({status})
 })
 it('bounds stalled signing and does not start a download after cancellation',async()=>{
   sign.mockReturnValue(new Promise(()=>{}))
   const abort=new AbortController()
   const promise=fetchOwnProgressPhoto(db,user,base,abort.signal)
   abort.abort()
   await expect(promise).rejects.toMatchObject({status:422})
   expect(fetch).not.toHaveBeenCalled()
 })
 it('bounds a stalled response body using the abort signal',async()=>{
   const cancel=vi.fn()
   vi.mocked(fetch).mockResolvedValue(new Response(new ReadableStream({cancel}),{headers:{'content-type':'image/jpeg'}}))
   const abort=new AbortController(), promise=fetchOwnProgressPhoto(db,user,base,abort.signal)
   await vi.waitFor(()=>expect(fetch).toHaveBeenCalled())
   abort.abort()
   await expect(promise).rejects.toMatchObject({status:422})
 })
 it('never exposes raw network/provider errors',async()=>{
   const response=safePhotoError(new Error('secret-token signed-url biometric-data'))
   expect(await response.text()).not.toMatch(/secret-token|signed-url|biometric-data/)
 })
})
