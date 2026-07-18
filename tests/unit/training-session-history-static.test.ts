import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('Training session history integration', () => {
  it('keeps the history boundary pure and free of data access', () => {
    const source = read('../../lib/training/session-history.ts')
    expect(source).not.toMatch(/from ['"](?:react|next|@\/app|@supabase)/)
    expect(source).not.toMatch(/createClient|\.from\(|\.select\(|insert\(|update\(|delete\(/)
  })

  it('delegates recent filtering, dates and set grouping from presentation components', () => {
    const tab = read('../../app/components/tabs/TrainingTab.tsx')
    const recent = read('../../app/components/training/RecentSessionsList.tsx')
    const detail = read('../../app/components/training/WorkoutDetailList.tsx')
    expect(tab).toContain('completedWorkoutDateKeys(workoutHistory)')
    expect(tab).toContain('groupWorkoutSets(data || []).detail')
    expect(recent).toContain('selectRecentWorkoutSessions(workoutHistory')
    expect(recent).toContain('formatWorkoutSessionDate(s.created_at, locale)')
    expect(detail).toContain('summarizeWorkoutDetail(detail)')
    expect(detail).toContain('if (loading)')
    expect(detail).toContain('if (detail.length === 0)')
  })

  it('keeps workout and completion histories separate in the dashboard loader', () => {
    const loader = read('../../lib/client-dashboard/training-dashboard-loader.ts')
    expect(loader).toContain('workoutSessions: sessions.ok ? sessions.data : []')
    expect(loader).toContain('prepareCompletionMarkers(completions.data)')
    expect(loader).not.toMatch(/merge|dedup/i)
  })
})
