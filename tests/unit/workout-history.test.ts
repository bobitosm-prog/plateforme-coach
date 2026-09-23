import { describe, expect, it, vi } from 'vitest'
import { resolveSessionType } from '@/lib/session-types'
import { loadWorkoutHistory, matchesWorkoutHistory } from '@/lib/training/workout-history'

const row = (id: number, name = 'Séance', muscles = ['Epaules, Biceps, Triceps']) => ({id: String(id), name, completed: true, created_at: '2026-09-18T05:00:00', muscles_worked: muscles})

function database(results: {data: unknown; error?: unknown}[]) {
  const calls: {table: string; operations: unknown[][]}[] = []
  const db = {from: vi.fn((table: string) => {
    const call = {table, operations: [] as unknown[][]}; calls.push(call)
    const query: any = {then(resolve: any) { return Promise.resolve(results.shift()).then(resolve) }}
    for (const method of ['select','eq','lte','order','range','abortSignal','in']) query[method] = (...args: unknown[]) => {call.operations.push([method,...args]); return query}
    return query
  })}
  return {db: db as any, calls}
}

describe('workout history classification', () => {
  it.each(['UPPER ISOLATIONS — Epaules & Bras', 'Upper Isolations', 'UPPER ISOLATIONS — Épaules & Bras'])('prefers the specific type: %s', name => {
    expect(resolveSessionType(name).key).toBe('epaules')
    expect(matchesWorkoutHistory(row(1,name), 'epaules')).toBe(true)
  })
  it('uses old comma-separated muscle labels without renaming history', () => {
    const session = row(1)
    expect(matchesWorkoutHistory(session,'epaules')).toBe(true)
    expect(session.name).toBe('Séance')
    expect(matchesWorkoutHistory(session,'dos')).toBe(false)
  })
  it('includes shoulders in push sessions, without classifying them as upper isolations', () => {
    const session = row(1,'PUSH — Poitrine & Epaules & Triceps',[])
    expect(matchesWorkoutHistory(session,'pectoraux')).toBe(true)
    expect(matchesWorkoutHistory(session,'epaules')).toBe(true)
    expect(matchesWorkoutHistory(session,'haut')).toBe(false)
  })
  it('does not guess muscles for unknown sessions or substring fragments', () => {
    expect(matchesWorkoutHistory(row(1,'Séance',[]),'epaules')).toBe(false)
    expect(matchesWorkoutHistory(row(1,'backpack',[]),'dos')).toBe(false)
    expect(matchesWorkoutHistory(row(1,'shoulders',[]),'epaules')).toBe(true)
    expect(matchesWorkoutHistory(row(1),'all')).toBe(true)
  })
  it('preserves full-body and lower types', () => {
    expect(matchesWorkoutHistory(row(1,'Full Body — Épaules',[]),'full_body')).toBe(true)
    expect(matchesWorkoutHistory(row(1,'Lower',[]),'bas')).toBe(true)
  })
})

describe('complete, owner-scoped history reads', () => {
  it('loads 119 sessions rather than the 90-row dashboard window', async () => {
    const {db,calls} = database([{data:Array.from({length:100},(_,i)=>row(i))},{data:Array.from({length:19},(_,i)=>row(i+100))}])
    expect(await loadWorkoutHistory(db,'owner')).toHaveLength(119)
    expect(calls).toHaveLength(2)
    for (const call of calls) {
      expect(call.operations).toContainEqual(['eq','user_id','owner'])
      expect(call.operations).toContainEqual(['eq','completed',true])
      expect(call.operations).toContainEqual(['order','id',{ascending:false}])
    }
    expect(calls[1].operations).toContainEqual(['range',100,199])
  })
  it('uses exact historical exercise evidence when muscle metadata is missing', async () => {
    const {db,calls} = database([{data:[row(1,'Séance',[])]},{data:[{session_id:'1',exercise_name:'Arnold press'}]},{data:[{name:'Arnold press',muscle_group:'Épaules'}]}])
    const history = await loadWorkoutHistory(db,'owner')
    expect(matchesWorkoutHistory(history[0],'epaules')).toBe(true)
    expect(calls[1].operations).toContainEqual(['eq','user_id','owner'])
    expect(calls[2].operations).toContainEqual(['in','name',['Arnold press']])
  })
  it('never returns partial history as a successful full history', async () => {
    const {db} = database([{data:Array.from({length:100},(_,i)=>row(i))},{data:null,error:{message:'offline'}}])
    await expect(loadWorkoutHistory(db,'owner')).rejects.toThrow('HISTORY_READ_FAILED')
  })
  it('rejects missing owner or cancelled reads before querying', async () => {
    const {db} = database([])
    await expect(loadWorkoutHistory(db,'')).rejects.toThrow('HISTORY_AUTH_REQUIRED')
    await expect(loadWorkoutHistory(db,'owner',AbortSignal.abort())).rejects.toThrow('HISTORY_ABORTED')
    expect(db.from).not.toHaveBeenCalled()
  })
})
