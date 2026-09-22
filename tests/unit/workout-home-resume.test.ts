// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn()})}))
vi.mock('@supabase/ssr',()=>({createBrowserClient:()=>({
  auth:{getSession:async()=>({data:{session:{user:{id:'synthetic-resume'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  from:()=>({insert:vi.fn()}),
})}))
vi.mock('@/lib/getRole',()=>({getRole:async()=>null}))
vi.mock('@/lib/entitlements/client-snapshot',async(importOriginal)=>({
  ...await importOriginal<object>(),
  // Stop unrelated dashboard loading at its first async boundary; never call a real API.
  fetchEffectiveEntitlementSnapshot:()=>new Promise(()=>{}),
}))
vi.mock('@/app/hooks/useMessages',()=>({default:()=>({})}))
vi.mock('@/app/hooks/useAnalytics',()=>({default:()=>({personalRecords:[],sourceStates:{},wellbeingEntries:[]})}))
vi.mock('@/app/hooks/useScheduledSessions',()=>({default:()=>({})}))
vi.mock('@/app/hooks/useFoodLog',()=>({default:()=>({})}))
vi.mock('@/app/hooks/useProgressionViewModel',()=>({default:()=>({})}))
import useClientDashboard from '@/app/hooks/useClientDashboard'
import { removeActiveWorkoutDraft } from '@/lib/training/active-workout-draft'
beforeEach(()=>{localStorage.clear();vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('External network forbidden')}))})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('resumes the actual dashboard draft after Home instead of replacing it, but respects abandonment',async()=>{
  const {result}=renderHook(()=>useClientDashboard())
  await waitFor(()=>expect(result.current.session?.user.id).toBe('synthetic-resume'))
  await act(async()=>{await result.current.startProgramWorkout({name:'Pull'},[{name:'Curl',sets:3,reps:10}])})
  const draft=structuredClone(result.current.workoutSession!)
  draft.exercises[0].sets[0].weight=25
  draft.exercises[0].sets[0].weightRaw='25'
  act(()=>result.current.updateWorkoutSessionDraft(draft))
  act(()=>result.current.closeWorkoutSession())
  expect(result.current.workoutSession).toBeNull()
  expect(result.current.pausedWorkoutSession?.sessionName).toBe('Pull')
  await act(async()=>{await result.current.startProgramWorkout({name:'Must not overwrite'},[])})
  expect(result.current.workoutSession?.draftId).toBe(draft.draftId)
  expect(result.current.workoutSession?.exercises[0].sets[0].weight).toBe(25)
  expect(result.current.pausedWorkoutSession).toBeNull()
  act(()=>{removeActiveWorkoutDraft(localStorage);result.current.closeWorkoutSession()})
  expect(result.current.pausedWorkoutSession).toBeNull()
  expect(result.current.workoutSession).toBeNull()
})
