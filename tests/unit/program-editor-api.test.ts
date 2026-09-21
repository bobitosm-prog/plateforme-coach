import {beforeEach,describe,it,expect,vi} from 'vitest'
import {NextRequest} from 'next/server'
const m=vi.hoisted(()=>({user:{id:'owner'} as {id:string}|null,rate:vi.fn(),context:vi.fn(),rpc:vi.fn()}))
vi.mock('@/lib/supabase/server',()=>({createSupabaseRouteClient:async()=>({auth:{getUser:async()=>({data:{user:m.user}})}})}))
vi.mock('@/lib/rate-limit',()=>({checkRateLimit:m.rate}))
vi.mock('@/lib/entitlements/server-context',()=>({loadEffectiveEntitlementContext:m.context}))
vi.mock('@/lib/training/followup-server',()=>({followupDatabase:()=>({rpc:m.rpc,from:()=>({select:()=>({eq:()=>({single:async()=>({data:{subscription_type:'trial'},error:null})})})})})}))
import {POST} from '@/app/api/training-program/route'
const operationId='10000000-0000-4000-8000-000000000011'
const input={operationId,action:'save',programId:null,expected:null,candidate:{name:'New',days:[{exercises:[{name:'Row',sets:3,reps:'8-12',rest_seconds:90}]}]}}
const req=(data:unknown)=>new NextRequest('https://app.example/api/training-program',{method:'POST',body:JSON.stringify(data)})
beforeEach(()=>{vi.clearAllMocks();m.user={id:'owner'};m.rate.mockReturnValue({allowed:true});m.context.mockResolvedValue({capabilities:{training:true,ai:false}});m.rpc.mockResolvedValue({data:{program:{id:'saved'}},error:null})})
describe('program editor HTTP boundary',()=>{
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
