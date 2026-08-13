import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rollout = readFileSync('docs/TRAINING_COACH_TEMPLATE_STAGING_ROLLOUT.md', 'utf8')
const repository = readFileSync('lib/repositories/training/program.ts', 'utf8')
const contract = readFileSync('lib/training/coexistence/coach-template-serving-contract.ts', 'utf8')
const hook = readFileSync('app/coach/hooks/useCoachProgramPagination.ts', 'utf8')
const view = readFileSync('app/coach/components/CoachPrograms.tsx', 'utf8')

describe('coach-template staging rollout contract', () => {
  it('keeps the committed runtime fail-closed and free of environment activation', () => {
    expect(contract).toContain("COACH_TEMPLATE_SERVING_DEFAULT_MODE = 'legacy-only'")
    expect(repository).toContain('coachTemplateServingControl?.mode ?? COACH_TEMPLATE_SERVING_DEFAULT_MODE')
    for (const source of [repository, contract, hook, view]) {
      expect(source).not.toMatch(/MOOVX_ENVIRONMENT|VERCEL_ENV|VERCEL_GIT_COMMIT_REF/)
      expect(source).not.toMatch(/NEXT_PUBLIC_.*COACH_TEMPLATE|TRAINING_.*SERVING_MODE/)
    }
    expect(hook).not.toContain('createCoachTemplateCanonicalServingValidationControl')
    expect(view).not.toContain('createCoachTemplateCanonicalServingValidationControl')
    expect(hook).not.toContain('createCoachTemplateAssessmentControl')
    expect(view).not.toContain('createCoachTemplateAssessmentControl')
  })

  it('requires staging, preview, branch and explicit mode while refusing Production', () => {
    expect(rollout).toContain('autorité applicative exactement `staging`')
    expect(rollout).toContain('environnement de déploiement exactement `preview`')
    expect(rollout).toContain('branche déployée exactement `phase-6-staging`')
    expect(rollout).toContain('demande explicite exactement `canonical-when-identical`')
    expect(rollout).toMatch(/refuser `canonical-when-identical` dès qu'une entrée indique\s+`production`/)
  })

  it('defines observable GO, stop and rollback contracts without sensitive payloads', () => {
    for (const field of ['serving_mode', 'served_source', 'fallback_reason']) {
      expect(rollout).toContain(`\`${field}\``)
    }
    for (const result of ['WARNING', 'CRITICAL_MISMATCH', 'UNSUPPORTED', 'PRESENTATION_MISMATCH']) {
      expect(rollout).toContain(`\`${result}\``)
    }
    expect(rollout).toContain('taux de `WARNING` inférieur ou égal à 5 %')
    expect(rollout).toMatch(/au\s+moins 30 minutes d'observation staging/)
    expect(rollout).toMatch(/redéployer\s+le même SHA/)
    expect(rollout).toContain('une seule requête Supabase')
    expect(rollout).toContain('Il ne nécessite aucun revert de migration, backfill ou restauration de donnée.')
    expect(rollout).toContain('Sont interdits : identifiants coach/template')
  })

  it('keeps activation out of the current sub-batch and scopes the future change', () => {
    expect(rollout).toContain("Ce document est un contrat de préparation. Il n'active aucun runtime.")
    expect(rollout).toContain("Le présent document n'autorise ni ce branchement ni un déploiement.")
    expect(rollout).toContain('sans toucher hook/UI')
    expect(rollout).toMatch(/sans ajouter de\s+lecture Supabase/)
  })
})
