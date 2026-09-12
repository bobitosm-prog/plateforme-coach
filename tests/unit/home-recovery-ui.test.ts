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
    expect(modal).toContain("role={zone ? 'button' : undefined}")
    expect(modal).toContain('onKeyDown={zone ? onKeyDown : undefined}')
    expect(modal).toContain('aria-pressed={selectedZone?.zone === zone.zone}')
    expect(css).toMatch(/\.accessibleList button\s*\{[^}]*min-height:\s*48px/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('uses neutral anatomical WebP assets with overlays available in every state', () => {
    const modal = read('app/components/home/modals/RecoveryModal.tsx')
    const css = read('app/components/home/modals/RecoveryModal.module.css')
    const frontAsset = readFileSync('public/images/recovery/body-front-anatomical.webp')
    const backAsset = readFileSync('public/images/recovery/body-back-anatomical.webp')

    expect(modal).toContain('/images/recovery/body-${side}-anatomical.webp')
    expect(modal).toContain('viewBox="0 0 611 1286"')
    expect(modal).toContain("data-status={zone?.status ?? 'unknown'}")
    expect(modal).toContain('className={styles.hitArea}')
    expect(modal).toContain('className={styles.zoneShape}')
    expect(modal).toContain('focusable="false"')
    expect(modal.indexOf('<div className={styles.content}>')).toBeLessThan(modal.indexOf("t('loadingCopy')"))
    expect(css).toMatch(/\.zone\[data-status='unknown'\][^{]*\{[^}]*pointer-events:\s*none/)
    expect(css).toMatch(/\.hitArea\s*\{[^}]*fill:\s*transparent[^}]*stroke:\s*transparent/)
    expect(css).toMatch(/\.hitArea\s*\{[^}]*stroke-opacity:\s*0[^}]*opacity:\s*0[^}]*pointer-events:\s*all/)
    expect(css).toMatch(/\.zone\[data-status='unknown'\] \.zoneShape\s*\{[^}]*fill:\s*transparent[^}]*stroke:\s*transparent/)
    expect(css).not.toMatch(/\.zone\[data-status='unknown'\][^{]*\{[^}]*#[0-9a-f]{3,8}/i)
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\)\s*\{[^}]*\.zone:hover \.zoneShape/)
    expect(css).toMatch(/\.zone\[data-selected='true'\] \.zoneShape\s*\{[^}]*fill-opacity:[^}]*\}/)
    expect(css).not.toMatch(/\.zone\[data-selected='true'\] \.zoneShape\s*\{[^}]*stroke:/)
    expect(css).toMatch(/\.bodyOverlay \.zone:focus-visible\s*\{[^}]*outline:\s*none/)
    expect(frontAsset.subarray(0, 4).toString()).toBe('RIFF')
    expect(backAsset.subarray(0, 4).toString()).toBe('RIFF')
    expect(frontAsset.byteLength).toBeGreaterThan(0)
    expect(backAsset.byteLength).toBeGreaterThan(0)
    expect(modal).not.toMatch(/score|percent|%/i)
  })

  it('receives the optimistic workout refresh after a session is completed', () => {
    const dashboard = read('app/hooks/useClientDashboard.ts')
    const homeTab = read('app/components/tabs/HomeTab.tsx')

    expect(dashboard).toContain('setWSessions(previous => [completedSession')
    expect(homeTab).toContain('recovery={homeModel.recovery}')
  })
})
