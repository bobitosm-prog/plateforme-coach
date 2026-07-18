import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DAY_NAMES_FR, padTo7Days } from '../../lib/schedule-utils'
import {
  combineExerciseLibraries,
  searchExerciseLibrary,
} from '../../lib/training/exercise-library'

const root = process.cwd()
const builderPath = resolve(root, 'app/components/training/ProgramBuilder.tsx')
const overlaysPath = resolve(root, 'app/components/tabs/training/TrainingTabOverlays.tsx')
const modelPath = resolve(root, 'lib/training/program-editor-model.ts')
const builder = readFileSync(builderPath, 'utf8')
const overlays = readFileSync(overlaysPath, 'utf8')
const model = readFileSync(modelPath, 'utf8')

describe('ProgramBuilder current program shapes', () => {
  it('pads an empty program to seven explicit rest days', () => {
    const input: Array<Record<string, unknown>> = []
    const result = padTo7Days(input)

    expect(result).toHaveLength(7)
    expect(result.map(day => day.weekday)).toEqual(DAY_NAMES_FR)
    expect(result.every(day => day.is_rest === true && Array.isArray(day.exercises))).toBe(true)
    expect(input).toEqual([])
  })

  it('preserves known legacy fields and truncates days beyond Sunday', () => {
    const days = [
      {
        name: 'Push',
        exercises: [{ exercise_name: 'Développé', sets: 4, reps: 8, rest: 120, tempo: '3-1-1', technique: 'dropset', technique_details: '2' }],
      },
      ...Array.from({ length: 7 }, (_, index) => ({ name: `Jour ${index + 2}`, is_rest: index > 3, exercises: [] })),
    ]
    const result = padTo7Days(days)

    expect(result).toHaveLength(7)
    expect(result[0]).toMatchObject(days[0])
    expect(result[0].exercises[0]).toEqual(days[0].exercises[0])
    expect(result.some(day => day.name === 'Jour 8')).toBe(false)
  })

  it('characterizes the current shallow mutation of missing weekday fields', () => {
    const day = { name: 'Legacy', exercises: [] as unknown[] }
    const input = [day]

    const result = padTo7Days(input)

    expect(result[0]).toBe(day)
    expect(day).toHaveProperty('weekday', 'Lundi')
    expect(input).toHaveLength(1)
  })

  it('loads an edited program through the seven-day legacy adapter', () => {
    expect(builder).toContain('setProgramName(editProgram.name)')
    expect(builder).toContain('setProgramDays(normalizeProgramEditorDays(editProgram.days || []).days)')
    expect(builder).toContain("setMode('manual')")
    expect(builder).toContain('setManualStep(1)')
  })
})

