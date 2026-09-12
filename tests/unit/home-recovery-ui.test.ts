import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { selectInitialRecoveryZone } from '@/app/components/home/modals/RecoveryModal'
import { RECOVERY_BODY_ASSETS, RECOVERY_MASK_ASSETS } from '@/lib/home/recovery-mask-assets'
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

  it('renders the v2 neutral bodies and all pixel-aligned mask assets', () => {
    const modal = read('app/components/home/modals/RecoveryModal.tsx')
    const css = read('app/components/home/modals/RecoveryModal.module.css')
    const frontAsset = readFileSync(`public${RECOVERY_BODY_ASSETS.front}`)
    const backAsset = readFileSync(`public${RECOVERY_BODY_ASSETS.back}`)

    expect(modal).toContain('src={RECOVERY_BODY_ASSETS[side]}')
    expect(modal).toContain('RECOVERY_MASK_ASSETS.filter(asset => asset.view === side)')
    expect(RECOVERY_MASK_ASSETS).toHaveLength(11)
    expect(new Set(RECOVERY_MASK_ASSETS.map(asset => `${asset.view}:${asset.zone}`))).toHaveLength(11)
    expect(modal).toContain('viewBox="0 0 611 1286"')
    expect(modal).toContain("data-status={zone?.status ?? 'unknown'}")
    expect(modal).toContain('className={styles.hitArea}')
    expect(modal).toContain('data-hit-area="true"')
    expect(modal).toContain('data-region={shape.regions?.[index]}')
    expect(modal).not.toContain('zoneShape')
    expect(modal).not.toContain('data-visual-shape')
    expect(modal).toContain("if (status === 'unknown') return null")
    expect(modal).toContain('focusable="false"')
    expect(modal.indexOf('<div className={styles.content}>')).toBeLessThan(modal.indexOf("t('loadingCopy')"))
    expect(css).toMatch(/\.zone\[data-status='unknown'\][^{]*\{[^}]*pointer-events:\s*none/)
    expect(css).toMatch(/\.hitArea\s*\{[^}]*fill:\s*transparent[^}]*stroke:\s*transparent/)
    expect(css).toMatch(/\.hitArea\s*\{[^}]*stroke-opacity:\s*0[^}]*opacity:\s*0[^}]*pointer-events:\s*all/)
    expect(css).toMatch(/\.maskLayer\s*\{[^}]*mask-image:\s*var\(--recovery-mask-image\)/)
    expect(css).toMatch(/\.maskLayer\s*\{[^}]*-webkit-mask-image:\s*var\(--recovery-mask-image\)/)
    expect(css).toMatch(/\.maskLayer\s*\{[^}]*mask-size:\s*100% 100%/)
    expect(css).toMatch(/\.maskLayer\s*\{[^}]*-webkit-mask-size:\s*100% 100%/)
    expect(css).toMatch(/\.maskLayer\s*\{[^}]*mask-repeat:\s*no-repeat/)
    expect(css).toMatch(/\.maskLayer\s*\{[^}]*-webkit-mask-repeat:\s*no-repeat/)
    expect(css).toMatch(/\.maskLayer\s*\{[^}]*mask-position:\s*0 0/)
    expect(css).toMatch(/\.maskLayer\s*\{[^}]*-webkit-mask-position:\s*0 0/)
    expect(css).not.toMatch(/\.bodyImage\s*\{[^}]*object-position:/)
    expect(css).toMatch(/\.maskLayer\[data-status='leave_alone'\]\s*\{[^}]*background:\s*rgba\(239,68,68/)
    expect(css).toMatch(/\.maskLayer\[data-status='recovering'\]\s*\{[^}]*background:\s*rgba\(249,115,22/)
    expect(css).toMatch(/\.maskLayer\[data-status='probably_ready'\]\s*\{[^}]*background:\s*rgba\(34,197,94/)
    expect(css).not.toMatch(/\.zone(?::|\[)[^{]*\{[^}]*(?:fill|stroke):\s*(?!transparent)/)
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
