import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')
const model = source('lib/training/program-editor-model.ts')
const builder = source('app/components/training/ProgramBuilder.tsx')

describe('ProgramBuilder pure editor boundary', () => {
  it('keeps the model independent from UI, persistence and browser packages', () => {
    expect(model).not.toMatch(/^import /m)
    expect(model).not.toMatch(/\b(?:React|Next|Supabase|window|document|navigator|localStorage|fetch)\b/i)
    expect(model).not.toMatch(/@dnd-kit|framer-motion/)
  })

  it('delegates normalization, CRUD, reorder, day swap and payload preparation', () => {
    for (const operation of [
      'normalizeProgramEditorDays', 'createProgramEditorWeek', 'addProgramExercise',
      'removeProgramExercise', 'updateProgramExercise', 'updateProgramDay',
      'setProgramDayRest', 'moveProgramExercise', 'swapProgramDays',
      'prepareLegacyProgramPayload',
    ]) {
      expect(builder, operation).toContain(operation)
    }
  })

  it('does not duplicate the former mutable editor algorithms in ProgramBuilder', () => {
    expect(builder).not.toContain('day.exercises.splice(exIdx, 1)')
    expect(builder).not.toContain('day.exercises[exIdx] = { ...day.exercises[exIdx], [field]: value }')
    expect(builder).not.toContain('const temp = arr[exIdx]; arr[exIdx] = arr[ni]; arr[ni] = temp')
    expect(builder).not.toContain('updated[swapFirst!] = { ...dayB, weekday: weekdayA }')
    expect(builder).not.toContain('setProgramDays(padTo7Days(')
  })

  it('keeps persistence and calendar synchronization outside the pure model', () => {
    expect(model).not.toMatch(/custom_programs|scheduled_sessions|\.from\(|\.insert\(|\.update\(|\.delete\(/)
    expect(builder).toContain('saveProgramAndSynchronizeCalendar(persistence')
    expect(builder).not.toMatch(/custom_programs|scheduled_sessions/)
  })

  it('preserves the public builder export and padTo7Days compatibility export', () => {
    expect(builder).toContain('export default function ProgramBuilder(')
    expect(builder).toContain('export { padTo7Days }')
  })
})
