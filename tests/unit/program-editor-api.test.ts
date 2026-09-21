import {beforeEach,describe,it,expect,vi} from 'vitest'
import {NextRequest} from 'next/server'
const m=vi.hoisted(()=>({user:{id:'owner'} as {id:string}|null,rate:vi.fn(),context:vi.fn(),rpc:vi.fn(),baseline:vi.fn(),eq:vi.fn()}))
vi.mock('@/lib/supabase/server',()=>({createSupabaseRouteClient:async()=>({auth:{getUser:async()=>({data:{user:m.user}})}})}))
vi.mock('@/lib/rate-limit',()=>({checkRateLimit:m.rate}))
vi.mock('@/lib/entitlements/server-context',()=>({loadEffectiveEntitlementContext:m.context}))
vi.mock('@/lib/training/followup-server',()=>({followupDatabase:()=>({rpc:m.rpc,from:(table:string)=>{const chain:any={select:()=>chain,eq:(...args:any[])=>{m.eq(table,...args);return chain},single:async()=>({data:{subscription_type:'trial'},error:null}),maybeSingle:m.baseline};return chain}})}))
import {POST} from '@/app/api/training-program/route'
const operationId='10000000-0000-4000-8000-000000000011'
const input={operationId,action:'save',programId:null,expected:null,candidate:{name:'New',days:[{exercises:[{name:'Row',sets:3,reps:'8-12',rest_seconds:90}]}]}}
const req=(data:unknown)=>new NextRequest('https://app.example/api/training-program',{method:'POST',body:JSON.stringify(data)})
beforeEach(()=>{vi.clearAllMocks();m.baseline.mockResolvedValue({data:null,error:null});m.user={id:'owner'};m.rate.mockReturnValue({allowed:true});m.context.mockResolvedValue({capabilities:{training:true,ai:false}});m.rpc.mockResolvedValue({data:{program:{id:'saved'}},error:null})})
describe('program editor HTTP boundary',()=>{
 it('uses the owner database baseline, not a forged client snapshot, for legacy warnings',async()=>{
  const days=[{exercises:[{name:'A',sets:3,reps:10,technique:'dropset',technique_details:''},{name:'B',sets:3,reps:10}]}]
  const candidate=structuredClone(days);candidate[0].exercises[1].sets=4
  const legacy={...input,programId:'10000000-0000-4000-8000-000000000022',expected:{days},candidate:{name:'Edited',days:candidate}}
  m.baseline.mockResolvedValue({data:{days},error:null})
  expect((await POST(req(legacy))).status).toBe(200)
  expect(m.eq).toHaveBeenCalledWith('custom_programs','user_id','owner')
  expect(m.eq).toHaveBeenCalledWith('custom_programs','id',legacy.programId)
  m.rpc.mockClear()
  m.baseline.mockResolvedValue({data:{days:[{exercises:[{name:'A',sets:3,reps:10},{name:'B',sets:3,reps:10}]}]},error:null})
  expect((await POST(req(legacy))).status).toBe(422)
  expect(m.rpc).not.toHaveBeenCalled()
  m.baseline.mockResolvedValue({data:null,error:null})
  expect((await POST(req(legacy))).status).toBe(404)
  m.baseline.mockResolvedValue({data:null,error:{message:'private error'}})
  const failed=await POST(req(legacy));expect(failed.status).toBe(503);expect(await failed.text()).not.toContain('private error')
 })
 it('requires authentication, rate limit and training entitlement',async()=>{
  m.user=null;expect((await POST(req(input))).status).toBe(401)
  m.user={id:'owner'};m.rate.mockReturnValue({allowed:false});expect((await POST(req(input))).status).toBe(429)
  m.rate.mockReturnValue({allowed:true});m.context.mockResolvedValue({capabilities:{training:false}});expect((await POST(req(input))).status).toBe(403)
  expect(m.rpc).not.toHaveBeenCalled()
 })
 it('rejects ownership injection, malformed JSON and invalid prescriptions',async()=>{
  expect((await POST(req({...input,user_id:'other'}))).status).toBe(400)
  expect((await POST(new NextRequest('https://app.example/api/training-program',{method:'POST',body:'{'}))).status).toBe(400)
  expect((await POST(req({...input,candidate:{name:'Bad',days:[{exercises:[]}]}}))).status).toBe(422)
  expect(m.rpc).not.toHaveBeenCalled()
 })
 it('allows manual work without AI and uses authenticated ownership',async()=>{
  expect((await POST(req(input))).status).toBe(200)
  expect(m.rpc).toHaveBeenCalledWith('edit_training_program_v1',expect.objectContaining({p_user_id:'owner',p_operation_id:operationId}))
 })
 it('maps stale-state conflicts without leaking database errors',async()=>{
  m.rpc.mockResolvedValue({error:{code:'PT409',message:'private diagnostic'}})
  const response=await POST(req(input));expect(response.status).toBe(409);expect(await response.text()).not.toContain('private diagnostic')
 })
})
