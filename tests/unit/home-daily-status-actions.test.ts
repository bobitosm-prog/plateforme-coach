import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const dailyStatus = readFileSync('app/components/home-v2/DailyStatus.tsx', 'utf8')
const home = readFileSync('app/components/home-v2/HomeV2.tsx', 'utf8')
const homeTab = readFileSync('app/components/tabs/HomeTab.tsx', 'utf8')

describe('daily status action wiring', () => {
  it('exposes and forwards every factual training action', () => {
    expect(home).toContain('onStartSession={actions.onStartSession}')
    expect(home).toContain('onOpenSession={actions.onOpenSession}')
    expect(home).toContain('onOpenProgram={actions.onOpenProgram}')
    expect(home).toContain('onStartFreeSession={actions.onStartFreeSession}')
    expect(dailyStatus).toContain('start_session: training.session && onStartSession')
    expect(dailyStatus).toContain('open_session: training.session && onOpenSession')
  })

  it('routes Nutrition through the existing application tab only', () => {
    expect(home).toContain('onOpenNutrition?: () => void')
    expect(home).toContain('onOpenNutrition={actions.onOpenNutrition}')
    expect(homeTab).toContain("onOpenNutrition: () => setActiveTab('nutrition')")
    expect(dailyStatus).toContain("? onOpenNutrition")
    expect(`${dailyStatus}\n${home}`).not.toMatch(/meal|supabase|\.from\(|\.insert\(/i)
  })

  it('keeps Recovery connected to the existing modal', () => {
    expect(home).toContain('onOpenRecovery={() => actions.onOpenRecovery?.()}')
    expect(homeTab).toContain('onOpenRecovery: () => setShowRecoveryModal(true)')
    expect(homeTab).toContain('{showRecoveryModal && (')
    expect(homeTab).toContain('<RecoveryModal')
  })
})
