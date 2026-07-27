import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertPhase6PreviewPlan,
  buildPhase6PreviewVariablePlan,
} from '../../scripts/preproduction/vercel-preview-guard.mjs'
import { configurePhase6Preview } from '../../scripts/preproduction/configure-vercel-preview.mjs'

const manifest = JSON.parse(readFileSync(
  resolve(process.cwd(), 'scripts/preproduction/vercel-preview-manifest.json'),
  'utf8',
))

function plan() {
  return buildPhase6PreviewVariablePlan({
    manifest,
    anonKey: 'staging-anon-key',
    serviceRoleKey: 'staging-service-role-key',
  })
}

describe('Phase 6 Vercel Preview guard', () => {
  it('accepts only the isolated branch-scoped staging plan', () => {
    expect(assertPhase6PreviewPlan({ manifest, variables: plan() })).toMatchObject({
      status: 'ok',
      project: 'plateforme-coach',
      environment: 'preview',
      branch: 'phase-6-staging',
      supabaseProjectRef: 'cycbnnojcymjnaqomlyj',
      variableCount: 23,
      branchScoped: true,
      productionExcluded: true,
      stripe: 'disabled',
      fallbackFilesLoaded: false,
    })
  })

  it('refuses Production and --prod', () => {
    expect(() => assertPhase6PreviewPlan({
      manifest,
      variables: plan(),
      target: 'production',
    })).toThrow(/branch-scoped/)
    expect(() => assertPhase6PreviewPlan({
      manifest,
      variables: plan(),
      command: 'vercel --prod',
    })).toThrow(/Production/)
  })

  it('requires automatic Git deployment to be disabled before branch push', () => {
    expect(() => assertPhase6PreviewPlan({
      manifest: { ...manifest, gitAutomaticDeployment: true },
      variables: plan(),
    })).toThrow(/Automatic Git deployment/)
  })

  it('refuses missing or non-branch-scoped variables', () => {
    const variables = { ...plan(), SUPABASE_SERVICE_ROLE_KEY: '' }
    expect(() => assertPhase6PreviewPlan({ manifest, variables }))
      .toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(() => assertPhase6PreviewPlan({
      manifest,
      variables: plan(),
      branch: 'main',
    })).toThrow(/branch-scoped/)
  })

  it('refuses production Supabase and public MoovX hosts', () => {
    expect(() => assertPhase6PreviewPlan({
      manifest,
      variables: {
        ...plan(),
        NEXT_PUBLIC_SUPABASE_URL:
          'https://njlzossopgknanhkzcbk.supabase.co',
      },
    })).toThrow(/Production host/)
    expect(() => assertPhase6PreviewPlan({
      manifest,
      variables: {
        ...plan(),
        NEXT_PUBLIC_APP_URL: 'https://app.moovx.ch',
      },
    })).toThrow(/Production host/)
  })

  it('refuses Stripe live and integrations not explicitly disabled', () => {
    expect(() => assertPhase6PreviewPlan({
      manifest,
      variables: {
        ...plan(),
        STRIPE_SECRET_KEY: 'sk_live_forbidden',
      },
    })).toThrow(/explicitly disabled/)
    expect(() => assertPhase6PreviewPlan({
      manifest,
      variables: {
        ...plan(),
        ANTHROPIC_API_KEY: 'enabled',
      },
    })).toThrow(/explicitly disabled/)
  })

  it('refuses local, non-HTTPS and non-Vercel aliases', () => {
    expect(() => assertPhase6PreviewPlan({
      manifest,
      variables: {
        ...plan(),
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      },
    })).toThrow(/HTTPS/)
    expect(() => assertPhase6PreviewPlan({
      manifest: { ...manifest, alias: 'phase6.example.com' },
      variables: plan(),
    })).toThrow(/vercel.app/)
  })

  it('contains no secret in the versioned manifest', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'scripts/preproduction/vercel-preview-manifest.json'),
      'utf8',
    )
    expect(source).not.toMatch(/sk_(?:live|test)_|eyJ[A-Za-z0-9_-]{20,}/)
    expect(source).not.toMatch(/service.?role.?key["']?\s*:/i)
  })

  it('dry-runs without calling Vercel and applies every variable branch-scoped', () => {
    const apiKeySource = JSON.stringify([
      { name: 'anon', type: 'legacy', api_key: 'staging-anon-key' },
      { name: 'service_role', type: 'legacy', api_key: 'staging-service-key' },
    ])
    const calls: Array<{ args: string[]; input?: string }> = []
    const remoteVariables: Array<{
      key: string
      target: string[]
      gitBranch: string
    }> = []
    const execute = (
      _command: string,
      args: string[],
      options: { input?: string },
    ) => {
      calls.push({ args, input: options.input })
      if (args.includes('ls')) {
        return {
          pid: 1,
          output: [null, JSON.stringify({ envs: remoteVariables }), ''],
          stdout: JSON.stringify({ envs: remoteVariables }),
          stderr: '',
          status: 0,
          signal: null,
          error: undefined,
        }
      }
      if (args.includes('add')) {
        remoteVariables.push({
          key: args[3],
          target: ['preview'],
          gitBranch: 'phase-6-staging',
        })
      }
      return {
        pid: 1,
        output: [null, '', ''],
        stdout: '',
        stderr: '',
        status: 0,
        signal: null,
        error: undefined,
      }
    }

    expect(configurePhase6Preview({
      manifest,
      apiKeySource,
      apply: false,
      execute,
    })).toMatchObject({ mode: 'dry-run', secretValuesReported: false })
    expect(calls).toHaveLength(0)

    const applied = configurePhase6Preview({
      manifest,
      apiKeySource,
      apply: true,
      execute,
    })
    expect(applied.variables).toHaveLength(23)
    expect(calls.filter(call => call.args.includes('add'))).toHaveLength(23)
    expect(calls.filter(call => call.args.includes('ls'))).toHaveLength(24)
    expect(calls.filter(call => call.args.includes('add')).every(call =>
      call.args.includes('preview')
      && call.args.includes('phase-6-staging')
      && call.args.includes('--sensitive')
      && !call.args.includes('--prod')
      && !call.args.includes('--force'),
    )).toBe(true)
    expect(JSON.stringify(applied)).not.toContain('staging-service-key')
  })

  it('refuses pre-existing branch variables without overwriting them', () => {
    const apiKeySource = JSON.stringify([
      { name: 'anon', type: 'legacy', api_key: 'staging-anon-key' },
      { name: 'service_role', type: 'legacy', api_key: 'staging-service-key' },
    ])
    const execute = (
      _command: string,
      args: string[],
    ) => ({
      pid: 1,
      output: [null, '', ''],
      stdout: args.includes('ls')
        ? JSON.stringify({
            envs: [{
              key: 'MOOVX_ENVIRONMENT',
              target: ['preview'],
              gitBranch: 'phase-6-staging',
            }],
          })
        : '',
      stderr: '',
      status: 0,
      signal: null,
      error: undefined,
    })

    expect(() => configurePhase6Preview({
      manifest,
      apiKeySource,
      apply: true,
      execute,
    })).toThrow(/refusing overwrite/)
  })

  it('rolls back only variables created during a failed execution', () => {
    const apiKeySource = JSON.stringify([
      { name: 'anon', type: 'legacy', api_key: 'staging-anon-key' },
      { name: 'service_role', type: 'legacy', api_key: 'staging-service-key' },
    ])
    const remoteVariables: Array<{
      key: string
      target: string[]
      gitBranch: string
    }> = []
    const removed: string[] = []
    let additions = 0
    const execute = (
      _command: string,
      args: string[],
    ) => {
      if (args.includes('ls')) {
        return {
          pid: 1,
          output: [null, JSON.stringify({ envs: remoteVariables }), ''],
          stdout: JSON.stringify({ envs: remoteVariables }),
          stderr: '',
          status: 0,
          signal: null,
          error: undefined,
        }
      }
      if (args.includes('add')) {
        additions += 1
        if (additions === 3) {
          return {
            pid: 1,
            output: [null, '', 'refused'],
            stdout: '',
            stderr: 'refused',
            status: 1,
            signal: null,
            error: undefined,
          }
        }
        remoteVariables.push({
          key: args[3],
          target: ['preview'],
          gitBranch: 'phase-6-staging',
        })
      }
      if (args.includes('rm')) {
        const name = args[3]
        removed.push(name)
        const index = remoteVariables.findIndex(variable => variable.key === name)
        if (index !== -1) remoteVariables.splice(index, 1)
      }
      return {
        pid: 1,
        output: [null, '', ''],
        stdout: '',
        stderr: '',
        status: 0,
        signal: null,
        error: undefined,
      }
    }

    expect(() => configurePhase6Preview({
      manifest,
      apiKeySource,
      apply: true,
      execute,
    })).toThrow(/2 created variables were rolled back/)
    expect(removed).toEqual([
      'NEXT_PUBLIC_APP_URL',
      'MOOVX_ENVIRONMENT',
    ])
    expect(remoteVariables).toHaveLength(0)
  })
})
