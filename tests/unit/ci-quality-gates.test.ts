import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8')
const standardJob = workflow.slice(workflow.indexOf('\n  standard:'))
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  engines?: { node?: string }
  packageManager?: string
}

describe('progressive CI quality gates contract', () => {
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

  it('defines only the bounded fast and standard jobs', () => {
    expect(workflow).toMatch(/^jobs:\n  fast:/m)
    expect(workflow.match(/^  [a-z][a-z0-9_-]*:\n    name:/gm)).toHaveLength(2)
    expect(workflow).toContain('timeout-minutes: 10')
    expect(standardJob).toContain('timeout-minutes: 15')
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
    expect(workflow).not.toMatch(/^  heavy:/m)
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

  it('contains no heavy, distant or deployment operation', () => {
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
    ]) expect(workflow.toLowerCase()).not.toContain(forbidden.toLowerCase())
    expect(workflow).not.toContain('secrets.')
  })
})
