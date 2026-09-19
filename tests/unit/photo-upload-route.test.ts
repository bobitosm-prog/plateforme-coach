import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import sharp from 'sharp'
const m=vi.hoisted(()=>({user:vi.fn(),upload:vi.fn(),limit:vi.fn(),bucket:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[]})}))
vi.mock('@supabase/ssr',()=>({createServerClient:()=>({auth:{getUser:m.user}})}))
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({storage:{from:m.bucket}})}))
vi.mock('@/lib/rate-limit',()=>({checkRateLimit:m.limit}))
import {POST} from '@/app/api/photos/upload/route'
const jpeg=new Uint8Array(await sharp({create:{width:4,height:2,channels:3,background:'#fff'}})
 .withExif({IFD0:{Artist:'PRIVATE-ARTIST'}}).jpeg().toBuffer())
function request(body:Uint8Array=jpeg,bucket='avatars',headers:Record<string,string>={}) {
 return new Request(`http://localhost/api/photos/upload?bucket=${bucket}`,{method:'POST',body:body as BodyInit,headers})
}
beforeEach(()=>{
 vi.clearAllMocks()
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://synthetic.supabase.co')
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-server-only')
 m.user.mockResolvedValue({data:{user:{id:'00000000-0000-4000-8000-000000000001'}}})
 m.limit.mockReturnValue({allowed:true})
 m.upload.mockResolvedValue({data:{},error:null});m.bucket.mockReturnValue({upload:m.upload})
})
afterEach(()=>vi.unstubAllEnvs())
describe('sanitized image upload endpoint',()=>{
 it.each(['avatars','progress-photos'])('uses verified identity and uploads only decoded, metadata-free bytes: %s',async bucket=>{
  const response=await POST(request(jpeg,bucket))
  expect(response.status).toBe(200)
  const {path}=await response.json()
  expect(path).toMatch(/^00000000-0000-4000-8000-000000000001\/[0-9a-f-]+\.jpg$/)
  expect(m.bucket).toHaveBeenCalledWith(bucket)
  const [storedPath,bytes,options]=m.upload.mock.calls[0]
  expect(storedPath).toBe(path);expect(options).toEqual({contentType:'image/jpeg',cacheControl:'60',upsert:false})
  expect((await sharp(bytes).metadata()).exif).toBeUndefined()
  expect(bytes.toString()).not.toContain('PRIVATE-ARTIST')
 })
 it('rejects anonymous requests before parsing or Storage access',async()=>{
  m.user.mockResolvedValue({data:{user:null}})
  expect((await POST(request())).status).toBe(401)
  expect(m.upload).not.toHaveBeenCalled();expect(m.limit).not.toHaveBeenCalled()
 })
 it('rate limits by verified identity before decoding',async()=>{
  m.limit.mockReturnValue({allowed:false,retryAfter:42})
  const response=await POST(request())
  expect(response.status).toBe(429);expect(response.headers.get('Retry-After')).toBe('42')
  expect(m.limit).toHaveBeenCalledWith('photo-upload:00000000-0000-4000-8000-000000000001',10,60_000)
  expect(m.upload).not.toHaveBeenCalled()
 })
 it('refuses destinations, malformed bytes and both declared and actual oversized bodies',async()=>{
  expect((await POST(request(jpeg,'other'))).status).toBe(400)
  expect((await POST(request(new Uint8Array([255,216,255,217])))).status).toBe(415)
  expect((await POST(request(jpeg,'avatars',{'content-length':'4000001'}))).status).toBe(413)
  expect((await POST(request(new Uint8Array(4_000_001)))).status).toBe(413)
  expect(m.upload).not.toHaveBeenCalled()
 })
 it('does not leak Storage failure details or report false success',async()=>{
  m.upload.mockResolvedValue({error:{message:'PRIVATE-URL-TOKEN'}})
  const response=await POST(request())
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('PRIVATE-URL-TOKEN')
 })
 it('fails closed without the server credential and never falls back to session Storage',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','')
  expect((await POST(request())).status).toBe(503)
  expect(m.upload).not.toHaveBeenCalled()
 })
 it('does not accept a client-selected owner or destination path',async()=>{
  const req=new Request('http://localhost/api/photos/upload?bucket=avatars&userId=other&path=other/avatar.jpg',{method:'POST',body:jpeg})
  expect((await POST(req)).status).toBe(200)
  expect(m.upload.mock.calls[0][0]).toMatch(/^00000000-0000-4000-8000-000000000001\//)
 })
 it('cancels stalled request streams without upload',async()=>{
  const controller=new AbortController()
  const req=new Request('http://localhost/api/photos/upload?bucket=avatars',{
    method:'POST',body:new ReadableStream(),signal:controller.signal,duplex:'half',
  } as RequestInit)
  const response=POST(req)
  await vi.waitFor(()=>expect(m.limit).toHaveBeenCalled())
  controller.abort()
  expect((await response).status).toBe(422);expect(m.upload).not.toHaveBeenCalled()
 })
})
