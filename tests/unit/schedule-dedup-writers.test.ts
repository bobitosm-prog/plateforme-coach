import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('calendar writer safeguards', () => {
  it.each(['app/hooks/useScheduledSessions.ts', 'app/components/training/ProgramBuilder.tsx',
    'app/components/training/TrainingProgramManager.tsx'])('uses non-destructive conflict handling in %s', file => {
    const source = readFileSync(file, 'utf8')
    expect(source).not.toMatch(/from\('scheduled_sessions'\)\.insert\(/)
    expect(source).toContain("onConflict: 'user_id,scheduled_date,session_type,title', ignoreDuplicates: true")
  })
  it('does not recreate completed slots when editing an active program', () => {
    const source = readFileSync('app/components/training/ProgramBuilder.tsx', 'utf8')
    expect(source).toContain(".eq('completed', false)")
    expect(source).toContain('if (readScheduleError) throw')
    expect(source).toContain('if (occupiedSlots.has(`${toDateStr(date)}|custom`)) continue')
  })
})
