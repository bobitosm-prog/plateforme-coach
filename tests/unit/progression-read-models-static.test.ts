import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const readModelDirectory = path.join(process.cwd(), 'lib/progression/read-models')
const sources = fs.readdirSync(readModelDirectory).filter(file => file.endsWith('.ts'))
  .map(file => fs.readFileSync(path.join(readModelDirectory, file), 'utf8')).join('\n')

describe('progression read model architecture', () => {
  it('has injectable ports and no application or persistence dependencies', () => {
    for (const forbidden of ['react', 'next/', 'supabase', 'createClient', 'service_role', "select('*')", "from('@/app", "from('app/"]) expect(sources).not.toContain(forbidden)
    expect(sources).toContain('AnalyticsReadPort')
    expect(sources).not.toMatch(/\bany\b/)
    expect(sources).not.toMatch(/\b(clientId|coachId|browserUserId)\b/)
  })

  it('keeps public consumers delegated without changing their structure', () => {
    const hook = fs.readFileSync(path.join(process.cwd(), 'app/hooks/useAnalytics.ts'), 'utf8')
    const tab = fs.readFileSync(path.join(process.cwd(), 'app/components/tabs/ProgressTab.tsx'), 'utf8')
    const controller = fs.readFileSync(path.join(process.cwd(), 'app/components/tabs/progression/useProgressTabController.ts'), 'utf8')
    expect(hook).toContain('createAnalyticsReadModel(createAnalyticsPort(supabase))')
    expect(hook).not.toContain("select('*')")
    expect(controller).toContain('buildProgressionSummaryReadModel')
    expect(tab + controller).not.toContain('weeklyVolume.reduce((s, w) => s + w.volume, 0)')
  })
})
