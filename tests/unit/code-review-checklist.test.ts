import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../..')
const checklistPath = resolve(repositoryRoot, 'docs/CODE_REVIEW_CHECKLIST.md')
const contributingPath = resolve(repositoryRoot, 'docs/CONTRIBUTING.md')
const checklist = readFileSync(checklistPath, 'utf8')
const contributing = readFileSync(contributingPath, 'utf8')

describe('code review checklist contract', () => {
  it('keeps one canonical checklist linked from the contribution guide', () => {
    expect(existsSync(checklistPath)).toBe(true)
    expect(contributing).toContain('(CODE_REVIEW_CHECKLIST.md)')
    expect(contributing).toContain('self-review')
  })

  it.each([
    '## 1. Périmètre et intention',
    '## 2. Architecture',
    '## 3. Sécurité et autorisation',
    '## 4. Données / Supabase / migrations',
    '## 5. Secrets et confidentialité',
    '## 6. Tests',
    '## 7. UI / UX',
    '## 8. Performance',
    '## 9. Exploitation',
    '## 10. Documentation et Git',
  ])('requires the reviewer section %s', section => {
    expect(checklist).toContain(section)
  })

  it('requires justified N/A decisions and stays separate from CI gates', () => {
    expect(checklist).toContain('Toute case `N/A` comporte une justification explicite')
    expect(checklist).toContain('ne remplace pas les quality gates CI')
    expect(contributing).toContain('chaque case `N/A` exige une justification')
  })

  it('links to the canonical contribution, testing, release, rollback and ADR contracts', () => {
    for (const reference of [
      '(CONTRIBUTING.md)',
      '(TESTING_STRATEGY.md)',
      '(RELEASE_PROCEDURE.md)',
      '(ROLLBACK_PROCEDURE.md)',
      '(adr/README.md)',
    ]) {
      expect(checklist).toContain(reference)
    }
  })

  it('requires a structured reviewer verdict and evidence summary', () => {
    expect(checklist).toContain('## Résumé reviewer')
    expect(checklist).toContain('`APPROVE` / `REQUEST_CHANGES` / `BLOCKED`')
    expect(checklist).toContain('Risques résiduels')
    expect(checklist).toContain('Preuves principales')
  })

  it('does not weaken server authority, RLS, secrets or executed-test evidence', () => {
    expect(checklist).toContain("L'identité et l'autorisation sont vérifiées côté serveur")
    expect(checklist).toContain('La RLS reste une frontière obligatoire')
    expect(checklist).toContain('Aucun secret')
    expect(checklist).toContain('les tests réellement exécutés et leurs résultats sont fournis')
    expect(checklist).not.toMatch(/RLS (?:est )?optionnelle|frontend (?:seul )?fait autorité/i)
    expect(checklist).not.toMatch(/secrets? (?:sont )?tolérés?|tests? (?:sont )?facultatifs?/i)
  })

  it('does not introduce repository governance or CI infrastructure in this sub-batch', () => {
    expect(existsSync(resolve(repositoryRoot, 'CODEOWNERS'))).toBe(false)
    expect(existsSync(resolve(repositoryRoot, '.github/CODEOWNERS'))).toBe(false)
    expect(existsSync(resolve(repositoryRoot, '.github/workflows'))).toBe(false)
    expect(existsSync(resolve(repositoryRoot, '.github/pull_request_template.md'))).toBe(false)
    expect(existsSync(resolve(repositoryRoot, '.github/PULL_REQUEST_TEMPLATE'))).toBe(false)
  })
})
