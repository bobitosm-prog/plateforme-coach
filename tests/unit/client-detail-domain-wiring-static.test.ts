import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hook = readFileSync('app/client/[id]/hooks/useClientDetail.ts', 'utf8')
const page = readFileSync('app/client/[id]/page.tsx', 'utf8')

describe('useClientDetail domain wiring', () => {
  it('delegates all four initial reads and invalidates stale target responses', () => {
    for (const boundary of ['loadClientDetailProfile', 'loadClientDetailTraining', 'loadClientDetailNutrition', 'loadClientDetailProgression']) {
      expect(hook).toContain(boundary)
    }
    expect(hook).toContain('detailLoadGenerationRef.current')
    expect(hook).not.toContain("from('active_related_profiles')")
    expect(hook).not.toMatch(/from\('(?:workout_sessions|body_measurements|progress_photos|completed_sessions)'\).*select\(/)
  })

  it('preserves the public facade consumed by the client detail page', () => {
    const usedKeys = [...page.matchAll(/\bh\.([A-Za-z0-9_]+)/g)].map(match => match[1])
    const returned = hook.slice(hook.lastIndexOf('  return {'))
    for (const key of new Set(usedKeys)) expect(returned, key).toMatch(new RegExp(`\\b${key}\\b`))
    expect(hook).toContain('id, router, supabase')
    expect(hook).toContain('coachMessages, coachMsgInput, setCoachMsgInput, sendCoachMessage')
  })
})
