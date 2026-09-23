import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const state=vi.hoisted(()=>({user:null as null | {id:string,email:string},rate:vi.fn(),db:vi.fn()}))
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[]})}))
vi.mock('@supabase/ssr',()=>({createServerClient:()=>({auth:{getUser:async()=>({data:{user:state.user}})}})}))
vi.mock('@supabase/supabase-js',()=>({createClient:state.db}))
vi.mock('@/lib/rate-limit',()=>({checkRateLimit:state.rate}))
import { POST } from '@/app/api/generate-exercise-instructions/route'
describe('Shared catalog instruction maintenance authorization',()=>{
 beforeEach(()=>{vi.clearAllMocks();state.user=null;vi.stubEnv('ADMIN_EMAIL','admin@example.invalid')})
 afterEach(()=>vi.unstubAllEnvs())
 const request=()=>new NextRequest('http://localhost/api/generate-exercise-instructions',{method:'POST',headers:{'x-forwarded-for':'spoofed'}})
 it('rejects anonymous requests before any privileged database access',async()=>{
   expect((await POST(request())).status).toBe(401)
   expect(state.db).not.toHaveBeenCalled()
 })
 it('rejects an ordinary authenticated user before any privileged access',async()=>{
   state.user={id:'client',email:'client@example.invalid'}
   expect((await POST(request())).status).toBe(403)
   expect(state.db).not.toHaveBeenCalled()
 })
 it('rate-limits the authenticated administrator by identity, not spoofable IP',async()=>{
   state.user={id:'admin-id',email:'admin@example.invalid'};state.rate.mockReturnValue({allowed:false})
   expect((await POST(request())).status).toBe(429)
   expect(state.rate).toHaveBeenCalledWith('exinstr:admin-id',2,60000)
   expect(state.db).not.toHaveBeenCalled()
 })
})
