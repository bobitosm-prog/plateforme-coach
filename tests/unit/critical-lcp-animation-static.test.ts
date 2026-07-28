import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hero = readFileSync('app/[locale]/landing/components/Hero.tsx', 'utf8')
const heroAnimation = readFileSync('app/[locale]/landing/components/HeroAnimation.tsx', 'utf8')
const login = readFileSync('app/login/LoginPageContent.tsx', 'utf8')

function openingTag(source: string, marker: string) {
  const markerIndex = source.indexOf(marker)
  expect(markerIndex).toBeGreaterThan(-1)
  const start = source.lastIndexOf('<', markerIndex)
  const end = source.indexOf('>', markerIndex)
  return source.slice(start, end + 1)
}

describe('critical LCP animation guards', () => {
  it('keeps the landing headline and description immediately visible', () => {
    for (const marker of [
      'data-lcp-content="landing-headline"',
      'data-lcp-content="landing-description"',
    ]) {
      expect(openingTag(hero, marker)).not.toMatch(/animation|opacity|transform|hero-content-animate/)
    }

    expect(hero).not.toContain('.hero-content-animate {')
  })

  it('keeps both login titles outside blocking reveal animations', () => {
    expect(login).toMatch(
      /<div className="login-lcp-content">\s*<h1 data-lcp-content="login-forgot-title"/,
    )
    expect(login).toMatch(
      /<div className="login-lcp-content">\s*<h1 data-lcp-content="login-title"/,
    )

    for (const marker of [
      'data-lcp-content="login-forgot-title"',
      'data-lcp-content="login-title"',
    ]) {
      expect(openingTag(login, marker)).not.toMatch(/animation|opacity|transform/)
    }
  })

  it('retains secondary motion and disables it for reduced motion', () => {
    expect(hero).toContain('.hero-content-animate-delay { animation:')
    expect(hero).toContain('.hero-content-animate-delay2 { animation:')
    expect(login).toContain("animation: 'fadeUp 0.7s 0.1s")

    expect(hero).toContain('@media (prefers-reduced-motion: reduce)')
    expect(heroAnimation).toContain("matchMedia('(prefers-reduced-motion: reduce)')")
    expect(login).toContain('@media(prefers-reduced-motion:reduce)')
  })
})
