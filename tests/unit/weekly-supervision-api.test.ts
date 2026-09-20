import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks=vi.hoisted(()=>({worker:vi.fn(),verify:vi.fn(),from:vi.fn(),rate:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({})}))
vi.mock('@/lib/weekly-diagnostic/worker',()=>({runWeeklyGeneration:mocks.worker}))
vi.mock('@/lib/rate-limit',()=>({checkRateLimit:mocks.rate}))
vi.mock('@/lib/admin/auth',()=>({verifyAdmin:mocks.verify,handleAdminAuthError:()=>new Response(null,{status:401})}))
vi.mock('@/lib/supabase/admin',()=>({supabaseAdmin:{from:mocks.from}}))
import { POST } from '@/app/api/weekly-diagnostic/cron/route'
import { GET } from '@/app/api/admin/weekly-generations/route'
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('CRON_SECRET','synthetic-test');mocks.rate.mockReturnValue({allowed:true});mocks.worker.mockResolvedValue({errors:0})})
afterEach(()=>vi.unstubAllEnvs())
const request=(token='synthetic-test')=>new NextRequest('https://example.test/cron',{method:'POST',headers:{authorization:`Bearer ${token}`}})
describe('supervised generation HTTP boundaries',()=>{
 it('requires the scheduler secret and never starts a worker anonymously',async()=>{
   expect((await POST(request('wrong'))).status).toBe(401);expect(mocks.worker).not.toHaveBeenCalled()
 })
 it('reports partial failures as HTTP failure, not a global success',async()=>{
   mocks.worker.mockResolvedValue({errors:1,status:'partial'})
   expect((await POST(request())).status).toBe(503)
   mocks.worker.mockResolvedValue({errors:0,status:'succeeded'})
   expect((await POST(request())).status).toBe(200)
 })
 it('bounds requests and hides unexpected failures',async()=>{
   mocks.rate.mockReturnValue({allowed:false});expect((await POST(request())).status).toBe(429)
   mocks.rate.mockReturnValue({allowed:true});mocks.worker.mockRejectedValue(new Error('private internal value'))
   const response=await POST(request());expect(response.status).toBe(503);expect(await response.text()).not.toContain('private')
 })
 it('requires admin authorization before reading monitoring data',async()=>{
   mocks.verify.mockRejectedValue(new Error('unauthorized'))
   expect((await GET(new Request('https://example.test/admin/weekly-generations'))).status).toBe(401)
   expect(mocks.from).not.toHaveBeenCalled()
 })
 it('marks a missing heartbeat as stale and does not report zero on read errors',async()=>{
   mocks.verify.mockResolvedValue({userId:'admin'})
   const query={select:vi.fn(),order:vi.fn(),limit:vi.fn(),eq:vi.fn(),in:vi.fn(),gt:vi.fn(),then:vi.fn()}
   for(const method of ['select','order','limit','eq','in','gt'] as const) query[method].mockReturnValue(query)
   query.then.mockImplementation((resolve)=>(Promise.resolve({data:[],count:0,error:null}).then(resolve)))
   mocks.from.mockReturnValue(query)
   const response=await GET(new Request('https://example.test/admin/weekly-generations'))
   expect(await response.json()).toMatchObject({stale:true,counts:{failed:0}})
   query.then.mockImplementation((resolve)=>(Promise.resolve({data:null,error:{code:'failed'}}).then(resolve)))
   expect((await GET(new Request('https://example.test/admin/weekly-generations'))).status).toBe(503)
 })
})
