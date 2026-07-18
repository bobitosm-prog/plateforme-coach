import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  addProgramExercise,
  createProgramEditorWeek,
  moveProgramExercise,
  normalizeProgramEditorDays,
  prepareLegacyProgramPayload,
  removeProgramExercise,
  setProgramDayRest,
  swapProgramDays,
  updateProgramDay,
  updateProgramExercise,
  validateProgramEditor,
  type ProgramEditorDay,
} from '../../lib/training/program-editor-model'

const week = (): ProgramEditorDay[] => createProgramEditorWeek(3)

describe('program editor normalization and days', () => {
  it('normalizes an empty program to seven deterministic days', () => {
    const result = normalizeProgramEditorDays([])
    expect(result.days).toHaveLength(7)
    expect(result.days.map(day => day.weekday)).toEqual(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'])
    expect(result.days.every(day => day.is_rest)).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('deeply preserves known legacy fields without mutating input', () => {
    const input = [{ name: 'Push', exercises: [{ exercise_name: 'Bench', sets: 4, reps: '8-10', rest: 120, tempo: '3-1-1', technique: 'dropset', technique_details: '2', legacy: { nested: true } }] }]
    const snapshot = structuredClone(input)
    const result = normalizeProgramEditorDays(input)

    expect(result.days[0]).toMatchObject(input[0])
    expect(result.days[0].exercises?.[0]).not.toBe(input[0].exercises[0])
    expect(input).toEqual(snapshot)
    expect(input[0]).not.toHaveProperty('weekday')
  })

  it('does not invent an exercises key in an incomplete legacy day payload', () => {
    const input = [{ name: 'Legacy sans exercices' }]
    const result = normalizeProgramEditorDays(input)
    expect(result.days[0]).toEqual({ name: 'Legacy sans exercices', weekday: 'Lundi' })
    expect(input).toEqual([{ name: 'Legacy sans exercices' }])
  })

  it('isolates invalid days and exercises with stable bounded paths', () => {
    const result = normalizeProgramEditorDays([null, { exercises: ['bad', { name: 'Valid' }] }])
    expect(result.issues).toEqual([
      { code: 'invalid_day', path: 'days.0' },
      { code: 'invalid_exercise', path: 'days.1.exercises.0' },
    ])
    expect(result.days[0].is_rest).toBe(true)
    expect(result.days[1].exercises).toEqual([{ name: 'Valid' }])
  })

  it('bounds validation output even when a legacy collection is hostile', () => {
    const result = normalizeProgramEditorDays([{ exercises: Array.from({ length: 40 }, () => 'invalid') }])
    expect(result.issues).toHaveLength(20)
    expect(result.issues[0]).toEqual({ code: 'invalid_exercise', path: 'days.0.exercises.0' })
    expect(result.issues[19]).toEqual({ code: 'invalid_exercise', path: 'days.0.exercises.19' })
  })

  it('creates, updates and removes a day through the fixed rest representation', () => {
    const created = createProgramEditorWeek(2)
    expect(created.map(day => day.is_rest)).toEqual([false, false, true, true, true, true, true])

    const named = updateProgramDay(created, 0, { name: 'Push' })
    const removed = setProgramDayRest(named, 0, true)
    const restored = setProgramDayRest(removed, 0, false)
    expect(named[0].name).toBe('Push')
    expect(removed[0]).toMatchObject({ name: 'Push', is_rest: true, exercises: [] })
    expect(restored[0]).toMatchObject({ name: 'Push', is_rest: false, exercises: [] })
    expect(created[0].name).toBe('')
  })
})

describe('program editor exercise operations and DnD decision', () => {
  it('adds, updates and removes an exercise with legacy defaults', () => {
    const base = week()
    const added = addProgramExercise(base, 0, { id: 'catalog', name: 'Squat', muscle_group: 'Quadriceps', sets: 0, reps: 12, rest_seconds: 0 }, false)
    expect(added[0].exercises?.[0]).toEqual({ id: 'catalog', name: 'Squat', muscle_group: 'Quadriceps', sets: 3, reps: 12, rest: 90, isCustom: false })

    const updated = updateProgramExercise(added, { dayIndex: 0, exerciseIndex: 0 }, 'tempo', '3-1-1')
    const removed = removeProgramExercise(updated, { dayIndex: 0, exerciseIndex: 0 })
    expect(updated[0].exercises?.[0].tempo).toBe('3-1-1')
    expect(removed[0].exercises).toEqual([])
    expect(base[0].exercises).toEqual([])
  })

  it('moves within one day with stable order and deep immutability', () => {
    const input = addProgramExercise(addProgramExercise(addProgramExercise(week(), 0, { name: 'A' }, false), 0, { name: 'B' }, false), 0, { name: 'C' }, true)
    const snapshot = structuredClone(input)
    const result = moveProgramExercise(input, { dayIndex: 0, exerciseIndex: 0 }, { dayIndex: 0, exerciseIndex: 2 })

    expect(result).toMatchObject({ ok: true, changed: true })
    expect(result.days[0].exercises?.map(exercise => exercise.name)).toEqual(['B', 'C', 'A'])
    expect(input).toEqual(snapshot)
  })

  it('returns a no-op clone for the same position', () => {
    const input = addProgramExercise(week(), 0, { name: 'A' }, false)
    const result = moveProgramExercise(input, { dayIndex: 0, exerciseIndex: 0 }, { dayIndex: 0, exerciseIndex: 0 })
    expect(result).toMatchObject({ ok: true, changed: false })
    expect(result.days).toEqual(input)
    expect(result.days).not.toBe(input)
  })

  it('fails closed for invalid indices and unsupported cross-day moves', () => {
    const input = addProgramExercise(week(), 0, { name: 'A' }, false)
    expect(moveProgramExercise(input, { dayIndex: 0, exerciseIndex: 8 }, { dayIndex: 0, exerciseIndex: 0 })).toMatchObject({ ok: false, reason: 'invalid_source' })
    expect(moveProgramExercise(input, { dayIndex: 0, exerciseIndex: 0 }, { dayIndex: 0, exerciseIndex: 8 })).toMatchObject({ ok: false, reason: 'invalid_destination' })
    expect(moveProgramExercise(input, { dayIndex: 0, exerciseIndex: 0 }, { dayIndex: 1, exerciseIndex: 0 })).toMatchObject({ ok: false, reason: 'cross_day_not_supported' })
  })

  it('swaps days while preserving their calendar weekday', () => {
    const input = updateProgramDay(updateProgramDay(week(), 0, { name: 'Push' }), 1, { name: 'Pull' })
    const swapped = swapProgramDays(input, 0, 1)
    expect(swapped[0]).toMatchObject({ name: 'Pull', weekday: 'Lundi' })
    expect(swapped[1]).toMatchObject({ name: 'Push', weekday: 'Mardi' })
    expect(input[0]).toMatchObject({ name: 'Push', weekday: 'Lundi' })
  })
})

describe('program editor validation and legacy payload', () => {
  it('returns discriminated stable errors without input content', () => {
    const result = validateProgramEditor({ name: ' ', description: 'private content', source: 'manual', days: [] })
    expect(result).toEqual({ ok: false, errors: [
      { code: 'name_required', path: 'name' },
      { code: 'invalid_day_count', path: 'days' },
    ] })
    expect(JSON.stringify(result)).not.toContain('private content')
  })

  it('prepares the exact legacy payload with an injected clock', () => {
    const days = addProgramExercise(week(), 0, { id: 'custom', name: 'Curl', sets: 4, reps: 10, rest_seconds: 60, tempo: '2-0-2', technique: 'restpause', technique_details: '2,15' }, true)
    const result = prepareLegacyProgramPayload({ ownerUserId: 'synthetic-user', name: '  Programme  ', description: 'Description', source: 'manual', days, now: () => new Date('2026-07-18T10:00:00.000Z') })

    expect(result).toEqual({ ok: true, payload: {
      user_id: 'synthetic-user', name: 'Programme', description: 'Description', days,
      source: 'manual', updated_at: '2026-07-18T10:00:00.000Z',
    } })
  })

  it('has no React, Next, Supabase or browser dependency', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/training/program-editor-model.ts'), 'utf8')
    expect(source).not.toMatch(/from ['"](?:react|next|@supabase)/)
    expect(source).not.toMatch(/\b(?:window|document|navigator|localStorage|fetch|supabase)\b/)
    expect(source).not.toContain("from '@/app")
  })
})
