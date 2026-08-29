import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveActiveTrainingProgram,
  type PersonalTrainingProgram,
  type ResolveActiveTrainingProgramInput,
} from '@/lib/training/active-program'

const capabilities = { training: true }
const personal: PersonalTrainingProgram = {
  id: 'personal-1',
  is_active: true,
  days: [{ name: 'Personnel' }],
}
const coachProgram = { lundi: { exercises: [{ name: 'Squat' }] } }

function resolve(overrides: Partial<ResolveActiveTrainingProgramInput> = {}) {
  return resolveActiveTrainingProgram({
    coachRelation: { status: 'not_found', coachId: null },
    coachPrograms: [],
    personalProgram: personal,
    capabilities,
    ...overrides,
  })
}

describe('Training V2 active program authority', () => {
  it('selects an exact matching active coach program and never merges personal data', () => {
    const result = resolve({
      coachRelation: { status: 'active', coachId: 'coach-a' },
      coachPrograms: [{ id: 'coach-program', coach_id: 'coach-a', program: coachProgram }],
    })

    expect(result).toMatchObject({
      state: 'ready',
      source: 'coach',
      programId: 'coach-program',
      program: coachProgram,
      editable: false,
      replacementScope: 'session',
    })
    expect(result.program).not.toEqual(personal)
  })

  it.each([
    ['wrong coach id', [{ id: 'stale', coach_id: 'coach-b', program: coachProgram }]],
    ['stale coach program', [{ id: 'old', coach_id: 'former-coach', program: coachProgram }]],
  ])('rejects a %s and falls back to the active personal program', (_label, coachPrograms) => {
    const result = resolve({
      coachRelation: { status: 'active', coachId: 'coach-a' },
      coachPrograms,
    })

    expect(result.source).toBe('personal')
    expect(result.programId).toBe('personal-1')
  })

  it('rejects an invalid matching coach payload before authority selection', () => {
    const result = resolve({
      coachRelation: { status: 'active', coachId: 'coach-a' },
      coachPrograms: [{ id: 'invalid', coach_id: 'coach-a', program: { malformed: true } }],
      coachProgramValidator: () => false,
    })

    expect(result.source).toBe('personal')
  })

  it.each(['ended', 'not_found'] as const)('%s relation uses the personal fallback', status => {
    const result = resolve({
      coachRelation: { status, coachId: null },
      coachPrograms: [{ id: 'stale', coach_id: 'coach-a', program: coachProgram }],
    })

    expect(result.source).toBe('personal')
  })

  it.each(['multiple_active', 'error'] as const)('%s fails safe instead of choosing a program', status => {
    const result = resolve({
      coachRelation: { status, coachId: null },
    })

    expect(result.state).toBe('error')
    expect(result.source).toBe('none')
    expect(result.program).toBeNull()
  })

  it('does not accept coachManaged capability as relation proof', () => {
    const source = readFileSync('lib/training/active-program.ts', 'utf8')
    expect(source).not.toMatch(/coachManaged/)
    expect(resolve().source).toBe('personal')
  })

  it('exposes read failures instead of treating them as an empty normal state', () => {
    expect(resolve({ personalProgram: null, personalProgramReadError: true })).toMatchObject({
      state: 'error',
      source: 'none',
      errors: ['TRAINING_PERSONAL_PROGRAM_READ_FAILED'],
    })
  })

  it('removes unused eager authorities and passes the resolved context to TrainingTab', () => {
    const hook = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
    const tab = readFileSync('app/components/tabs/TrainingTab.tsx', 'utf8')
    expect(hook).not.toContain("supabase.from('training_programs')")
    expect(hook).not.toContain("supabase.from('user_programs')")
    expect(tab).toContain('activeTrainingProgram: ActiveTrainingProgramContext')
    expect(tab).not.toContain('setActiveCustomProgram')
  })
})
