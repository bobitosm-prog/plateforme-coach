import { describe, it, expect, vi } from 'vitest'
import { loadLastExerciseSession } from '@/lib/training/last-exercise-session'
function database(results: any[]) {
  const calls: any[][] = []
  return { calls, db: { from: vi.fn(() => {
    const operations: any[] = []; calls.push(operations)
    const q: any = { then: (resolve: any) => Promise.resolve(results.shift()).then(resolve) }
    for (const method of ['select','eq','or','abortSignal','order','limit','range']) q[method] = (...args: any[]) => { operations.push([method, ...args]); return q }
    return q
  }) } as any }
}
const id = 'baf957b5-753d-4f80-8f68-4f5cb2316cb9'
describe('last exercise session', () => {
  it('reads a complete exercise session regardless of unrelated recent workouts, retaining rest-pause and legacy loads', async () => {
    const rows = Array.from({length:100}, (_,i) => ({id:String(i), session_id:'last', technique:'restpause', load_mode:null, weight:60, reps:10}))
    const {db,calls} = database([{data:[{session_id:'last'}]}, {data:rows}, {data:[{...rows[0],id:'101'}]}])
    const result = await loadLastExerciseSession(db,'owner',id,'Mollets',new AbortController().signal)
    expect(result).toHaveLength(101)
    expect(result[0]).toMatchObject({technique:'restpause',load_mode:null,weight:60})
    for (const call of calls) {
      expect(call).toContainEqual(['eq','user_id','owner'])
      expect(call).toContainEqual(['eq','completed',true])
      expect(call).toContainEqual(['eq','workout_sessions.completed',true])
      expect(call).toContainEqual(['or',`exercise_id.eq.${id},and(exercise_id.is.null,exercise_name.eq."Mollets")`])
    }
    expect(calls[2]).toContainEqual(['range',100,199])
    expect(calls[1]).toContainEqual(['eq','session_id','last'])
  })
  it('distinguishes no history from failure', async () => {
    expect(await loadLastExerciseSession(database([{data:[]}]).db,'owner',null,'Squat',new AbortController().signal)).toEqual([])
    await expect(loadLastExerciseSession(database([{error:{message:'offline'}}]).db,'owner',null,'Squat',new AbortController().signal)).rejects.toThrow('HISTORY_READ_FAILED')
  })
  it('rejects missing owner and invalid id before issuing a query', async () => {
    const {db}=database([])
    await expect(loadLastExerciseSession(db,'',id,'Squat',new AbortController().signal)).rejects.toThrow()
    await expect(loadLastExerciseSession(db,'owner','invalid','Squat',new AbortController().signal)).rejects.toThrow()
    expect(db.from).not.toHaveBeenCalled()
  })
})
