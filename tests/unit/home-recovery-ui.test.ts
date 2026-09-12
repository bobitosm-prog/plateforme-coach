import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { selectInitialRecoveryZone } from '@/app/components/home/modals/RecoveryModal'
import type { MuscleRecovery } from '@/lib/home/recovery-model'

const read = (path: string) => readFileSync(path, 'utf8')

function zone(overrides: Partial<MuscleRecovery>): MuscleRecovery {
  return {
    zone: 'chest',
    status: 'probably_ready',
    lastWorkedAt: '2026-09-10T12:00:00.000Z',
    elapsedHours: 48,
    window: { minHours: 24, maxHours: 36 },
    setCount: 3,
    exercises: ['Bench press'],
    confidence: 'high',
    source: 'exercise_metadata',
    medianRir: 2,
    ...overrides,
  }
}

describe('Home recovery interface', () => {
  it('opens the recovery dialog from the DailyStatus card', () => {
    const dailyStatus = read('app/components/home-v2/DailyStatus.tsx')
    const home = read('app/components/home-v2/HomeV2.tsx')
    const tab = read('app/components/tabs/HomeTab.tsx')

    expect(dailyStatus).toContain('aria-haspopup="dialog"')
    expect(dailyStatus).toContain('onClick={onOpenRecovery}')
    expect(home).toContain('onOpenRecovery={() => actions.onOpenRecovery?.()}')
    expect(tab).toContain('onOpenRecovery: () => setShowRecoveryModal(true)')
  })

  it('selects the most restrictive muscle initially', () => {
    expect(selectInitialRecoveryZone([
      zone({ zone: 'chest', status: 'probably_ready' }),
      zone({ zone: 'back', status: 'recovering' }),
      zone({ zone: 'quadriceps', status: 'leave_alone' }),
    ])).toBe('quadriceps')
  })

  it('keeps the dialog, SVG controls and equivalent list accessible', () => {
    const modal = read('app/components/home/modals/RecoveryModal.tsx')
    const css = read('app/components/home/modals/RecoveryModal.module.css')

    expect(modal).toContain('role="dialog"')
    expect(modal).toContain('aria-modal="true"')
    expect(modal).toContain('useFocusTrap')
    expect(modal).toContain('role="button"')
    expect(modal).toContain('onKeyDown={onKeyDown}')
    expect(modal).toContain('aria-pressed={selectedZone?.zone === zone.zone}')
    expect(css).toMatch(/\.accessibleList button\s*\{[^}]*min-height:\s*48px/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('uses the audited front and back WebP assets without a recovery percentage', () => {
    const modal = read('app/components/home/modals/RecoveryModal.tsx')

    expect(modal).toContain('/images/recovery/body-${side}.webp')
    expect(modal).not.toMatch(/score|percent|%/i)
  })

  it('receives the optimistic workout refresh after a session is completed', () => {
    const dashboard = read('app/hooks/useClientDashboard.ts')
    const homeTab = read('app/components/tabs/HomeTab.tsx')

    expect(dashboard).toContain('setWSessions(previous => [completedSession')
    expect(homeTab).toContain('recovery={homeModel.recovery}')
  })
})
