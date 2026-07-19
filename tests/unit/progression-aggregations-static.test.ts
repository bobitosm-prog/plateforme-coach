import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const directory = path.join(process.cwd(), 'lib/progression')
const sources = fs.readdirSync(directory).filter(file => file.endsWith('.ts')).map(file => fs.readFileSync(path.join(directory, file), 'utf8')).join('\n')

describe('progression aggregation purity', () => {
  it('has no forbidden runtime or persistence dependencies', () => {
    for (const forbidden of ['react', 'next/', 'supabase', 'window.', 'document.', 'localStorage', 'fetch(', 'createClient', "select('*')"]) expect(sources).not.toContain(forbidden)
  })
  it('contains no any or hidden current clock', () => {
    expect(sources).not.toMatch(/\bany\b/)
    expect(sources).not.toContain('Date.now()')
  })
  it('keeps representative analytics consumers on the shared formulas', () => {
    const analytics = fs.readFileSync(path.join(process.cwd(), 'app/components/AnalyticsSection.tsx'), 'utf8')
    expect(analytics).toContain('buildLegacyExerciseProgression(wSessions)')
    expect(sources).toContain('estimatedOneRepMax(set.weight, set.reps)')
    expect(analytics).toContain('percentageChangeLegacy(weeklyVolume.map(item => item.volume))')
    expect(analytics).not.toContain('s.weight * (1 + s.reps / 30)')
  })
})
