import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hook = readFileSync('app/client/[id]/hooks/useClientDetail.ts', 'utf8')
const controller = readFileSync('app/client/[id]/hooks/useClientDetailController.ts', 'utf8')
const page = readFileSync('app/client/[id]/page.tsx', 'utf8')

describe('useClientDetail domain wiring', () => {
  it('delegates all four initial reads and invalidates stale target responses', () => {
    for (const boundary of ['loadClientDetailProfile', 'loadClientDetailTraining', 'loadClientDetailNutrition', 'loadClientDetailProgression']) {
      expect(controller).toContain(boundary)
    }
    expect(controller).toContain('detailLoadGenerationRef.current')
    expect(controller).not.toContain("from('active_related_profiles')")
    expect(controller).not.toMatch(/from\('(?:workout_sessions|body_measurements|progress_photos|completed_sessions)'\).*select\(/)
  })

  it('preserves the public facade consumed by the client detail page', () => {
    const usedKeys = [...page.matchAll(/\bh\.([A-Za-z0-9_]+)/g)].map(match => match[1])
    const returned = controller.slice(controller.lastIndexOf('  return {'))
    for (const key of new Set(usedKeys)) expect(returned, key).toMatch(new RegExp(`\\b${key}\\b`))
    expect(controller).toContain('id, router, supabase')
    expect(controller).toContain('coachMessages: resources.coachMessages')
    expect(hook).toContain("export { default } from './useClientDetailController'")
  })
})
