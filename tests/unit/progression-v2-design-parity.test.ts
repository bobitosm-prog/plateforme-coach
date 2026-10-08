import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('uses the active compact Analytics styles and shared Home title', () => {
  const shell = readFileSync('app/components/progression-v2/ProgressionV2.tsx', 'utf8')
  const css = readFileSync('app/components/progression-v2/AnalyticsCompact.module.css', 'utf8')
  expect(shell).toContain('className={homeStyles.title}')
  expect(shell).toContain('./AnalyticsCompact.module.css')
  expect(css).toContain('font-family: var(--font-body), sans-serif')
  expect(css).toContain('background: #211f18')
  expect(css).toContain('@media (max-width: 380px)')
  expect(css).toContain(':focus-visible')
  expect(css).toContain('min-height: 44px')
})
