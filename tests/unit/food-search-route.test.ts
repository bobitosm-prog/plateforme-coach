import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const state=vi.hoisted(()=>({user:true,allowed:true,tables:[] as string[],columns:[] as string[]}))
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[]})}))
vi.mock('@supabase/ssr',()=>({createServerClient:()=>({auth:{getUser:async()=>({data:{user:state.user?{id:'test'}:null}})}})}))
vi.mock('@/lib/rate-limit',()=>({checkRateLimit:()=>({allowed:state.allowed})}))
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({from:(table:string)=>{
 state.tables.push(table)
 const chain:any={select:(c:string)=>{state.columns.push(c);return chain},or:()=>chain,order:()=>chain,ilike:()=>chain,limit:async()=>({data:table==='community_foods'?[]:[{id:1,name:'Reference',source:'ANSES',source_version:'2025',source_license:'Etalab-2.0',energy_kcal:100,proteins:3,carbohydrates:4,fat:5}],error:null})}
 return chain
}})}))
import { GET } from '@/app/api/food-search/route'
beforeEach(()=>{state.user=true;state.allowed=true;state.tables=[];state.columns=[];vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','http://localhost');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-test-only')})
it('preserves ANSES attribution and never requests creator identifiers',async()=>{
 const response=await GET(new NextRequest('http://localhost/api/food-search?q=ref'))
 expect(response.status).toBe(200)
 expect((await response.json()).results[0]).toMatchObject({source:'ANSES',brand:'ANSES · Ciqual 2025',source_license:'Etalab-2.0'})
 expect(state.tables).toContain('selectable_food_items')
 expect(state.columns.some(c=>c==='*'||c.includes('created_by'))).toBe(false)
})
it('rejects unauthenticated and rate-limited calls before reading the catalogue',async()=>{
 state.user=false;expect((await GET(new NextRequest('http://localhost/api/food-search?q=ref'))).status).toBe(401)
 state.user=true;state.allowed=false;expect((await GET(new NextRequest('http://localhost/api/food-search?q=ref'))).status).toBe(429)
 expect(state.tables).toEqual([])
})
