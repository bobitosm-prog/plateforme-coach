import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8')
const testingStrategy = readFileSync(resolve(root, 'docs/TESTING_STRATEGY.md'), 'utf8')
const contributingGuide = readFileSync(resolve(root, 'docs/CONTRIBUTING.md'), 'utf8')
const fastJob = workflow.slice(workflow.indexOf('\n  fast:'), workflow.indexOf('\n  standard:'))
const standardJob = workflow.slice(workflow.indexOf('\n  standard:'), workflow.indexOf('\n  database-heavy:'))
const databaseHeavyJob = workflow.slice(workflow.indexOf('\n  database-heavy:'), workflow.indexOf('\n  browser-heavy:'))
const browserHeavyJob = workflow.slice(workflow.indexOf('\n  browser-heavy:'))
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  engines?: { node?: string }
  packageManager?: string
}

describe('progressive CI quality gates contract', () => {
  it('documents the first complete run without claiming CI stability', () => {
    for (const document of [testingStrategy, contributingGuide]) {
      expect(document).toContain('31317128115')
      expect(document).toContain('16 min 07 s')
      expect(document).toContain('Cette preuve démontre une exécution complète verte.')
      expect(document).toContain("Elle ne constitue pas encore une attestation de stabilité CI.")
      expect(document).toMatch(/p95[\s\S]{0,80}20\s+minutes/i)
      expect(document).toMatch(/flaky rate[\s\S]{0,80}2 %/i)
      expect(document).not.toMatch(/(?:la )?CI (?:est|désormais) stable/i)
    }
  })

  it('pins the Node and npm runtime used by the CI gates', () => {
    expect(packageJson.engines?.node).toBe('24.x')
    expect(packageJson.packageManager).toBe('npm@11.9.0')
    expect(workflow).toContain("node-version: '24'")
    expect(workflow).toContain('cache: npm')
  })

  it('runs on pull requests, staging pushes and explicit manual dispatches', () => {
    expect(workflow).toMatch(/^on:\n  pull_request:\n  push:/m)
    expect(workflow).toContain('- phase-6-staging')
    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain('base_sha:')
    expect(workflow).toContain('required: true')
  })

  it('uses read-only repository permissions', () => {
    expect(workflow).toMatch(/^permissions:\n  contents: read$/m)
    expect(workflow).not.toMatch(/^\s+[a-z-]+:\s*write\s*$/m)
  })

  it('cancels obsolete runs of the same workflow and ref', () => {
    expect(workflow).toContain('concurrency:')
    expect(workflow).toContain('${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}')
    expect(workflow).toContain('cancel-in-progress: true')
  })

  it('defines the bounded fast, standard and two isolated heavy jobs', () => {
    expect(workflow).toMatch(/^jobs:\n  fast:/m)
    expect(workflow.match(/^  [a-z][a-z0-9_-]*:\n    name:/gm)).toHaveLength(4)
    expect(workflow).toContain('timeout-minutes: 10')
    expect(standardJob).toContain('timeout-minutes: 15')
    expect(databaseHeavyJob).toContain('timeout-minutes: 20')
    expect(browserHeavyJob).toContain('timeout-minutes: 20')
  })

  it('installs the exact lockfile dependency graph', () => {
    expect(workflow).toContain('npm ci --legacy-peer-deps --no-audit --no-fund')
    expect(workflow).not.toMatch(/npm (?:install|update)\b/)
  })

  it('resolves an explicit event-specific ancestor instead of assuming HEAD parent', () => {
    expect(workflow).toContain('PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}')
    expect(workflow).toContain('PUSH_BASE_SHA: ${{ github.event.before }}')
    expect(workflow).toContain('MANUAL_BASE_SHA: ${{ inputs.base_sha }}')
    expect(workflow).toContain('git merge-base --is-ancestor "$candidate" HEAD')
    expect(workflow).not.toContain('HEAD^')
  })

  it('checks changed whitespace and lints only changed script sources', () => {
    expect(workflow).toContain('git diff --check "$DIFF_BASE"...HEAD')
    expect(workflow).toContain('--diff-filter=ACMR -z "$DIFF_BASE"...HEAD')
    for (const extension of ['*.js', '*.jsx', '*.mjs', '*.cjs', '*.ts', '*.tsx']) {
      expect(workflow).toContain(`'${extension}'`)
    }
    expect(workflow).toContain('npx eslint -- "${files[@]}"')
    expect(workflow).not.toMatch(/run:\s*npm run lint(?:\s|$)/)
  })

  it('runs the fast static and documentation contracts', () => {
    for (const command of [
      'npx tsc --noEmit',
      'npm run i18n:check',
      'npm run supabase:factories:check',
      'tests/unit/ci-quality-gates.test.ts',
      'tests/unit/developer-onboarding.test.ts',
      'tests/unit/code-review-checklist.test.ts',
      'tests/unit/domain-documentation.test.ts',
    ]) expect(workflow).toContain(command)
  })

  it('runs the standard gate independently with the complete bounded checks', () => {
    expect(standardJob).toMatch(/^\n  standard:\n    name: Gate B - Standard/m)
    expect(standardJob).toContain('runs-on: ubuntu-latest')
    expect(standardJob).toMatch(/uses: actions\/checkout@v4\n\s+with:\n\s+fetch-depth: 0/)
    expect(standardJob).toContain("node-version: '24'")
    expect(standardJob).toContain('cache: npm')
    expect(standardJob).toContain('npm ci --legacy-peer-deps --no-audit --no-fund')
    expect(standardJob).toContain('run: npm test')
    expect(standardJob).toContain('run: npm run build')
    expect(standardJob).toContain('run: npm run perf:budget:check')
    expect(standardJob).not.toMatch(/^    needs:/m)
  })

  it('declares ffprobe through a bounded ffmpeg install in Gate B only', () => {
    const ffmpegInstall = 'sudo apt-get install -y --no-install-recommends ffmpeg'
    const installIndex = standardJob.indexOf(ffmpegInstall)
    const vitestIndex = standardJob.indexOf('run: npm test')

    expect(standardJob).toContain('sudo apt-get update')
    expect(standardJob).toContain(ffmpegInstall)
    expect(installIndex).toBeGreaterThan(-1)
    expect(installIndex).toBeLessThan(vitestIndex)
    expect(standardJob.match(/sudo apt-get install/g)).toHaveLength(1)
    expect(standardJob).not.toMatch(/imagemagick|identify/i)
    expect(fastJob).not.toMatch(/apt-get|ffmpeg|ffprobe|imagemagick|identify/i)
  })

  it('provides only synthetic public Supabase build configuration to Gate B', () => {
    const environmentNames = [...standardJob.matchAll(/^      ([A-Z][A-Z0-9_]+):/gm)]
      .map(match => match[1])
    expect(environmentNames).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ])
    expect(standardJob).toContain("NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55321'")
    expect(standardJob).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-synthetic-build'")
    expect(standardJob).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY/)
    expect(standardJob).not.toMatch(/https?:\/\/(?:[^\s'\"]+\.)?(?:supabase\.co|moovx\.ch)/)
  })

  it('keeps Docker, Supabase services, E2E, baselines and deployments out of Gate B', () => {
    for (const forbidden of [
      'docker',
      'supabase start',
      'supabase:local',
      'test:e2e',
      'perf:baseline',
      '--linked',
      'db push',
      'migration repair',
      '--prod',
      'stripe live',
      'vercel',
      'deploy',
    ]) expect(standardJob.toLowerCase()).not.toContain(forbidden.toLowerCase())
    expect(standardJob).not.toContain('secrets.')
  })

  it('keeps heavy, distant and deployment operations out of Gates A and B', () => {
    const lightweightJobs = `${fastJob}\n${standardJob}`
    for (const forbidden of [
      'test:e2e',
      'test:migrations',
      'supabase:local',
      'docker',
      '--linked',
      'db push',
      'migration repair',
      '--prod',
      'production',
      'VERCEL_ENV',
      'stripe live',
      'deploy',
    ]) expect(lightweightJobs.toLowerCase()).not.toContain(forbidden.toLowerCase())
  })

  it('runs Database Heavy independently with local database proofs only', () => {
    expect(databaseHeavyJob).toMatch(/^\n  database-heavy:\n    name: Gate C1 - Database Heavy/m)
    expect(databaseHeavyJob).toContain("if: github.event_name != 'pull_request'")
    expect(databaseHeavyJob).toContain('runs-on: ubuntu-latest')
    expect(databaseHeavyJob).toContain("node-version: '24'")
    expect(databaseHeavyJob).toContain('cache: npm')
    expect(databaseHeavyJob).toContain('npm ci --legacy-peer-deps --no-audit --no-fund')
    expect(databaseHeavyJob).toContain('sudo apt-get install -y --no-install-recommends postgresql-client')
    expect(databaseHeavyJob).toContain("docker info --format '{{.ServerVersion}}'")
    expect(databaseHeavyJob).toContain('psql --version')
    expect(databaseHeavyJob).toContain('npm run supabase:local:reset')
    expect(databaseHeavyJob).toContain('npm run test:migrations:empty-db')
    expect(databaseHeavyJob).toContain('npm run supabase:types:check')
    expect(databaseHeavyJob).toContain('npm run test:integration:rls')
    expect(databaseHeavyJob).not.toContain('playwright install')
    expect(databaseHeavyJob).not.toContain('test:e2e')
    expect(databaseHeavyJob).not.toMatch(/^    needs:/m)
  })

  it('runs Browser Heavy independently with Chromium and the canonical critical suite', () => {
    expect(browserHeavyJob).toMatch(/^\n  browser-heavy:\n    name: Gate C2 - Browser Heavy/m)
    expect(browserHeavyJob).toContain("if: github.event_name != 'pull_request'")
    expect(browserHeavyJob).toContain('runs-on: ubuntu-latest')
    expect(browserHeavyJob).toContain("node-version: '24'")
    expect(browserHeavyJob).toContain('cache: npm')
    expect(browserHeavyJob).toContain('npm ci --legacy-peer-deps --no-audit --no-fund')
    expect(browserHeavyJob).toContain('npx playwright install --with-deps chromium')
    expect(browserHeavyJob).toContain('npm run test:e2e:critical')
    expect(browserHeavyJob).not.toContain('test:migrations:empty-db')
    expect(browserHeavyJob).not.toContain('supabase:types:check')
    expect(browserHeavyJob).not.toContain('test:integration:rls')
    expect(browserHeavyJob).not.toMatch(/^    needs:/m)
    expect(browserHeavyJob).not.toMatch(/retries|--workers[= ](?:[2-9]|[1-9][0-9]+)/)
  })

  it('audits and removes local heavy resources even after failures', () => {
    for (const job of [databaseHeavyJob, browserHeavyJob]) {
      expect(job.match(/if: always\(\)/g)).toHaveLength(3)
      expect(job).toContain('npx supabase stop --no-backup')
      expect(job).toContain("docker ps -a --format '{{.Names}}'")
      expect(job).toContain("docker volume ls --format '{{.Name}}'")
      expect(job).toContain("connect({ host: '127.0.0.1', port })")
      expect(job).toContain('rm -f .env.e2e.local .critical-e2e.lock .supabase-local-reset.lock')
    }
    expect(databaseHeavyJob).toContain('DATABASE_HEAVY_SYNTHETIC_RESIDUE')
    expect(browserHeavyJob).toContain("email ~ '@(moovx[.])?example[.]test$'")
    expect(browserHeavyJob).toContain('BROWSER_HEAVY_SYNTHETIC_AUTH_RESIDUE')
    expect(browserHeavyJob).toContain('BROWSER_HEAVY_SYNTHETIC_TABLE_RESIDUE')
  })

  it('keeps all heavy jobs local-only, read-only toward the repository and deployment-free', () => {
    expect(workflow).toMatch(/^permissions:\n  contents: read$/m)
    expect(workflow).not.toMatch(/^\s+[a-z-]+:\s*write\s*$/m)
    expect(workflow).not.toContain('secrets.')
    for (const forbidden of [
      '--linked',
      'db push',
      'migration repair',
      '--prod',
      'production',
      'supabase.co',
      'moovx.ch',
      'stripe live',
      'vercel',
      'deploy',
    ]) expect(workflow.toLowerCase()).not.toContain(forbidden.toLowerCase())
    expect(databaseHeavyJob).toContain('docker info')
    expect(browserHeavyJob).toContain('docker info')
    expect(fastJob).not.toContain('docker')
    expect(standardJob).not.toContain('docker')
    expect(workflow).not.toContain('secrets.')
  })
})
