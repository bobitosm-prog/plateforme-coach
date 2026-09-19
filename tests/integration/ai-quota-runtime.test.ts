import { createHmac, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

// Real disposable PostgREST only. No provider, credentials or production data.
const secret = process.env.NUTRITION_TEST_JWT_SECRET
if (!secret) throw new Error('Disposable fixture required')
function client(role: string, sub = randomUUID()) {
  const encode = (x: unknown) => Buffer.from(JSON.stringify(x)).toString('base64url')
  const payload = `${encode({alg:'HS256',typ:'JWT'})}.${encode({role,sub,exp:Math.floor(Date.now()/1000)+600})}`
  const token = `${payload}.${createHmac('sha256', secret!).update(payload).digest('base64url')}`
  return createClient('http://127.0.0.1:56431','synthetic-local-key', {
    global:{headers:{Authorization:`Bearer ${token}`},fetch: (input,init) => {
      const url = String(input).replace('/rest/v1/','/')
      if (!url.startsWith('http://127.0.0.1:56431/')) throw new Error('External network forbidden')
      return fetch(url,init)
    }},auth:{persistSession:false,autoRefreshToken:false},
  })
}
const server = client('service_role')
async function seed(successes = 0) {
  const id = randomUUID()
  expect((await server.from('profiles').insert({id})).error).toBeNull()
  if (successes) expect((await server.from('ai_usage_logs').insert(Array.from({length:successes},()=>({
    user_id:id,endpoint:'generate-meal-plan',success:true,created_at:new Date(Date.now()-7200000).toISOString(),
  })))).error).toBeNull()
  return id
}
async function reserve(user: string, endpoint = 'generate-meal-plan', id = randomUUID()) {
  const r = await server.rpc('reserve_heavy_ai_v1',{p_user_id:user,p_endpoint:endpoint,p_operation_id:id})
  expect(r.error).toBeNull()
  return { id, ...r.data }
}
async function settle(user: string, id: string, success: boolean) {
  const r=await server.rpc('settle_heavy_ai_v1',{p_user_id:user,p_operation_id:id,p_success:success})
  expect(r.error).toBeNull()
  return r.data
}
describe('atomic shared heavy AI quota',()=>{
  it('admits only one of four simultaneous endpoints for the last monthly slot',async()=>{
    const user=await seed(5)
    const results=await Promise.all(['generate-meal-plan','generate-custom-program','analyze-progress-photo','analyze-body'].map(e=>reserve(user,e)))
    expect(results.filter(x=>x.allowed)).toHaveLength(1)
    expect(results.filter(x=>!x.allowed).every(x=>x.reason==='busy')).toBe(true)
    const accepted=results.find(x=>x.allowed)!
    expect(await settle(user,accepted.id,true)).toBe(true)
    expect(await settle(user,accepted.id,true)).toBe(true)
    const logs=await server.from('ai_usage_logs').select('id').eq('user_id',user)
    expect(logs.data).toHaveLength(6)
    expect((await reserve(user)).allowed).toBe(false)
  })
  it('releases failed work without creating successful usage and rejects late success',async()=>{
    const user=await seed(5), first=await reserve(user)
    expect(await settle(user,first.id,false)).toBe(true)
    expect(await settle(user,first.id,false)).toBe(true)
    expect(await settle(user,first.id,true)).toBe(false)
    expect((await reserve(user)).allowed).toBe(true)
    expect((await server.from('ai_usage_logs').select('id').eq('user_id',user)).data).toHaveLength(5)
  })
  it('counts failed attempts hourly even though monthly slots are released',async()=>{
    const user=await seed()
    for(let n=0;n<5;n++) { const r=await reserve(user,'analyze-body'); expect(r.allowed).toBe(true); await settle(user,r.id,false) }
    expect(await reserve(user,'analyze-body')).toMatchObject({allowed:false,reason:'hourly',limit:5})
    expect((await reserve(user,'generate-meal-plan')).allowed).toBe(true)
  })
  it('does not double count successful reservations in hourly limits',async()=>{
    const user=await seed()
    for(let n=0;n<5;n++) { const r=await reserve(user,'analyze-body'); expect(r.allowed).toBe(true); await settle(user,r.id,true) }
    expect(await reserve(user,'analyze-body')).toMatchObject({allowed:false,reason:'hourly'})
  })
  it('isolates users and makes admission retries idempotent',async()=>{
    const user=await seed(5), other=await seed(), op=randomUUID()
    const results=await Promise.all([reserve(user,'generate-meal-plan',op),reserve(user,'generate-meal-plan',op)])
    expect(results.every(x=>x.allowed)).toBe(true)
    expect((await reserve(user)).allowed).toBe(false)
    expect((await reserve(other)).allowed).toBe(true)
    expect(await settle(other,op,true)).toBe(false)
  })
  it.each(['anon','authenticated'])('denies %s admission, settlement and private table access',async role=>{
    const user=await seed(), db=client(role,user)
    expect((await db.rpc('reserve_heavy_ai_v1',{p_user_id:user,p_endpoint:'generate-meal-plan',p_operation_id:randomUUID()})).error).not.toBeNull()
    expect((await db.rpc('settle_heavy_ai_v1',{p_user_id:user,p_operation_id:randomUUID(),p_success:true})).error).not.toBeNull()
    expect((await db.schema('ai_quota_private').from('reservations').select('*')).error).not.toBeNull()
  })
  it('rejects unsupported endpoints instead of admitting unmetered work',async()=>{
    const user=await seed()
    expect((await server.rpc('reserve_heavy_ai_v1',{p_user_id:user,p_endpoint:'unknown',p_operation_id:randomUUID()})).error?.code).toBe('22023')
  })
})
