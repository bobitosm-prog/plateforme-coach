import { createHmac, randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { diagnosticWeek } from '@/lib/weekly-diagnostic/week'
import { adjustTrainingSets, prepareWeeklyAdjustment } from '@/lib/weekly-diagnostic/adjustments'
import { weeklyFixture } from '../fixtures/weekly-adjustment'
import { resolveProgramDays } from '@/lib/training/resolve-program'
import { buildHomeWeeklyProgress } from '@/lib/home/home-weekly-progress'

const secret = process.env.NUTRITION_TEST_JWT_SECRET
if (!secret) throw new Error('Disposable integration fixture required')
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 600 })}`
const token = `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
const db = createClient('http://127.0.0.1:56431', 'synthetic-local-key', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => {
    const target = new URL(String(input))
    if (target.origin !== 'http://127.0.0.1:56431') throw new Error('External network forbidden')
    target.pathname = target.pathname.replace(/^\/rest\/v1/, '')
    return fetch(target, init)
  } },
})
describe('real weekly adjustment concurrency', () => {
  it('persists one repaired day through the actual API while retaining another legacy warning',async()=>{
    const user=randomUUID();expect((await db.from('profiles').insert({id:user})).error).toBeNull()
    const days=[{name:'Pull',exercises:[{name:'Face Pulls',sets:3,reps:15,technique:'dropset',technique_details:''}]},{name:'Upper',exercises:[{name:'Raise',sets:3,reps:12,technique:'superset',technique_details:'Absent'}]}]
    const original=await db.from('custom_programs').insert({user_id:user,name:'Synthetic legacy',days,is_active:false}).select('*').single()
    expect(original.error).toBeNull()
    vi.doMock('@/lib/supabase/server',()=>({createSupabaseRouteClient:async()=>({auth:{getUser:async()=>({data:{user:{id:user}}})}})}))
    vi.doMock('@/lib/training/followup-server',()=>({followupDatabase:()=>db}))
    vi.doMock('@/lib/rate-limit',()=>({checkRateLimit:()=>({allowed:true})}))
    vi.doMock('@/lib/entitlements/server-context',()=>({loadEffectiveEntitlementContext:async()=>({capabilities:{training:true}})}))
    try {
      const {POST}=await import('@/app/api/training-program/route')
      const {NextRequest}=await import('next/server')
      const candidate=structuredClone(days);candidate[0].exercises[0].technique_details='2'
      const body={operationId:randomUUID(),action:'save',programId:original.data.id,expected:original.data,candidate:{name:'Repaired Pull',days:candidate}}
      const call=()=>POST(new NextRequest('https://synthetic.invalid/api/training-program',{method:'POST',body:JSON.stringify(body)}))
      expect((await call()).status).toBe(200)
      expect((await call()).status).toBe(200)
      const saved=await db.from('custom_programs').select('days').eq('id',original.data.id).eq('user_id',user).single()
      expect(saved.error).toBeNull();expect(saved.data!.days[0].exercises[0].technique_details).toBe('2');expect(saved.data!.days[1]).toEqual(days[1])
      expect((await db.from('training_program_changes').select('id').eq('user_id',user)).data).toHaveLength(1)
    } finally {
      for(const module of ['@/lib/supabase/server','@/lib/training/followup-server','@/lib/rate-limit','@/lib/entitlements/server-context'])vi.doUnmock(module)
    }
  })
  it('archives reversibly and protects coached programs without blocking an unassigned client',async()=>{
    const user=randomUUID(),coach=randomUUID();expect((await db.from('profiles').insert([{id:user},{id:coach}])).error).toBeNull()
    expect((await db.from('coach_clients').insert({client_id:user,coach_id:coach,status:'active',source:'invitation'})).error).toBeNull()
    const call=(request:any)=>db.rpc('edit_training_program_v1',{p_user_id:user,p_operation_id:randomUUID(),p_request:request})
    const created=await call({action:'save',programId:null,expected:null,candidate:{name:'Personal draft',days:[{name:'A',exercises:[{name:'Row',sets:3,reps:10}]}]}})
    expect(created.error).toBeNull()
    const p=created.data.program
    const archived=await call({action:'archive',programId:p.id,expected:p});expect(archived.error).toBeNull();expect(archived.data.program.archived_at).toBeTruthy()
    expect((await call({action:'activate',programId:p.id,expected:archived.data.program,activeProgramId:null})).error?.code).toBe('PT409')
    const restored=await call({action:'restore',programId:p.id,expected:archived.data.program});expect(restored.error).toBeNull();expect(restored.data.program.archived_at).toBeNull()
    expect((await db.from('client_programs').insert({client_id:user,coach_id:coach,program:{lundi:{exercises:[]}}})).error).toBeNull()
    expect((await call({action:'activate',programId:p.id,expected:restored.data.program,activeProgramId:null})).error?.code).toBe('42501')
  })
  it('edits programs atomically with idempotency, revisions, versions and protected history',async()=>{
    const owner=randomUUID(),other=randomUUID()
    expect((await db.from('profiles').insert([{id:owner,preferred_training_time:'18:30',reminder_enabled:false},{id:other}])).error).toBeNull()
    const days=Array.from({length:7},(_,i)=>({name:'Day '+i,exercises:[{name:'Row',sets:3,reps:'8-12',rest_seconds:90}]}))
    const call=(request:any,id=randomUUID(),user=owner)=>db.rpc('edit_training_program_v1',{p_user_id:user,p_operation_id:id,p_request:request})
    const createId=randomUUID(),create={action:'save',programId:null,expected:null,candidate:{name:'Draft',days,source:'import',total_weeks:8,phases:[{weeks:[1,4]},{weeks:[5,8]}]}}
    const created=await Promise.all([call(create,createId),call(create,createId)])
    expect(created[0].error).toBeNull();expect(created[1].data).toEqual(created[0].data)
    let program=created[0].data.program
    expect(program.is_active).toBe(false);expect(program.total_weeks).toBe(8);expect(program.phases).toHaveLength(2)
    expect((await db.from('custom_programs').select('id').eq('user_id',owner)).data).toHaveLength(1)
    expect((await call({...create,candidate:{...create.candidate,name:'Changed'}},createId)).error?.code).toBe('PT409')
    expect((await call({action:'activate',programId:program.id,expected:program,activeProgramId:null},randomUUID(),other)).error?.code).toBe('PT404')
    const activated=await call({action:'activate',programId:program.id,expected:program,activeProgramId:null})
    expect(activated.error).toBeNull();program=activated.data.program
    const today=diagnosticWeek().today
    const scheduled=await db.from('scheduled_sessions').select('*').eq('user_id',owner)
    expect(scheduled.error).toBeNull();expect(scheduled.data!.length).toBeGreaterThan(0)
    expect(scheduled.data!.every(s=>s.scheduled_time==='18:30:00'&&s.reminder_enabled===false)).toBe(true)
    const current=scheduled.data!.find(s=>s.scheduled_date===today)!
    expect((await db.from('scheduled_sessions').update({completed:true}).eq('id',current.id)).error).toBeNull()
    const cardio=randomUUID(),past=randomUUID()
    expect((await db.from('scheduled_sessions').insert([{id:cardio,user_id:owner,title:'Cardio',session_type:'cardio',scheduled_date:today},{id:past,user_id:owner,title:'Past',session_type:'custom',scheduled_date:'2020-01-01'}])).error).toBeNull()
    const operation=randomUUID(),save={action:'save',programId:program.id,expected:program,candidate:{name:'Edited',days}}
    const edited=await call(save,operation);expect(edited.error).toBeNull()
    expect(edited.data.program.source).toBe('import');expect(edited.data.program.phases).toEqual(program.phases)
    expect((await call(save,operation)).data).toEqual(edited.data)
    expect((await call(save)).error?.code).toBe('PT409')
    const remaining=await db.from('scheduled_sessions').select('*').in('id',[cardio,past,current.id])
    expect(remaining.data).toHaveLength(3);expect(remaining.data!.find(s=>s.id===current.id)?.completed).toBe(true)
    const restored=await call({action:'restore',programId:program.id,expected:edited.data.program,versionId:operation})
    expect(restored.error).toBeNull();expect(restored.data.program.name).toBe('Draft')
    expect((await call({action:'archive',programId:program.id,expected:restored.data.program})).error?.code).toBe('PT409')
    const ownerPayload=`${encode({alg:'HS256',typ:'JWT'})}.${encode({role:'authenticated',sub:other,exp:Math.floor(Date.now()/1000)+600})}`
    const ownerToken=`${ownerPayload}.${createHmac('sha256',secret!).update(ownerPayload).digest('base64url')}`
    const headers={Authorization:`Bearer ${ownerToken}`,'Content-Type':'application/json'}
    expect(await (await fetch('http://127.0.0.1:56431/training_program_changes',{headers})).json()).toEqual([])
    expect((await fetch('http://127.0.0.1:56431/rpc/edit_training_program_v1',{method:'POST',headers,body:JSON.stringify({p_user_id:owner,p_operation_id:randomUUID(),p_request:save})})).status).toBe(403)
  })
  it('rolls back active program, history and calendar together after a schedule failure',async()=>{
    const user=randomUUID();expect((await db.from('profiles').insert({id:user})).error).toBeNull()
    const days=Array.from({length:7},()=>({name:'Good',exercises:[{name:'Row',sets:3,reps:10}]}))
    const first=await db.from('custom_programs').insert({user_id:user,name:'Previous',days,is_active:true}).select('*').single()
    const next=await db.from('custom_programs').insert({user_id:user,name:'Next',days:days.map(d=>({...d,name:'SYNTHETIC_CALENDAR_FAILURE'})),is_active:false}).select('*').single()
    expect(first.error).toBeNull();expect(next.error).toBeNull()
    const slot=randomUUID();expect((await db.from('scheduled_sessions').insert({id:slot,user_id:user,title:'Existing',session_type:'custom',scheduled_date:diagnosticWeek().today,completed:false})).error).toBeNull()
    const result=await db.rpc('edit_training_program_v1',{p_user_id:user,p_operation_id:randomUUID(),p_request:{action:'activate',programId:next.data!.id,expected:next.data,activeProgramId:first.data!.id}})
    expect(result.error).not.toBeNull()
    expect((await db.from('custom_programs').select('id').eq('user_id',user).eq('is_active',true)).data).toEqual([{id:first.data!.id}])
    expect((await db.from('scheduled_sessions').select('id').eq('id',slot)).data).toHaveLength(1)
    expect((await db.from('training_program_changes').select('id').eq('user_id',user)).data).toEqual([])
  })
  it('keeps follow-up preferences/proposals owner-readable and service-writable only',async()=>{
    const userId=randomUUID();const otherId=randomUUID();const programId=randomUUID()
    expect((await db.from('profiles').insert([{id:userId},{id:otherId}])).error).toBeNull()
    expect((await db.from('custom_programs').insert({id:programId,user_id:userId,name:'Synthetic',days:[]})).error).toBeNull()
    expect((await db.from('training_followup_preferences').insert([{user_id:userId},{user_id:otherId}])).error).toBeNull()
    expect((await db.from('training_followup_proposals').insert({user_id:userId,program_id:programId,kind:'monthly',baseline_context:{},candidate:{days:[]},explanation:'Synthetic'})).error).toBeNull()
    const payload=`${encode({alg:'HS256',typ:'JWT'})}.${encode({role:'authenticated',sub:userId,exp:Math.floor(Date.now()/1000)+600})}`
    const ownerToken=`${payload}.${createHmac('sha256',secret!).update(payload).digest('base64url')}`
    const request=(path:string,method='GET',body?:unknown)=>fetch(`http://127.0.0.1:56431/${path}`,{method,headers:{Authorization:`Bearer ${ownerToken}`,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)})
    const prefs=await request('training_followup_preferences');expect(prefs.status).toBe(200)
    expect((await prefs.json()).map((row:{user_id:string})=>row.user_id)).toEqual([userId])
    const proposals=await request('training_followup_proposals');expect(proposals.status).toBe(200)
    const rows=await proposals.json();expect(rows).toHaveLength(1);expect(rows[0].user_id).toBe(userId)
    expect((await request('training_followup_preferences','POST',{user_id:userId,enabled:true})).status).toBe(403)
    expect((await request(`training_followup_preferences?user_id=eq.${userId}`,'PATCH',{enabled:true})).status).toBe(403)
    expect((await request(`training_followup_proposals?id=eq.${rows[0].id}`,'PATCH',{status:'applied'})).status).toBe(403)
    expect((await request('rpc/apply_training_followup_v1','POST',{p_user_id:userId,p_proposal_id:rows[0].id})).status).toBe(403)
  })
  it('applies a monthly proposal exactly once, preserves past workouts and fails closed when disabled or stale',async()=>{
    const userId=randomUUID();const oldId=randomUUID();const proposalId=randomUUID()
    expect((await db.from('profiles').insert({id:userId})).error).toBeNull()
    expect((await db.from('custom_programs').insert({id:oldId,user_id:userId,name:'Old',days:[{exercises:[{name:'Row',sets:3,reps:'8-12'}]}],is_active:true})).error).toBeNull()
    const context=await db.rpc('weekly_adjustment_context_v1',{p_user_id:userId})
    expect((await db.from('training_followup_proposals').insert({id:proposalId,user_id:userId,program_id:oldId,kind:'monthly',baseline_context:context.data,candidate:{name:'Next',description:'Reviewed',days:[{exercises:[{name:'Row',sets:3,reps:'8-12'}]}]},explanation:'Synthetic'})).error).toBeNull()
    const apply=()=>db.rpc('apply_training_followup_v1',{p_user_id:userId,p_proposal_id:proposalId})
    expect((await apply()).error?.code).toBe('PT409')
    expect((await db.from('training_followup_preferences').insert({user_id:userId,enabled:true,monthly_review:true})).error).toBeNull()
    const savedWorkout=randomUUID()
    expect((await db.from('workout_sessions').insert({id:savedWorkout,user_id:userId,completed:true})).error).toBeNull()
    const applied=await Promise.all([apply(),apply()])
    expect(applied.every(row=>!row.error)).toBe(true)
    expect(applied.map(row=>row.data.already_applied).sort()).toEqual([false,true])
    expect((await db.from('custom_programs').select('id').eq('user_id',userId).eq('is_active',true)).data).toHaveLength(1)
    expect((await db.from('workout_sessions').select('id').eq('id',savedWorkout)).data).toHaveLength(1)
    const wrongOwner=await db.rpc('apply_training_followup_v1',{p_user_id:randomUUID(),p_proposal_id:proposalId})
    expect(wrongOwner.error).not.toBeNull()
    const stale=randomUUID()
    expect((await db.from('training_followup_proposals').insert({id:stale,user_id:userId,program_id:oldId,kind:'alternative',baseline_context:context.data,candidate:{days:[]},explanation:'Stale'})).error).toBeNull()
    expect((await db.rpc('apply_training_followup_v1',{p_user_id:userId,p_proposal_id:stale})).error?.code).toBe('PT409')
  })
  it('repairs 63% to 100% and concurrent calendar retries never erase completions', async () => {
    const userId = '10000000-0000-4000-8000-000000000099'
    const ownerPayload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: 'authenticated', sub: userId, exp: Math.floor(Date.now() / 1000) + 600 })}`
    const ownerToken = `${ownerPayload}.${createHmac('sha256', secret!).update(ownerPayload).digest('base64url')}`
    const owner = createClient('http://127.0.0.1:56431', 'synthetic-local-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${ownerToken}` }, fetch: (input, init) => {
        const target = new URL(String(input))
        if (target.origin !== 'http://127.0.0.1:56431') throw new Error('External network forbidden')
        target.pathname = target.pathname.replace(/^\/rest\/v1/, '')
        return fetch(target, init)
      } },
    })
    const original = await db.from('scheduled_sessions').select('*').eq('user_id', userId)
    expect(original.error).toBeNull()
    expect(buildHomeWeeklyProgress({ now: new Date('2026-09-20T12:00:00Z'),
      workoutSessions: [], scheduledSessions: original.data! }).adherence).toBe(1)
    const rows = original.data!.map(({ user_id, scheduled_date, session_type, title }) =>
      ({ user_id, scheduled_date, session_type, title, completed: false }))
    const results = await Promise.all(Array.from({ length: 8 }, () => owner.from('scheduled_sessions').upsert(rows, {
      onConflict: 'user_id,scheduled_date,session_type,title', ignoreDuplicates: true,
    })))
    expect(results.every(result => result.error === null)).toBe(true)
    const after = await db.from('scheduled_sessions').select('*').eq('user_id', userId)
    expect(after.data).toHaveLength(5)
    expect(after.data!.every(row => row.completed)).toBe(true)
    const newRow = { ...rows[0], scheduled_date: '2026-09-21' }
    const inserted = await Promise.all(Array.from({ length: 8 }, () => owner.from('scheduled_sessions').upsert(newRow, {
      onConflict: 'user_id,scheduled_date,session_type,title', ignoreDuplicates: true,
    })))
    expect(inserted.every(result => result.error === null)).toBe(true)
    expect((await db.from('scheduled_sessions').select('id').eq('user_id',userId).eq('scheduled_date','2026-09-21')).data).toHaveLength(1)
    // Different titles may represent real activity: do not merge them blindly.
    expect((await db.from('scheduled_sessions').insert({ ...newRow, title: 'Distinct session' })).error).toBeNull()
    expect((await owner.from('scheduled_session_duplicate_archive').select('*')).error).not.toBeNull()
    expect((await owner.from('scheduled_sessions').insert({ ...newRow, user_id: randomUUID() })).error).not.toBeNull()
  })
  it('persists a date-scoped phase adjustment without changing any phase prescription', async () => {
    const week=diagnosticWeek(); const userId=randomUUID(); const id=randomUUID(); const diag=randomUUID()
    const start=new Date(`${week.endExclusive}T12:00:00Z`); start.setUTCDate(start.getUTCDate()-28)
    const phases=[{weeks:[1,4]},{weeks:[5,8]},{weeks:[9,12]}]
    const days=Array.from({length:3},()=>({exercises:[{name:'Band row',sets:2,reps:12,phases:{p1:{sets:2},p2:{sets:4},p3:{sets:3}}}]}))
    const program={id,days,phases,start_date:start.toISOString().slice(0,10),total_weeks:12}
    expect((await db.from('profiles').insert({id:userId,calorie_goal:2200})).error).toBeNull()
    expect((await db.from('custom_programs').insert({...program,user_id:userId})).error).toBeNull()
    const context=await db.rpc('weekly_adjustment_context_v1',{p_user_id:userId})
    expect((await db.from('weekly_diagnostics').insert({id:diag,user_id:userId,week_start:week.weekStart,policy_version:2,application_context:context.data,ajustements:{training_volume_delta_pct:10}})).error).toBeNull()
    const candidate=prepareWeeklyAdjustment(weeklyFixture().profile,program,null,{training_volume_delta_pct:10},week.endExclusive)
    expect((await db.rpc('apply_weekly_adjustment_v1',{p_user_id:userId,p_diagnostic_id:diag,p_candidate:candidate})).error?.code).toBe('PT409')
    expect((await db.from('training_followup_preferences').insert({user_id:userId,enabled:true})).error).toBeNull()
    expect((await db.rpc('apply_weekly_adjustment_v1',{p_user_id:userId,p_diagnostic_id:diag,p_candidate:candidate})).error).toBeNull()
    const saved=(await db.from('custom_programs').select('*').eq('id',id).single()).data
    expect(saved.phases).toEqual(phases)
    expect(saved.days[0].exercises[0].phases).toEqual(days[0].exercises[0].phases)
    const adapted=resolveProgramDays(saved,new Date(`${week.endExclusive}T12:00:00Z`))
    expect((adapted[0].exercises as {sets:number}[])[0].sets).toBe(5)
    const next=new Date(`${week.endExclusive}T12:00:00Z`); next.setUTCDate(next.getUTCDate()+7)
    expect((resolveProgramDays(saved,next)[0].exercises as {sets:number}[])[0].sets).toBe(4)
  })
  it.each([3,4,7])('serializes two simultaneous applies on a %s-day program and changes sets exactly once', async length => {
    const userId = randomUUID(); const programId = randomUUID(); const diagnosticId = randomUUID()
    const days = Array.from({ length }, (_, i) => ({ name: `Day ${i}`, is_rest: i > 2,
      exercises: i > 2 ? [] : [{ name: 'Band row', sets: 3, reps: 12 }, { name: 'Planche', sets: 2, duration_seconds: 35 }] }))
    expect((await db.from('profiles').insert({ id: userId, calorie_goal: 2200 })).error).toBeNull()
    expect((await db.from('custom_programs').insert({ id: programId, user_id: userId, days })).error).toBeNull()
    const context = await db.rpc('weekly_adjustment_context_v1', { p_user_id: userId })
    expect(context.error).toBeNull()
    expect((await db.from('weekly_diagnostics').insert({ id: diagnosticId, user_id: userId,
      week_start: diagnosticWeek().weekStart, policy_version: 2, application_context: context.data,
      ajustements: { training_volume_delta_pct: 10 } })).error).toBeNull()
    const adjusted = adjustTrainingSets(days, 10)
    expect((await db.from('training_followup_preferences').insert({user_id:userId,enabled:true})).error).toBeNull()
    const args = { p_user_id: userId, p_diagnostic_id: diagnosticId,
      p_candidate: { domain: 'training', days: adjusted.days, changes: { setsBefore: adjusted.before, setsAfter: adjusted.after } } }
    const results = await Promise.all([db.rpc('apply_weekly_adjustment_v1', args), db.rpc('apply_weekly_adjustment_v1', args)])
    expect(results.map(result => result.error)).toEqual([null, null])
    expect(results.map(result => result.data.already_applied).sort()).toEqual([false, true])
    expect(results[0].data.applied_at).toBe(results[1].data.applied_at)
    const saved = await db.from('custom_programs').select('days').eq('id', programId).single()
    expect(saved.data?.days).toEqual(adjusted.days)
    const diagnostic = await db.from('weekly_diagnostics').select('applied_changes').eq('id', diagnosticId).single()
    expect(diagnostic.data?.applied_changes.previous_days).toEqual(days)
  })
})

