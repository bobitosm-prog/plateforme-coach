import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import type { NextRequest } from 'next/server'
const m=vi.hoisted(()=>({ user:vi.fn(),reserve:vi.fn(),settle:vi.fn(),generate:vi.fn(),sign:vi.fn() }))
vi.mock('server-only',()=>({}))
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[]})}))
vi.mock('@supabase/ssr',()=>({createServerClient:()=>({auth:{getUser:m.user},storage:{from:()=>({createSignedUrl:m.sign})}})}))
vi.mock('@/lib/rate-limit',()=>({checkRateLimit:()=>({allowed:true})}))
vi.mock('@/lib/ai/heavy-reservation',()=>({reserveHeavyAi:m.reserve,quotaUnavailable:()=>Response.json({error:'Unavailable'},{status:503})}))
vi.mock('@/lib/api-guard',()=>({guardCoachManagedCapabilities:async()=>null}))
vi.mock('@/lib/athena/generation-context',()=>({loadAthenaGenerationContext:async()=>({ok:true,prompt:'synthetic'})}))
vi.mock('@/lib/training/load-exercise-catalog',()=>({loadExerciseCatalog:async()=>[]}))
vi.mock('@/lib/training/generate-program',()=>({generateProgram:m.generate}))
import { POST as body } from '@/app/api/analyze-body/route'
import { POST as photo } from '@/app/api/analyze-progress-photo/route'
import { POST as program } from '@/app/api/generate-custom-program/route'
const routes=[
 {name:'analyze-body',post:body,input:{photoFrontUrl:'https://synthetic.invalid/storage/v1/object/sign/progress-photos/verified-user/front.jpg',photoBackUrl:'https://synthetic.invalid/storage/v1/object/sign/progress-photos/verified-user/back.jpg',photoSideUrl:'https://synthetic.invalid/storage/v1/object/sign/progress-photos/verified-user/side.jpg'}},
 {name:'analyze-progress-photo',post:photo,input:{photoUrl:'https://synthetic.invalid/storage/v1/object/sign/progress-photos/verified-user/photo.jpg'}},
 {name:'generate-custom-program',post:program,input:{objective:'fitness',level:'beginner',daysPerWeek:3,duration:45,equipment:'bodyweight'}},
]
function request(input:unknown){return new Request('http://localhost/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}) as NextRequest}
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('ANTHROPIC_API_KEY','synthetic-key')
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://synthetic.invalid')
 m.sign.mockImplementation(async path=>({data:{signedUrl:`https://synthetic.invalid/storage/v1/object/sign/progress-photos/${path}?token=server-synthetic`}}))
 m.user.mockResolvedValue({data:{user:{id:'verified-user'}}})
 m.settle.mockResolvedValue(true);m.reserve.mockResolvedValue({ok:true,settle:m.settle})
 m.generate.mockResolvedValue({weeks:[]})
 vi.stubGlobal('fetch',vi.fn(async input=>String(input).includes('api.anthropic.com')
   ? Response.json({content:[{type:'text',text:'Synthetic analysis'},{type:'tool_use',input:{summary:'Synthetic'}}]})
   : new Response(new Uint8Array([255,216,255,217]),{headers:{'Content-Type':'image/jpeg'}})))
 vi.spyOn(console,'error').mockImplementation(()=>{})
 vi.spyOn(console,'warn').mockImplementation(()=>{})
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals()})
describe.each(routes)('$name quota lifecycle',({name,post,input})=>{
 it('does not fetch an arbitrary URL or leak details from provider failures',async()=>{
   if(name==='generate-custom-program') return
   const unsafe={...input,photoUrl:'http://169.254.169.254/latest',photoFrontUrl:'http://127.0.0.1/private'}
   const response=await post(request(unsafe))
   expect(response.status).toBe(400)
   expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(/169\.254|127\.0\.0\.1/),expect.anything())
   expect(await response.text()).not.toContain('169.254')
   vi.mocked(fetch).mockImplementation(async target=>String(target).includes('api.anthropic.com')
     ? new Response('signed-url-token biometric-private',{status:500})
     : new Response(new Uint8Array([255,216,255,217]),{headers:{'content-type':'image/jpeg'}}))
   const failed=await post(request(input))
   expect(failed.status).toBe(502)
   expect(await failed.text()).not.toMatch(/signed-url-token|biometric-private/)
   expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/signed-url-token|biometric-private/)
 })
 it('rejects unauthenticated calls before reservation',async()=>{
   m.user.mockResolvedValue({data:{user:null}})
   expect((await post(request(input))).status).toBe(401)
   expect(m.reserve).not.toHaveBeenCalled()
 })
 it('refuses before provider work when no slot can be reserved',async()=>{
   m.reserve.mockResolvedValue({ok:false,response:Response.json({error:'Unavailable'},{status:503})})
   expect((await post(request(input))).status).toBe(503)
   expect(fetch).not.toHaveBeenCalled();expect(m.generate).not.toHaveBeenCalled()
 })
 it('confirms success using the session identity, not a body identity',async()=>{
   const response=await post(request({...input,userId:'untrusted-body'}))
   // Program schema is intentionally strict and rejects extraneous fields.
   if(name==='generate-custom-program') {
     expect(response.status).toBe(400);expect(m.reserve).not.toHaveBeenCalled()
     const success=await post(request(input));await success.text()
   } else await response.text()
   expect(m.reserve).toHaveBeenCalledWith('verified-user',name)
   expect(m.settle).toHaveBeenCalledWith(true)
 })
 it('releases quota after provider failure without confirming success',async()=>{
   vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Synthetic provider failure')))
   m.generate.mockRejectedValue(new Error('Synthetic provider failure'))
   const r=await post(request(input));await r.text()
   expect(m.settle).toHaveBeenCalledWith(false)
   expect(m.settle).not.toHaveBeenCalledWith(true)
 })
 it('does not report success when quota settlement fails',async()=>{
   m.settle.mockResolvedValue(false)
   const r=await post(request(input)), text=await r.text()
   if(name==='generate-custom-program') expect(text).not.toContain('"type":"done"')
   else expect(r.status).toBe(503)
 })
})