describe('ProgramBuilder current editing behavior', () => {
  it('uses fixed calendar days and represents removal as a rest-day toggle', () => {
    expect(builder).toContain("const DAY_NAMES = DAY_NAMES_FR")
    expect(builder).toContain('setProgramDayRest(prev, editingDayIndex, !prev[editingDayIndex]?.is_rest)')
    expect(model).toContain('exercises: isRest ? [] : exerciseList(day).map(cloneExercise)')
    expect(builder).not.toMatch(/function (?:add|remove)Day/)
  })

  it('adds and removes exercises with the current numeric fallbacks', () => {
    expect(builder).toContain('addProgramExercise(prev, editingDayIndex, exercise, isCustom)')
    expect(builder).toContain('removeProgramExercise(prev, { dayIndex: dayIdx, exerciseIndex: exIdx })')
    expect(model).toContain('sets: exercise.sets || 3')
    expect(model).toContain('reps: exercise.reps || 10')
    expect(model).toContain('rest: exercise.rest_seconds || 90')
    expect(builder).toContain('setShowExerciseSearch(false)')
  })

  it('updates exercises immutably at the edited day boundary', () => {
    expect(builder).toContain('updateProgramExercise(prev, { dayIndex: dayIdx, exerciseIndex: exIdx }, field, value)')
    expect(model).toContain('? { ...cloneExercise(exercise), [field]: cloneValue(value) }')
  })

  it('supports exercise and day reordering without changing calendar weekdays', () => {
    expect(builder).toContain('const result = moveProgramExercise(')
    expect(builder).toContain('setProgramDays(prev => swapProgramDays(prev, swapFirst, i))')
    expect(model).toContain('reordered.splice(source.exerciseIndex, 1)')
    expect(model).toContain('normalized[firstIndex] = { ...second, weekday: first.weekday }')
    expect(model).toContain('normalized[secondIndex] = { ...first, weekday: second.weekday }')
  })

  it('edits sets, repetitions, rest, tempo and techniques but not load or RIR', () => {
    for (const field of ['sets', 'reps', 'rest', 'tempo', 'technique', 'technique_details']) {
      expect(builder).toContain(`'${field}'`)
    }
    expect(builder).not.toMatch(/updateExerciseField\([^\n]+,\s*'(?:weight|load|rir)'/i)
    expect(builder).toContain("const parts = (ex.tempo || '2-0-2').split('-')")
  })

  it('falls back across legacy exercise names before the unknown label', () => {
    expect(builder).toContain('ex.exercise_name || ex.custom_name || ex.name || dbExercises.find(e => e.id === ex.exercise_id)?.name')
    expect(builder).toContain("exerciseNameRaw || t('day.unknownExercise')")
    expect(builder).toContain('ex.muscle_group || ex.focus || dbExercises.find(e => e.id === ex.exercise_id)?.muscle_group')
  })
})

describe('ProgramBuilder current library and variants', () => {
  it('keeps catalog then custom results in stable order without deduplication', () => {
    const catalog = [{ id: 'catalog', name: 'Curl', muscle_group: 'Biceps' }]
    const custom = [{ id: 'custom', name: 'Curl', muscle_group: 'Biceps' }]
    const combined = combineExerciseLibraries(catalog, custom)
    const result = searchExerciseLibrary(combined, { search: 'CURL', muscle: 'biceps', muscleMatch: 'case-insensitive' })

    expect(result.results.map(exercise => exercise.id)).toEqual(['catalog', 'custom'])
    expect(result.results[1]).toMatchObject({ _custom: true })
    expect(catalog).toEqual([{ id: 'catalog', name: 'Curl', muscle_group: 'Biceps' }])
    expect(custom).toEqual([{ id: 'custom', name: 'Curl', muscle_group: 'Biceps' }])
  })

  it('delegates search to the shared boundary with the builder-specific muscle rule', () => {
    expect(builder).toContain('combineExerciseLibraries(dbExercises, customExercises)')
    expect(builder).toContain('searchExerciseLibrary(')
    expect(builder).toContain("muscleMatch: 'case-insensitive'")
    expect(builder).toContain("allMusclesKey: ALL_KEY")
  })

  it('resolves variants by group, then by the first two words as fallback', () => {
    expect(builder).toContain(".from('exercises_db').select('variant_group')")
    expect(builder).toContain("const baseName = exerciseName.split(' ').slice(0, 2).join(' ')")
    expect(builder).toContain(".select('name, equipment, muscle_group')")
    expect(builder).toContain("updateExerciseField(variantPopup.dayIdx, variantPopup.exIdx, 'exercise_name', variant.name)")
  })

  it('persists a custom exercise for the authenticated session owner', () => {
    expect(builder).toContain("supabase.from('custom_exercises').insert({")
    expect(builder).toContain('user_id: session.user.id, name: ceName.trim()')
    expect(builder).toContain('sets: ceSets, reps: ceReps, rest_seconds: ceRest, is_private: true')
    expect(builder).toContain("setMode('manual')")
  })
})

describe('ProgramBuilder current save and callback contract', () => {
  it('keeps the exact personal-program payload and create/edit split', () => {
    expect(builder).toContain('const prepared = prepareLegacyProgramPayload({')
    for (const field of ['ownerUserId: session.user.id', 'name: programName', "description: aiResult?.description || ''", 'days: programDays', "source: aiResult ? 'ai' : 'manual'", 'now: () => new Date()']) {
      expect(builder).toContain(field)
    }
    expect(builder).toContain('const payload = prepared.payload')
    expect(builder).toContain("supabase.from('custom_programs').update(payload).eq('id', editProgram.id)")
    expect(builder).toContain("supabase.from('custom_programs').insert({ ...payload, is_active: false })")
  })

  it('regenerates only non-rest scheduled sessions before invoking save and close', () => {
    expect(builder).toContain("supabase.from('scheduled_sessions').delete()")
    expect(builder).toContain(".eq('completed', false)")
    expect(builder).toContain('if (!day || day.is_rest) continue')
    expect(builder).toContain("session_type: 'custom'")
    expect(builder).toContain("scheduled_time: '08:00'")
    expect(builder).toContain('await supabase.from(\'scheduled_sessions\').insert(newSessions)')
    expect(builder.indexOf('onSave()')).toBeLessThan(builder.indexOf('onClose()', builder.indexOf('onSave()')))
  })

  it('refuses incomplete manual saves and leaves cancellation write-free', () => {
    expect(builder).toContain('if (!programName.trim() || !programDays.length) return')
    expect(builder).toContain("if (!programName.trim()) { toast.error(t('config.nameRequired')); return }")
    expect(builder).toContain('<button onClick={onClose}')
    expect(overlays).toContain('onClose={() => { setShowProgramBuilder(false); setEditingProgram(null) }}')
    expect(overlays).toContain('onSave={refreshPrograms}')
  })

  it('keeps SSR explicitly empty and owns its existing Supabase accesses', () => {
    expect(builder).toContain("if (typeof document === 'undefined') return null")
    for (const table of ['exercises_db', 'custom_exercises', 'profiles', 'custom_programs', 'scheduled_sessions']) {
      expect(builder).toContain(`from('${table}')`)
    }
    expect(builder).toContain("supabase.from('custom_exercises').select('*')")
  })
})
