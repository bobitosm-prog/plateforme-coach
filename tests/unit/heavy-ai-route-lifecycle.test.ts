import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import type { NextRequest } from 'next/server'
const m=vi.hoisted(()=>({ user:vi.fn(),reserve:vi.fn(),settle:vi.fn(),generate:vi.fn() }))
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[]})}))
vi.mock('@supabase/ssr',()=>({createServerClient:()=>({auth:{getUser:m.user}})}))
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
 {name:'analyze-body',post:body,input:{photoFrontUrl:'https://synthetic.invalid/front',photoBackUrl:'https://synthetic.invalid/back',photoSideUrl:'https://synthetic.invalid/side'}},
 {name:'analyze-progress-photo',post:photo,input:{photoUrl:'https://synthetic.invalid/photo'}},
 {name:'generate-custom-program',post:program,input:{objective:'fitness',level:'beginner',daysPerWeek:3,duration:45,equipment:'bodyweight'}},
]
function request(input:unknown){return new Request('http://localhost/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}) as NextRequest}
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('ANTHROPIC_API_KEY','synthetic-key')
 m.user.mockResolvedValue({data:{user:{id:'verified-user'}}})
 m.settle.mockResolvedValue(true);m.reserve.mockResolvedValue({ok:true,settle:m.settle})
 m.generate.mockResolvedValue({weeks:[]})
 vi.stubGlobal('fetch',vi.fn(async input=>String(input).includes('api.anthropic.com')
   ? Response.json({content:[{type:'text',text:'Synthetic analysis'},{type:'tool_use',input:{summary:'Synthetic'}}]})
   : new Response('synthetic-image',{headers:{'Content-Type':'image/jpeg'}})))
 vi.spyOn(console,'error').mockImplementation(()=>{})
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals()})
describe.each(routes)('$name quota lifecycle',({name,post,input})=>{
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
