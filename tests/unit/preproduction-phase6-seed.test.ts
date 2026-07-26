import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  buildPhase6SeedSql,
  phase6PlanFixtures,
} from '../../scripts/preproduction/generate-phase6-seed.mjs'
import {
  executePhase6SeedPlan,
  verifyPhase6SeedAuthority,
  withTemporaryPhase6SeedWorkdir,
} from '../../scripts/preproduction/apply-phase6-seed.mjs'
import {
  readClientMealPlanRow,
  readMealPlanRow,
} from '../../lib/nutrition/plan-envelope/read'

const root = process.cwd()
const manifestSource = readFileSync(
  resolve(root, 'scripts/preproduction/phase6-seed-manifest.json'),
  'utf8',
)
const fixtureSource = readFileSync(
  resolve(root, 'scripts/preproduction/phase6-seed.sql'),
  'utf8',
)
const lockSource = readFileSync(
  resolve(root, 'scripts/preproduction/phase6-seed-lock.json'),
  'utf8',
)
const manifest = JSON.parse(manifestSource) as {
  personas: Array<{ role: string; email: string }>
  notFoundOwnerKey: string
  personalPlans: Array<{ ownerKey: string }>
  failureCase: string
}
const lock = JSON.parse(lockSource)
const sha256 = (source: string) =>
  createHash('sha256').update(source).digest('hex')

describe('Phase 6 deterministic synthetic staging seed', () => {
  it('pins the approved target, volumes and exact SHA-256 authority', () => {
    const result = verifyPhase6SeedAuthority({
      manifestSource,
      fixtureSource,
      lockSource,
    })

    expect(result).toMatchObject({
      status: 'ok',
      projectRef: 'cycbnnojcymjnaqomlyj',
      namespace: '76000000',
      historyCountRequired: 138,
      owners: { admin: 1, coach: 1, clients: 7, foreign: 0 },
      containsPassword: false,
      containsStripeId: false,
      containsProductionUrl: false,
    })
    expect(sha256(manifestSource)).toBe(lock.manifestSha256)
    expect(sha256(fixtureSource)).toBe(lock.fixtureSha256)
    expect(buildPhase6SeedSql(manifest)).toBe(fixtureSource)
  })

  it('contains only synthetic identities and no production or Stripe authority', () => {
    expect(manifest.personas).toHaveLength(9)
    expect(manifest.personas.filter(row => row.role === 'super_admin')).toHaveLength(1)
    expect(manifest.personas.filter(row => row.role === 'coach')).toHaveLength(1)
    expect(manifest.personas.filter(row => row.role === 'client')).toHaveLength(7)
    expect(manifest.personas.every(row =>
      row.email.endsWith('@moovx.invalid'),
    )).toBe(true)

    const combined = `${manifestSource}\n${fixtureSource}`
    expect(combined).not.toContain('njlzossopgknanhkzcbk')
    expect(combined).not.toContain('app.moovx.ch')
    expect(combined).not.toMatch(/\b(?:sk_live|pk_live|cus_|sub_|acct_|whsec_)/)
    expect(combined).not.toMatch(/encrypted_password|password\s*=/i)
    expect(fixtureSource).not.toMatch(/\bDELETE\b/)
  })

  it('covers canonical and every supported legacy reader outcome', () => {
    const fixtures = phase6PlanFixtures()
    const expected = {
      canonical: 'canonical',
      legacy: 'legacy_converted',
      conflict: 'conflict',
      invalid: 'invalid',
      legacy_unsupported: 'legacy_unsupported',
    } as const

    for (const [fixture, status] of Object.entries(expected)) {
      expect(readMealPlanRow({
        id: `plan-${fixture}`,
        user_id: 'owner',
        plan: fixtures[fixture as keyof typeof fixtures],
        active: true,
      }).status).toBe(status)
    }
    expect(readClientMealPlanRow({
      id: 'coach-plan',
      client_id: 'client',
      coach_id: 'coach',
      plan: fixtures.canonical,
    }).status).toBe('canonical')
    expect(manifest.notFoundOwnerKey).toBe('clientNotFound')
    expect(manifest.personalPlans.some(row =>
      row.ownerKey === manifest.notFoundOwnerKey,
    )).toBe(false)
    expect(manifest.failureCase).toBe('runner_injection_only')
  })

  it('is namespace-idempotent and transactionally fail-closed', () => {
    expect(fixtureSource.startsWith(
      '-- Generated from phase6-seed-manifest.json.',
    )).toBe(true)
    expect(fixtureSource).toContain('\nBEGIN;\n')
    expect(fixtureSource).toContain('\nCOMMIT;\n')
    expect(fixtureSource.match(/ON CONFLICT/g)?.length).toBe(8)
    expect(fixtureSource).toContain("SET LOCAL statement_timeout = '60s'")
    expect(fixtureSource).toContain('phase6 foreign meal plan owner')

    const body = buildPhase6SeedSql(manifest, { transaction: false })
    expect(body).not.toContain('\nBEGIN;\n')
    expect(body).not.toContain('\nCOMMIT;\n')
  })

  it('always dry-runs first and applies at most once', () => {
    const execute = vi.fn((_root: string, options: { dryRun: boolean }) => ({
      exitCode: 0,
      output: options.dryRun ? 'dry-run' : 'apply',
      errorOutput: '',
    }))

    expect(executePhase6SeedPlan('/tmp/work', execute, { apply: true }))
      .toMatchObject({ executionCount: 1 })
    expect(execute.mock.calls.map(call => call[1])).toEqual([
      { dryRun: true },
      { dryRun: false },
    ])
  })

  it('does not apply when the mandatory dry-run fails', () => {
    const execute = vi.fn(() => {
      throw new Error('injected dry-run failure')
    })
    expect(() =>
      executePhase6SeedPlan('/tmp/work', execute, { apply: true }),
    ).toThrow('injected dry-run failure')
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('removes the private temporary workdir even after failure', () => {
    let workdir = ''
    expect(() =>
      withTemporaryPhase6SeedWorkdir({
        repositoryRoot: root,
        fixtureSource,
        execute(candidate: string) {
          workdir = candidate
          expect(existsSync(candidate)).toBe(true)
          throw new Error('injected execution failure')
        },
      }),
    ).toThrow('injected execution failure')
    expect(existsSync(workdir)).toBe(false)
  })
})
