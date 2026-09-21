import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('calendar writer safeguards', () => {
  it.each(['app/hooks/useScheduledSessions.ts'])('uses non-destructive conflict handling in %s', file => {
    const source = readFileSync(file, 'utf8')
    expect(source).not.toMatch(/from\('scheduled_sessions'\)\.insert\(/)
    expect(source).toContain("onConflict: 'user_id,scheduled_date,session_type,title', ignoreDuplicates: true")
  })
  it('does not recreate completed slots when editing an active program', () => {
    const source = readFileSync('supabase/migrations/20260921160900_training_program_atomic_editor.sql', 'utf8')
    expect(source).toContain('completed=false and scheduled_date>=today')
    expect(source).toContain("session_type='custom' and scheduled_date=slot")
    expect(source).toContain('on conflict(user_id,scheduled_date,session_type,title) do nothing')
  })
})
