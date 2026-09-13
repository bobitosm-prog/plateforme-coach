import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const chat = readFileSync('app/api/chat-ai/route.ts', 'utf8')
const weekly = readFileSync('lib/weekly-diagnostic/generator.ts', 'utf8')

describe('Athena service boundaries', () => {
  it('does not expose provider configuration failures', () => {
    expect(chat).not.toContain("error: 'API key manquante'")
    expect(weekly).not.toContain("error: 'API key manquante'")
  })
  it('does not impersonate human professional experience', () => {
    expect(weekly).not.toMatch(/20 ans d'expérience/i)
  })
  it('does not request hidden reasoning', () => {
    expect(weekly).not.toMatch(/chain-of-thought|pense étape par étape/i)
  })
  it('identifies Athena transparently as a digital coach', () => {
    expect(chat).toContain('coach numérique MoovX')
    expect(chat).not.toContain("ne mentionne JAMAIS l'IA")
  })
})
