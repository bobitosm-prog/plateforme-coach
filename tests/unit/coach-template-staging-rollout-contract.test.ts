import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rollout = readFileSync('docs/TRAINING_COACH_TEMPLATE_STAGING_ROLLOUT.md', 'utf8')
const repository = readFileSync('lib/repositories/training/program.ts', 'utf8')
const contract = readFileSync('lib/training/coexistence/coach-template-serving-contract.ts', 'utf8')
const activation = readFileSync('lib/training/coexistence/coach-template-staging-serving-activation.ts', 'utf8')
const hook = readFileSync('app/coach/hooks/useCoachProgramPagination.ts', 'utf8')
const view = readFileSync('app/coach/components/CoachPrograms.tsx', 'utf8')

describe('coach-template staging rollout contract', () => {
  it('keeps the committed runtime fail-closed while leaving hook and UI untouched', () => {
    expect(contract).toContain("COACH_TEMPLATE_SERVING_DEFAULT_MODE = 'legacy-only'")
    expect(repository).toContain('coachTemplateServingControl?.mode ?? COACH_TEMPLATE_SERVING_DEFAULT_MODE')
    expect(repository).toContain('resolveCoachTemplateStagingServingRuntimeControl()')
    expect(activation).not.toMatch(/MOOVX_ENVIRONMENT|VERCEL_ENV|VERCEL_GIT_COMMIT_REF/)
    expect(activation).toContain('NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN')
    expect(hook).not.toContain('createCoachTemplateCanonicalServingValidationControl')
    expect(view).not.toContain('createCoachTemplateCanonicalServingValidationControl')
    expect(hook).not.toContain('createCoachTemplateAssessmentControl')
    expect(view).not.toContain('createCoachTemplateAssessmentControl')
  })

  it('requires staging, preview, branch and explicit mode while refusing Production', () => {
    expect(rollout).toContain('autorité applicative exactement `staging`')
    expect(rollout).toContain('environnement de déploiement exactement `preview`')
    expect(rollout).toContain('branche déployée exactement `phase-6-staging`')
    expect(rollout).toContain('opt-in staging dédié exactement `canonical-when-identical`')
    expect(rollout).toContain('`TECHNICAL_STAGING_GO` valide')
    expect(rollout).toContain('`REAL_CORPUS_VALIDATION_PENDING`')
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

  it('documents bounded activation and same-SHA rollback without remote changes', () => {
    expect(rollout).toMatch(/Aucune variable\s+Vercel ou Supabase distante n'est modifiée/)
    expect(rollout).toContain('NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN')
    expect(rollout).toContain('scope Preview/`phase-6-staging`')
    expect(rollout).toMatch(/redéployer\s+le même SHA/)
    expect(rollout).toMatch(/n'ajoute aucune lecture Supabase/)
  })
})
