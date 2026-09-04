import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const development = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8')
const statistical = readFileSync(
  resolve(root, '.github/workflows/ci-stability-observation.yml'),
  'utf8',
)
const collector = readFileSync(resolve(root, 'scripts/collect-ci-stability-observation.ts'), 'utf8')
const collection = readFileSync(resolve(root, 'lib/ci/stability-collection.ts'), 'utf8')

const job = (workflow: string, name: string, next?: string) => {
  const start = workflow.indexOf(`\n  ${name}:`)
  const end = next ? workflow.indexOf(`\n  ${next}:`, start) : workflow.length
  return workflow.slice(start, end)
}

const steps = (workflowJob: string) => workflowJob.slice(workflowJob.indexOf('    steps:'))

const developmentGates = {
  fast: job(development, 'fast', 'standard'),
  standard: job(development, 'standard', 'database-heavy'),
  'database-heavy': job(development, 'database-heavy', 'browser-heavy'),
  'browser-heavy': job(development, 'browser-heavy'),
}

const statisticalGates = {
  fast: job(statistical, 'fast', 'standard'),
  standard: job(statistical, 'standard', 'database-heavy'),
  'database-heavy': job(statistical, 'database-heavy', 'browser-heavy'),
  'browser-heavy': job(statistical, 'browser-heavy', 'stability-observation'),
}

describe('statistical observation workflow contract', () => {
  it('is manual-only now and rejects targets outside the canonical staging head', () => {
    expect(statistical).toMatch(/^on:\n  workflow_dispatch:/m)
    expect(statistical).not.toMatch(/^\s+schedule:/m)
    expect(statistical).not.toMatch(/^\s+pull_request:/m)
    expect(statistical).not.toMatch(/^\s+push:/m)
    expect(statistical).toContain('observed_sha:')
    expect(statistical).toContain('base_sha:')
    expect(statistical).toContain('DISPATCH_REF: ${{ github.ref }}')
    expect(statistical).toContain('DISPATCH_SHA: ${{ github.sha }}')
    expect(statistical).toContain('refs/heads/phase-6-staging')
    expect(statistical).toContain('^[0-9a-fA-F]{40}$')
    expect(statistical).toContain('git cat-file -e "${candidate}^{commit}"')
    expect(statistical).toContain('"${OBSERVED_SHA,,}" != "${DISPATCH_SHA,,}"')
    expect(statistical).toContain('git merge-base --is-ancestor "$BASE_SHA" "$OBSERVED_SHA"')
  })

  it('serializes observations in a dedicated non-cancelling concurrency group', () => {
    expect(development).toContain(
      'group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}',
    )
    expect(development).toContain('cancel-in-progress: true')
    expect(statistical).toMatch(
      /concurrency:\n  group: phase-9-statistical-observation-v2\n  cancel-in-progress: false/,
    )
    expect(statistical).not.toContain(
      'group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}',
    )
  })

  it('runs all four canonical gate step sequences without reducing coverage', () => {
    expect(Object.keys(statisticalGates)).toEqual(['fast', 'standard', 'database-heavy', 'browser-heavy'])
    for (const gateName of Object.keys(developmentGates) as Array<keyof typeof developmentGates>) {
      expect(statisticalGates[gateName]).toContain('needs: validate-observation-target')
      expect(steps(statisticalGates[gateName])).toBe(steps(developmentGates[gateName]))
    }
  })

  it('collects terminal gate results even after failures using the canonical artifact contract', () => {
    const collectorJob = job(statistical, 'stability-observation')
    expect(collectorJob).toContain('if: ${{ always() }}')
    expect(collectorJob).toContain('needs: [fast, standard, database-heavy, browser-heavy]')
    expect(collectorJob).toContain('node scripts/collect-ci-stability-observation.ts')
    expect(collectorJob).toContain(
      'name: ci-stability-observation-${{ github.run_id }}-attempt-${{ github.run_attempt }}',
    )
    expect(collectorJob).toContain('retention-days: 90')
    expect(collectorJob).not.toContain('success()')
    expect(collection).toContain("record_type: 'incomplete_collection'")
    expect(collection).toContain('run_id: runId')
    expect(collection).toContain('rerun_of: input.runAttempt === 1 ? null')
    expect(collector).toContain('runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT')
  })

  it('keeps observation evidence read-only, append-free and attributable to run attempt and SHA', () => {
    expect(statistical).toMatch(/^permissions:\n  contents: read$/m)
    expect(statistical).not.toMatch(/^\s+[a-z-]+:\s*write\s*$/m)
    expect(statistical).not.toContain('secrets.')
    expect(statistical).not.toMatch(/observations\.jsonl|git (?:add|commit|push)/)
    expect(statistical).toContain('${{ github.run_attempt }}')
    expect(statistical).toContain('${{ github.sha }}')
    expect(statistical).toContain('Observed phase-6-staging SHA:')
  })

  it('rebuilds dependencies and isolated database and browser resources for every observation', () => {
    for (const gate of Object.values(statisticalGates)) {
      expect(gate).toContain('npm ci --legacy-peer-deps --no-audit --no-fund')
    }
    expect(statisticalGates['database-heavy']).toContain('npm run supabase:local:reset')
    expect(statisticalGates['database-heavy']).toContain('npm run test:migrations:empty-db')
    expect(statisticalGates['browser-heavy']).toContain('npx playwright install --with-deps chromium')
    for (const gate of [statisticalGates['database-heavy'], statisticalGates['browser-heavy']]) {
      expect(gate).toContain('npx supabase stop --no-backup')
      expect(gate).toContain("docker ps -a --format '{{.Names}}'")
      expect(gate).toContain("docker volume ls --format '{{.Name}}'")
    }
  })
})
