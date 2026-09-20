import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { runWeeklyGeneration } from '@/lib/weekly-diagnostic/worker'
function fixture(settled=true) {
  const rpc=vi.fn().mockResolvedValue({data:settled,error:null})
  rpc.mockResolvedValueOnce({data:['a','b','c'].map(user_id=>({user_id,week_start:'2026-09-14'})),error:null})
  const eq=vi.fn().mockResolvedValue({error:null}); const update=vi.fn(()=>({eq}))
  return {rpc,update,db:{rpc,from:()=>({update})} as unknown as SupabaseClient}
}
describe('durable weekly worker',()=>{
  it('separates saved, blocked and failed generations without retaining provider details',async()=>{
    const f=fixture(); const generate=vi.fn().mockResolvedValueOnce({diagnostic_id:'d'}).mockResolvedValueOnce({blocked:true}).mockRejectedValueOnce(new Error('private provider response'))
    expect(await runWeeklyGeneration(f.db,generate)).toMatchObject({claimed:3,succeeded:1,blocked:1,errors:1,status:'partial'})
    expect(JSON.stringify(f.rpc.mock.calls)).not.toContain('private provider')
    expect(f.update).toHaveBeenCalledWith(expect.objectContaining({status:'partial',errors:1}))
  })
  it('does not report success without a saved diagnostic id or a confirmed settlement',async()=>{
    const f=fixture(false)
    expect(await runWeeklyGeneration(f.db,vi.fn().mockResolvedValue({diagnostic_id:'d'}))).toMatchObject({succeeded:0,errors:3})
    const g=fixture()
    expect(await runWeeklyGeneration(g.db,vi.fn().mockResolvedValue({}))).toMatchObject({succeeded:0,errors:3})
  })
  it('fails closed if the queue is unavailable',async()=>{
    const f=fixture(); f.rpc.mockReset().mockResolvedValue({error:{code:'unavailable'}})
    const generate=vi.fn(); await expect(runWeeklyGeneration(f.db,generate)).rejects.toThrow('QUEUE_UNAVAILABLE')
    expect(generate).not.toHaveBeenCalled()
  })
})