describe('real durable weekly generation queue', () => {
  it('claims disjoint batches, enforces retries, confirmation and lease ownership', async () => {
    const week=diagnosticWeek(); const users=Array.from({length:7},()=>randomUUID())
    expect((await db.from('profiles').insert(users.map(id=>({id,role:'client',onboarding_completed:true})))).error).toBeNull()
    // The seventh user did not confirm Sunday and must never be queued.
    expect((await db.from('weekly_day_completions').insert(users.slice(0,6).map(user_id=>({user_id,sunday:week.sunday,meals_confirmed:true})))).error).toBeNull()
    let run1=randomUUID(); let run2=randomUUID()
    const claims=await Promise.all([db.rpc('claim_weekly_generation_v1',{p_run_id:run1}),db.rpc('claim_weekly_generation_v1',{p_run_id:run2})])
    expect(claims.map(r=>r.error)).toEqual([null,null])
    // SKIP LOCKED may return an empty batch while the other enqueuer holds
    // rows. The next pass must pick them up; neither duplication nor loss is allowed.
    for (const [index,run] of [run1,run2].entries()) {
      expect(claims[index].data.length).toBeLessThanOrEqual(3)
      expect((await db.from('weekly_generation_runs').select('claimed').eq('id',run).single()).data?.claimed).toBe(claims[index].data.length)
    }
    if (claims.flatMap(r=>r.data).length<6) claims.push(await db.rpc('claim_weekly_generation_v1',{p_run_id:randomUUID()}))
    expect(claims.every(r=>!r.error)).toBe(true)
    const jobs=claims.flatMap(r=>r.data)
    expect(jobs).toHaveLength(6); expect(new Set(jobs.map(j=>j.user_id)).size).toBe(6)
    expect(jobs.some(j=>j.user_id===users[6])).toBe(false)
    const job=jobs[0]; run1=job.lease_id; run2=jobs[3].lease_id
    const args={p_run_id:run1,p_user_id:job.user_id,p_week_start:week.weekStart,p_outcome:'failed'}
    expect((await db.rpc('settle_weekly_generation_v1',{...args,p_run_id:run2})).data).toBe(false)
    expect((await db.rpc('settle_weekly_generation_v1',{...args,p_outcome:'succeeded',p_diagnostic_id:randomUUID()})).error).not.toBeNull()
    expect((await db.rpc('settle_weekly_generation_v1',args)).data).toBe(true)
    let row=(await db.from('weekly_generation_jobs').select('*').eq('user_id',job.user_id).single()).data
    expect(row).toMatchObject({status:'pending',failures:1,error_code:'generation_failed'})
    expect(Date.parse(row.available_at)).toBeGreaterThan(Date.now())
    for(let failure=2;failure<=3;failure++) {
      expect((await db.from('weekly_generation_jobs').update({available_at:'2020-01-01'}).eq('user_id',job.user_id)).error).toBeNull()
      const run=randomUUID(); const claim=await db.rpc('claim_weekly_generation_v1',{p_run_id:run})
      expect(claim.error).toBeNull(); expect(claim.data.some((j:{user_id:string})=>j.user_id===job.user_id)).toBe(true)
      expect((await db.rpc('settle_weekly_generation_v1',{...args,p_run_id:run})).data).toBe(true)
    }
    row=(await db.from('weekly_generation_jobs').select('*').eq('user_id',job.user_id).single()).data
    expect(row).toMatchObject({status:'failed',failures:3})
    const blocked=jobs[3]
    expect((await db.rpc('settle_weekly_generation_v1',{p_run_id:run2,p_user_id:blocked.user_id,p_week_start:week.weekStart,p_outcome:'blocked'})).data).toBe(true)
    expect((await db.from('weekly_generation_jobs').select('failures').eq('user_id',blocked.user_id).single()).data?.failures).toBe(0)
    expect((await db.rpc('claim_weekly_generation_v1',{p_run_id:randomUUID()})).data).toHaveLength(0)
    expect((await db.from('weekly_day_completions').update({confirmed_at:new Date().toISOString()}).eq('user_id',blocked.user_id)).error).toBeNull()
    const resumed=await db.rpc('claim_weekly_generation_v1',{p_run_id:randomUUID()})
    expect(resumed.error).toBeNull(); expect(resumed.data.map((j:{user_id:string})=>j.user_id)).toEqual([blocked.user_id])
    const timedOut=jobs[1]
    await db.from('weekly_generation_jobs').update({lease_until:'2020-01-01'}).eq('user_id',timedOut.user_id)
    await db.rpc('claim_weekly_generation_v1',{p_run_id:randomUUID()})
    expect((await db.from('weekly_generation_jobs').select('status,error_code,failures').eq('user_id',timedOut.user_id).single()).data).toMatchObject({status:'pending',failures:1,error_code:'lease_expired'})
  })
})
