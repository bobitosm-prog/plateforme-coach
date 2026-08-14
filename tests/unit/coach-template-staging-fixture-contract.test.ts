import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { prepareCoachTemplatePageForServing } from '../../lib/training/coexistence/coach-template-serving-contract'
import {
  COACH_TEMPLATE_STAGING_FIXTURE_COUNT,
  COACH_TEMPLATE_STAGING_FIXTURE_NAME_PREFIX,
  buildCoachTemplateStagingFixtureRows,
  evaluateCoachTemplateFixtureCleanupCount,
  evaluateCoachTemplateFixtureCreationCounts,
  resolveCoachTemplateStagingFixture,
} from '../fixtures/coach-template-staging-assessment'

const stagingTarget = {
  applicationEnvironment: 'staging',
  deploymentEnvironment: 'preview',
  branch: 'phase-6-staging',
  projectRef: 'cycbnnojcymjnaqomlyj',
}

describe('coach-template staging fixture contract', () => {
  it('resolves only for the exact staging preview authority and rejects Production', () => {
    expect(resolveCoachTemplateStagingFixture(stagingTarget).ok).toBe(true)
    for (const rejected of [
      { ...stagingTarget, applicationEnvironment: 'production' },
      { ...stagingTarget, deploymentEnvironment: 'production' },
      { ...stagingTarget, branch: 'main' },
      { ...stagingTarget, projectRef: 'njlzossopgknanhkzcbk' },
      { ...stagingTarget, projectRef: '' },
    ]) {
      expect(resolveCoachTemplateStagingFixture(rejected)).toEqual({
        ok: false,
        reason: 'STAGING_TARGET_REJECTED',
      })
    }
  })

  it('builds exactly 17 deterministic minimal templates in one synthetic namespace', () => {
    const first = buildCoachTemplateStagingFixtureRows()
    const second = buildCoachTemplateStagingFixtureRows()
    expect(first).toEqual(second)
    expect(first).toHaveLength(COACH_TEMPLATE_STAGING_FIXTURE_COUNT)
    expect(new Set(first.map(row => row.id))).toHaveLength(COACH_TEMPLATE_STAGING_FIXTURE_COUNT)
    expect(first.every(row => (
      row.is_template === true
      && row.description === null
      && row.name.startsWith(COACH_TEMPLATE_STAGING_FIXTURE_NAME_PREFIX)
      && row.tags?.length === 1
      && typeof row.program === 'object'
    ))).toBe(true)
    expect(JSON.stringify(first)).not.toMatch(/@|client_programs|custom_programs|workout|session_id|email|phone/i)
  })

  it('binds ownership to the unique approved synthetic coach persona without copying its email', () => {
    const manifest = JSON.parse(readFileSync(
      'scripts/preproduction/phase6-auth-v2-manifest.json',
      'utf8',
    )) as {
      authority: string
      personas: Array<{ id: string; email: string; role: string }>
    }
    const resolution = resolveCoachTemplateStagingFixture(stagingTarget)
    if (!resolution.ok) throw new Error('staging fixture contract expected')
    const coaches = manifest.personas.filter(persona => persona.role === 'coach')
    expect(manifest.authority).toBe(resolution.contract.owner.manifestAuthority)
    expect(coaches).toHaveLength(1)
    expect(coaches[0].id).toBe(resolution.contract.owner.id)
    expect(coaches[0].email.endsWith('@moovx.invalid')).toBe(true)
    expect(JSON.stringify(resolution.contract.rows)).not.toContain(coaches[0].email)
  })

  it('makes every fixture row MATCH and UI-identical under the current serving contract', () => {
    const resolution = resolveCoachTemplateStagingFixture(stagingTarget)
    if (!resolution.ok) throw new Error('staging fixture contract expected')
    const page = { items: resolution.contract.rows, hasMore: false, nextCursor: null }
    const result = prepareCoachTemplatePageForServing(
      page,
      resolution.contract.owner.id,
      'canonical-when-identical',
    )
    expect(result.decisions).toHaveLength(COACH_TEMPLATE_STAGING_FIXTURE_COUNT)
    expect(result.decisions.every(decision => (
      decision.source === 'canonical' && decision.shadowResult === 'MATCH'
    ))).toBe(true)
    expect(result.page.items).toEqual(page.items)
    result.page.items.forEach((row, index) => expect(row).not.toBe(page.items[index]))
  })

  it('pins exact pre/post counts and an idempotent cleanup selector', () => {
    const resolution = resolveCoachTemplateStagingFixture(stagingTarget)
    if (!resolution.ok) throw new Error('staging fixture contract expected')
    expect(resolution.contract.proof).toEqual({
      expectedBeforeCreateCount: 0,
      expectedAfterCreateCount: 17,
      expectedAfterCleanupCount: 0,
    })
    expect(resolution.contract.cleanup).toEqual({
      table: 'training_programs',
      strategy: 'exact-owner-and-id-set',
      ownerId: resolution.contract.owner.id,
      fixtureIds: resolution.contract.rows.map(row => row.id),
      namePrefix: COACH_TEMPLATE_STAGING_FIXTURE_NAME_PREFIX,
      idempotent: true,
    })
    expect(new Set(resolution.contract.cleanup.fixtureIds)).toHaveLength(17)
  })

  it('fails closed on dirty, partial or impossible creation counts', () => {
    expect(evaluateCoachTemplateFixtureCreationCounts(0, 17)).toBe('CREATION_COMPLETE')
    expect(evaluateCoachTemplateFixtureCreationCounts(0, 0)).toBe('CREATION_ROLLED_BACK')
    expect(evaluateCoachTemplateFixtureCreationCounts(0, 8)).toBe('CREATION_PARTIAL_CLEANUP_REQUIRED')
    expect(evaluateCoachTemplateFixtureCreationCounts(1, 17)).toBe('REFUSE_CREATE_DIRTY_NAMESPACE')
    expect(evaluateCoachTemplateFixtureCreationCounts(0, 18)).toBe('COUNT_OUT_OF_CONTRACT')
    expect(evaluateCoachTemplateFixtureCreationCounts(0, 1.5)).toBe('COUNT_OUT_OF_CONTRACT')
  })

  it('makes cleanup repeatable until exact zero and rejects impossible counts', () => {
    expect(evaluateCoachTemplateFixtureCleanupCount(0)).toBe('CLEANUP_COMPLETE')
    expect(evaluateCoachTemplateFixtureCleanupCount(4)).toBe('CLEANUP_PARTIAL_RETRY_REQUIRED')
    expect(evaluateCoachTemplateFixtureCleanupCount(17)).toBe('CLEANUP_PARTIAL_RETRY_REQUIRED')
    expect(evaluateCoachTemplateFixtureCleanupCount(18)).toBe('COUNT_OUT_OF_CONTRACT')
    expect(evaluateCoachTemplateFixtureCleanupCount(-1)).toBe('COUNT_OUT_OF_CONTRACT')
  })

  it('contains no database/network writer and leaves runtime composition untouched', () => {
    const fixture = readFileSync('tests/fixtures/coach-template-staging-assessment.ts', 'utf8')
    const repository = readFileSync('lib/repositories/training/program.ts', 'utf8')
    const hook = readFileSync('app/coach/hooks/useCoachProgramPagination.ts', 'utf8')
    expect(fixture).not.toMatch(/\b(?:client|supabase)\.from\(|\bfetch\(|createClient|\binsert\(|\bupsert\(|\bdelete\(|\bupdate\(/)
    expect(fixture).not.toMatch(/process\.env|VERCEL_ENV|MOOVX_ENVIRONMENT/)
    expect(repository).not.toContain('coach-template-staging-assessment')
    expect(hook).not.toContain('coach-template-staging-assessment')
  })
})
