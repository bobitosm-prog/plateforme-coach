import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const history = read('app/components/training/RecentSessionsList.tsx')
const historyStyles = read('app/components/training/RecentSessionsList.module.css')
const sheet = read('app/components/training-v2/TrainingSheet.tsx')
const sheetStyles = read('app/components/training-v2/TrainingV2.module.css')
const railOverlay = read('app/components/ui/RailOverlay.tsx')
const designTokens = read('lib/design-tokens.ts')

describe('Training V2 history modal layout', () => {
  it('escapes the transformed tab rail and blocks background navigation', () => {
    expect(history).toContain("import { RailOverlay } from '../ui/RailOverlay'")
    expect(history).toMatch(/showFullHistory && \(\s*<RailOverlay>/)
    expect(history).toContain('<TrainingSheet viewportContained')
    expect(railOverlay).toContain('createPortal(children, document.body)')
    expect(railOverlay).toContain('overlayStore.register()')
    expect(railOverlay).toContain('overlayStore.unregister()')
  })

  it('covers the viewport above the bottom navigation and floating UI', () => {
    expect(sheetStyles).toMatch(/\.sheetBackdrop\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;/)
    expect(sheetStyles).toMatch(/\.viewportSheetBackdrop\s*\{[\s\S]*?z-index:\s*1100;/)
    expect(designTokens).toMatch(/Z_FAB\s*=\s*900/)
    expect(designTokens).toMatch(/Z_NAV\s*=\s*999/)
  })

  it('contains the sheet within the real viewport and safe area', () => {
    expect(sheetStyles).toMatch(/\.viewportTrainingSheet\s*\{[\s\S]*?width:\s*min\(calc\(100vw - 24px\), 560px\);/)
    expect(sheetStyles).toMatch(/\.viewportTrainingSheet\s*\{[\s\S]*?max-width:\s*calc\(100vw - 24px\);/)
    expect(sheetStyles).toMatch(/\.viewportTrainingSheet\s*\{[\s\S]*?max-height:\s*calc\(100dvh - env\(safe-area-inset-top, 0px\) - 12px\);/)
    expect(sheetStyles).toMatch(/\.trainingSheetBody\s*\{[\s\S]*?overflow-y:\s*auto;[\s\S]*?safe-area-inset-bottom/)
    expect(sheetStyles).toMatch(/\.viewportTrainingSheet \.trainingSheetBody\s*\{[\s\S]*?overflow-x:\s*hidden;/)
  })

  it('limits horizontal scrolling to an accessible filter rail', () => {
    expect(historyStyles).toMatch(/\.historyContent\s*\{[\s\S]*?overflow-x:\s*hidden;/)
    expect(historyStyles).toMatch(/\.filterRail\s*\{[\s\S]*?overflow-x:\s*auto;[\s\S]*?overflow-y:\s*hidden;[\s\S]*?overscroll-behavior-x:\s*contain;/)
    expect(historyStyles).toMatch(/\.filterButton\s*\{[\s\S]*?min-height:\s*44px;[\s\S]*?white-space:\s*nowrap;/)
    expect(history).toContain('aria-pressed={active}')
    expect(history).toContain("scrollIntoView({ block: 'nearest', inline: 'nearest' })")
  })

  it('keeps dialog, close, focus, keyboard and scroll-lock contracts', () => {
    expect(sheet).toContain('role="dialog"')
    expect(sheet).toContain('aria-modal="true"')
    expect(sheet).toContain('aria-labelledby={titleId}')
    expect(sheet).toContain("aria-label={t('closeTools')}")
    expect(sheet).toContain("document.body.style.overflow = 'hidden'")
    expect(sheet).toContain("event.key === 'Escape'")
    expect(sheet).toContain("event.key !== 'Tab'")
    expect(sheet).toContain('closeRef.current?.focus()')
    expect(sheet).toContain('previousFocus?.focus()')
  })

  it('preserves history bounds, filters and data ownership', () => {
    expect(history).toContain('workoutHistory.slice(0, 3)')
    expect(history).toContain('filtered.slice(0, 20)')
    expect(history).toContain("if (historyFilter === 'all') return true")
    expect(history).toContain('resolveSessionType(session.name)')
    expect(history).not.toMatch(/supabase|createBrowserClient|\.from\(|\.rpc\(|fetch\(/i)
  })
})
