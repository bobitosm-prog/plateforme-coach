import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const domainMap = read('docs/DOMAIN_MAP.md')
const adr = read('docs/adr/0008-domain-boundaries-and-code-placement.md')
const adrIndex = read('docs/adr/README.md')
const readme = read('README.md')
const onboarding = read('docs/DEVELOPER_ONBOARDING.md')
const ciWorkflow = read('.github/workflows/ci.yml')

describe('domain documentation contract', () => {
  it('keeps the canonical domain map and ADR 0008', () => {
    expect(existsSync(resolve(root, 'docs/DOMAIN_MAP.md'))).toBe(true)
    expect(existsSync(resolve(root, 'docs/adr/0008-domain-boundaries-and-code-placement.md'))).toBe(true)
    expect(adr).toContain('- Statut : accepted')
  })

  it('indexes ADR 0008 exactly once', () => {
    expect(adrIndex.match(/0008-domain-boundaries-and-code-placement\.md/g)).toHaveLength(1)
  })

  it('keeps every local ADR link valid', () => {
    const adrDir = resolve(root, 'docs/adr')
    const files = readdirSync(adrDir).filter(file => file.endsWith('.md'))
    const missing: string[] = []

    for (const file of files) {
      const sourcePath = resolve(adrDir, file)
      const source = readFileSync(sourcePath, 'utf8')
      for (const match of source.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
        const target = match[1]
        if (/^(?:https?:|mailto:)/.test(target)) continue
        if (!existsSync(resolve(dirname(sourcePath), target))) missing.push(`${file} -> ${target}`)
      }
    }

    expect(missing).toEqual([])
  })

  it.each([
    'Auth / profil / onboarding',
    'Coach / client',
    'Training',
    'Nutrition',
    'Progression',
    'Messaging / Realtime',
    'Billing',
    'IA',
    'Médias / Storage',
    'Infrastructure partagée',
  ])('documents the %s domain', domain => {
    expect(domainMap).toContain(`## ${domain}`)
  })

  it('defines the placement direction from adapters to infrastructure', () => {
    for (const layer of [
      'UI / HTTP',
      'orchestration applicative',
      'domaine / services',
      'repositories / ports',
      'Supabase ou fournisseur externe',
    ]) {
      expect(domainMap).toContain(layer)
      expect(adr).toContain(layer)
    }
  })

  it('distinguishes owner, transverse reader and orchestrator', () => {
    expect(domainMap).toContain('**propriétaire**')
    expect(domainMap).toContain('**lecteur transverse**')
    expect(domainMap).toContain('**orchestrateur**')
    expect(domainMap).toContain('sans posséder leurs tables')
  })

  it('links the map and placement ADR from README and onboarding', () => {
    expect(readme).toContain('(docs/DOMAIN_MAP.md)')
    expect(readme).toContain('(docs/adr/0008-domain-boundaries-and-code-placement.md)')
    expect(onboarding).toContain('(DOMAIN_MAP.md)')
    expect(onboarding).toContain('(adr/0008-domain-boundaries-and-code-placement.md)')
  })

  it('references existing principal repository paths', () => {
    for (const path of [
      'app',
      'lib/training',
      'lib/nutrition',
      'lib/progression',
      'lib/coaching/messaging',
      'lib/billing',
      'lib/ai',
      'lib/media',
      'lib/supabase',
      'lib/repositories',
    ]) {
      expect(existsSync(resolve(root, path))).toBe(true)
      expect(domainMap).toContain(`\`${path}/\``)
    }
  })

  it('removes the targeted obsolete implementation statements', () => {
    expect(read('docs/adr/0001-phase-1-security-baseline.md')).not.toContain('Les cinq parcours Chromium')
    expect(read('docs/adr/0005-billing-domain-model.md')).toContain('réconciliation Stripe/base read-only existe désormais')
    expect(read('docs/adr/0006-media-storage-cdn.md')).not.toContain('Un ancien rendu de `progress-photos` utilise `getPublicUrl`')
    expect(read('docs/TRAINING_REPOSITORIES.md')).not.toContain('non branché dans l\'application')
    expect(read('docs/SUPABASE_REPOSITORIES.md')).not.toContain("aucun repository `messages` n'est encore branché")
  })

  it('keeps the still-current exercise video debt explicit', () => {
    expect(read('docs/adr/0006-media-storage-cdn.md')).toContain('`exercise-videos` produit aujourd’hui une URL publique')
    expect(domainMap).toContain('feedback vidéo utilise encore une URL publique')
  })

  it('does not weaken session, RLS or repository boundaries', () => {
    expect(adr).toContain('La session serveur établit l\'identité')
    expect(adr).toMatch(/la RLS reste\s+une frontière obligatoire/)
    expect(adr).toContain('ne crée pas arbitrairement un client')
    expect(`${domainMap}\n${adr}`).not.toMatch(/RLS (?:est )?optionnelle|identifiant du navigateur fait autorité/i)
  })

  it('keeps application code and migrations outside this documentation guard without enabling deployment CI', () => {
    expect(existsSync(resolve(root, '.github/workflows/ci.yml'))).toBe(true)
    expect(domainMap).not.toMatch(/créer une migration|ajouter un workflow CI/i)
    expect(adr).toContain("n'impose aucun déplacement mécanique immédiat du legacy")
    expect(ciWorkflow).not.toMatch(/--prod|VERCEL_ENV|deploy|db push|migration repair/i)
  })

  it('makes the four placement review cases explicit', () => {
    for (const example of [
      '### Nouvelle logique Auth',
      '### Nouvelle fonctionnalité Training',
      '### Changement Billing',
      '### Dashboard coach multi-domaines',
    ]) expect(domainMap).toContain(example)
  })
})
