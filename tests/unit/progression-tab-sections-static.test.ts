import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const directory = path.join(process.cwd(), 'app/components/tabs/progression')
const files = fs.readdirSync(directory).filter(file => file.endsWith('.tsx'))
const sources = files.map(file => fs.readFileSync(path.join(directory, file), 'utf8')).join('\n')
const tab = fs.readFileSync(path.join(process.cwd(), 'app/components/tabs/ProgressTab.tsx'), 'utf8')

describe('ProgressTab section architecture', () => {
  it('keeps every extracted view narrow and free of data access', () => {
    for (const file of files) expect(fs.readFileSync(path.join(directory, file), 'utf8').split('\n').length).toBeLessThan(250)
    for (const forbidden of ['supabase', 'createClient', 'service_role', "select('*')", 'lib/repositories', 'lib/progression/read-models']) expect(sources).not.toContain(forbidden)
    expect(sources).not.toMatch(/\bany\b/)
  })

  it('keeps ProgressTab as orchestrator and preserves section order', () => {
    for (const component of ['ProgressOverviewSection', 'ProgressWeightSection', 'ProgressRecordsSection', 'ProgressMeasurementsSection']) expect(tab).toContain(`<${component}`)
    expect(tab.indexOf('<ProgressOverviewSection')).toBeLessThan(tab.indexOf('<ProgressWeightSection'))
    expect(tab.indexOf('<ProgressWeightSection')).toBeLessThan(tab.indexOf('<ProgressRecordsSection'))
    expect(tab.indexOf('<ProgressRecordsSection')).toBeLessThan(tab.indexOf('<ProgressMeasurementsSection'))
    expect(tab).toContain('<AnalyticsSection')
  })

  it('wires the current callbacks without data mutations in views', () => {
    expect(tab).toContain('onNavigate={scrollToSection}')
    expect(tab).toContain('onPeriodChange={setWeightPeriod}')
    expect(tab).toContain('onAddWeight={() => setShowWeight(true)}')
    expect(tab).toContain('onLimitChange={setRecordsLimit}')
    expect(tab).toContain('onAddMeasurement={() => setShowMeasure(true)}')
    expect(sources).not.toMatch(/\.from\(|\.insert\(|\.update\(|\.delete\(/)
  })
})
