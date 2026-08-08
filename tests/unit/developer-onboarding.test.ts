import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../..')
const onboardingPath = resolve(repositoryRoot, 'docs/DEVELOPER_ONBOARDING.md')
const readme = readFileSync(resolve(repositoryRoot, 'README.md'), 'utf8')
const contributing = readFileSync(resolve(repositoryRoot, 'docs/CONTRIBUTING.md'), 'utf8')
const onboarding = readFileSync(onboardingPath, 'utf8')
const packageJson = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
) as { scripts: Record<string, string> }

describe('developer onboarding contract', () => {
  it('keeps one canonical guide linked from README and CONTRIBUTING', () => {
    expect(existsSync(onboardingPath)).toBe(true)
    expect(readme).toContain('(docs/DEVELOPER_ONBOARDING.md)')
    expect(contributing).toContain('(DEVELOPER_ONBOARDING.md)')
  })

  it('keeps the required title and sixteen ordered sections', () => {
    expect(onboarding).toContain('# Developer Onboarding — MoovX')
    const headings = Array.from(onboarding.matchAll(/^## (\d+)\. /gm), match => Number(match[1]))
    expect(headings).toEqual(Array.from({ length: 16 }, (_, index) => index + 1))
  })

  it('uses the supported webpack development entrypoint', () => {
    expect(onboarding).toContain('npm run dev:webpack')
    expect(readme).toContain('npm run dev:webpack')
    expect(onboarding).not.toMatch(/```[\s\S]*?\bnpm run dev\s*(?:\n|$)/)
    expect(readme).not.toMatch(/\bnpm run dev\s*(?:\n|$)/)
  })

  it('mentions only npm run commands declared in package.json', () => {
    const documents = `${onboarding}\n${readme}`
    const commands = Array.from(documents.matchAll(/npm run ([a-z0-9:.-]+)/g), match => match[1])
    expect(commands.length).toBeGreaterThan(0)
    for (const command of commands) expect(packageJson.scripts).toHaveProperty(command)
  })

  it('documents machine prerequisites without freezing observed versions', () => {
    for (const prerequisite of ['Node.js', 'npm', 'Docker', 'psql', 'CLI Supabase', 'Playwright', 'Chromium']) {
      expect(onboarding).toContain(prerequisite)
    }
    expect(onboarding).toContain('package.json')
  })

  it('distinguishes application and E2E environment files', () => {
    expect(onboarding).toContain('`.env.local`')
    expect(onboarding).toContain('`.env.e2e.local`')
    expect(onboarding).toContain('réservé aux E2E')
    expect(onboarding).toContain('`.env.example`')
  })

  it('keeps the first account local and separate from fixtures', () => {
    expect(onboarding).toContain('aucun compte développeur persistant')
    expect(onboarding).toContain('Ils ne sont pas des\ncomptes de développement')
    expect(onboarding).toContain('Aucun identifiant admin ou mot de passe partagé')
  })

  it('forbids linked and global remote migration commands', () => {
    expect(onboarding).toContain('`--linked`')
    expect(onboarding).toContain('`supabase db push`')
    expect(onboarding).toContain('interdites')
  })

  it('does not require Production or staging for onboarding', () => {
    expect(onboarding).toContain('aucun accès staging ou Production')
    expect(readme).toContain("Aucun accès staging ou\nProduction n'est nécessaire")
  })

  it('links the canonical testing and contribution contracts', () => {
    for (const reference of [
      '(TESTING_STRATEGY.md)',
      '(TEST_FIXTURES.md)',
      '(CONTRIBUTING.md)',
      '(CODE_REVIEW_CHECKLIST.md)',
    ]) expect(onboarding).toContain(reference)
  })

  it('links architecture, release and rollback authorities', () => {
    expect(onboarding).toContain('(adr/README.md)')
    expect(onboarding).toContain('(RELEASE_PROCEDURE.md)')
    expect(onboarding).toContain('(ROLLBACK_PROCEDURE.md)')
  })

  it('documents the local smoke routes and Mailpit', () => {
    expect(onboarding).toContain('http://127.0.0.1:3000/login')
    expect(onboarding).toContain('http://127.0.0.1:3000/fr/landing')
    expect(onboarding).toContain('http://127.0.0.1:55324')
  })

  it('documents the minimal repository and architecture map', () => {
    for (const directory of ['`app/`', '`lib/`', '`supabase/`', '`scripts/`', '`tests/`', '`e2e/`', '`docs/`']) {
      expect(onboarding).toContain(directory)
    }
    expect(onboarding).toContain('RLS reste la frontière')
  })

  it('keeps a concrete first-day checklist', () => {
    expect(onboarding).toContain('## 16. Checklist premier jour')
    expect(onboarding.match(/^- \[ \]/gm)?.length).toBeGreaterThanOrEqual(10)
  })

  it('removes create-next-app boilerplate from README', () => {
    expect(readme).toContain('# MoovX')
    expect(readme).not.toMatch(/create-next-app|Geist|editing `app\/page\.tsx`|Learn Next\.js/i)
  })

  it('keeps the critical suite documented as fifteen local journeys', () => {
    expect(onboarding).toContain('exécute 15 parcours')
    expect(contributing).toContain('15/15 parcours')
    expect(contributing).not.toContain('invitation, checkout plateforme, checkout coach, push et chat')
  })
})
