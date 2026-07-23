import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls = vi.hoisted(() => ({
  append: [] as string[],
  writes: [] as string[],
}))

vi.mock('xlsx', () => ({
  utils: {
    book_new: () => ({ SheetNames: [], Sheets: {} }),
    aoa_to_sheet: (rows: unknown[][]) => ({ rows }),
    book_append_sheet: (_workbook: unknown, _sheet: unknown, name: string) => calls.append.push(name),
    sheet_to_json: () => [],
  },
  writeFile: (_workbook: unknown, name: string) => calls.writes.push(name),
  read: () => ({ SheetNames: [], Sheets: {} }),
}))

describe('deferred XLSX program boundary', () => {
  beforeEach(() => {
    calls.append.length = 0
    calls.writes.length = 0
  })

  it('preserves program sheets and filename after the dynamic import', async () => {
    const { exportProgramToXlsx } = await import('../../lib/program-excel')
    await exportProgramToXlsx({
      name: 'Force Été',
      source: 'ai',
      created_at: '2026-07-23T00:00:00.000Z',
      days: [
        { name: 'Push', exercises: [{ exercise_name: 'Développé couché', sets: 4, reps: 8 }] },
        { name: 'Repos', is_rest: true, exercises: [] },
      ],
    })

    expect(calls.append).toEqual(['Programme', 'Jour 1 - Push', 'Jour 2 - Repos'])
    expect(calls.writes).toHaveLength(1)
    expect(calls.writes[0]).toMatch(/^MoovX_Force_Été_\d{4}-\d{2}-\d{2}\.xlsx$/)
  })

  it('preserves the seven-day blank template contract', async () => {
    const { downloadBlankTemplate } = await import('../../lib/program-excel')
    await downloadBlankTemplate()
    expect(calls.append).toEqual(['Programme', 'Jour 1', 'Jour 2', 'Jour 3', 'Jour 4', 'Jour 5', 'Jour 6', 'Jour 7'])
    expect(calls.writes).toEqual(['MoovX_Modele_Vierge.xlsx'])
  })
})
