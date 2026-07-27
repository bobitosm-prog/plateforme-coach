#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertPhase6PreviewPlan,
  buildPhase6PreviewVariablePlan,
} from './vercel-preview-guard.mjs'

function valueFor(argv, name) {
  const index = argv.indexOf(name)
  if (index === -1 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Missing required argument: ${name}`)
  }
  return argv[index + 1]
}

function readSupabaseKeys(source) {
  const parsed = JSON.parse(source)
  if (!Array.isArray(parsed)) throw new Error('Unexpected Supabase API key response')
  const anon = parsed.find(row => row?.name === 'anon' && row?.type === 'legacy')
  const serviceRole = parsed.find(
    row => row?.name === 'service_role' && row?.type === 'legacy',
  )
  if (!anon?.api_key || !serviceRole?.api_key) {
    throw new Error('Missing staging anon or service role API key')
  }
  return { anonKey: anon.api_key, serviceRoleKey: serviceRole.api_key }
}

function executeCommand(command, args, options) {
  return spawnSync(command, args, options)
}

function sanitizeCliError(source, secretValues) {
  let sanitized = String(source || '')
  for (const value of secretValues) {
    if (value) sanitized = sanitized.replaceAll(value, '[redacted]')
  }
  return sanitized
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]')
    .trim()
}

function parseBranchVariableInventory(source) {
  let parsed
  try {
    parsed = JSON.parse(source)
  } catch {
    throw new Error('Vercel returned an invalid branch variable inventory')
  }
  if (!Array.isArray(parsed?.envs)) {
    throw new Error('Vercel returned an unexpected branch variable inventory')
  }
  return parsed.envs
}

function listBranchVariables({ branch, execute = executeCommand }) {
  const result = execute(
    'npx',
    ['vercel', 'env', 'ls', 'preview', branch, '--format', 'json'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
    },
  )
  if (result.status !== 0) {
    throw new Error(
      `Vercel refused the branch variable inventory${
        result.stderr ? `: ${sanitizeCliError(result.stderr, [])}` : ''
      }`,
    )
  }
  return parseBranchVariableInventory(result.stdout)
}

function variableName(variable) {
  return variable?.key ?? variable?.name
}

function assertBranchVariablePresent(inventory, name, branch) {
  const match = inventory.find(variable => variableName(variable) === name)
  if (!match) throw new Error(`Missing branch-scoped variable after creation: ${name}`)
  if (match.gitBranch !== branch) {
    throw new Error(`Unexpected branch scope after creation: ${name}`)
  }
  const targets = Array.isArray(match.target) ? match.target : [match.target]
  if (!targets.includes('preview')) {
    throw new Error(`Unexpected environment scope after creation: ${name}`)
  }
}

function addBranchVariable(name, value, { branch, execute = executeCommand }) {
  const result = execute(
    'npx',
    [
      'vercel',
      'env',
      'add',
      name,
      'preview',
      branch,
      '--sensitive',
      '--yes',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      input: `${value}\n`,
      env: process.env,
    },
  )
  if (result.status !== 0) {
    const diagnostic = sanitizeCliError(
      `${result.stderr || ''}\n${result.stdout || ''}`,
      [value],
    )
    throw new Error(
      `Vercel refused branch-scoped variable ${name}${
        diagnostic ? `: ${diagnostic}` : ''
      }`,
    )
  }
}

function removeBranchVariable(name, { branch, execute = executeCommand }) {
  const result = execute(
    'npx',
    ['vercel', 'env', 'rm', name, 'preview', branch, '--yes'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
    },
  )
  if (result.status !== 0) {
    throw new Error(
      `Vercel refused rollback of branch-scoped variable ${name}${
        result.stderr ? `: ${sanitizeCliError(result.stderr, [])}` : ''
      }`,
    )
  }
}

export function configurePhase6Preview({
  manifest,
  apiKeySource,
  apply,
  execute = executeCommand,
}) {
  const keys = readSupabaseKeys(apiKeySource)
  const variables = buildPhase6PreviewVariablePlan({
    manifest,
    anonKey: keys.anonKey,
    serviceRoleKey: keys.serviceRoleKey,
  })
  const verification = assertPhase6PreviewPlan({ manifest, variables })
  const names = manifest.requiredBranchScopedVariables

  if (apply) {
    const initialInventory = listBranchVariables({
      branch: manifest.branch,
      execute,
    })
    if (initialInventory.length > 0) {
      throw new Error('Branch-scoped Preview variables already exist; refusing overwrite')
    }

    const created = []
    try {
      for (const name of names) {
        addBranchVariable(name, variables[name], {
          branch: manifest.branch,
          execute,
        })
        created.push(name)
        assertBranchVariablePresent(
          listBranchVariables({ branch: manifest.branch, execute }),
          name,
          manifest.branch,
        )
      }
    } catch (error) {
      const rollbackFailures = []
      for (const name of created.reverse()) {
        try {
          removeBranchVariable(name, {
            branch: manifest.branch,
            execute,
          })
        } catch (rollbackError) {
          rollbackFailures.push(
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError),
          )
        }
      }
      if (rollbackFailures.length > 0) {
        throw new Error(
          `Preview configuration failed and rollback was incomplete: ${rollbackFailures.join('; ')}`,
        )
      }
      throw new Error(
        `Preview configuration failed; ${created.length} created variables were rolled back: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }
  return {
    ...verification,
    mode: apply ? 'apply' : 'dry-run',
    variables: names.map(name => ({
      name,
      environment: 'preview',
      branch: manifest.branch,
      sensitive: true,
      configured: apply,
    })),
    secretValuesReported: false,
  }
}

function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const apply = argv.includes('--apply')
  if (dryRun === apply) {
    throw new Error('Choose exactly one mode: --dry-run or --apply')
  }
  const manifest = JSON.parse(
    readFileSync(resolve(valueFor(argv, '--manifest')), 'utf8'),
  )
  const apiKeySource = readFileSync(
    resolve(valueFor(argv, '--supabase-api-keys')),
    'utf8',
  )
  const result = configurePhase6Preview({
    manifest,
    apiKeySource,
    apply,
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `Phase 6 Vercel Preview configuration refused: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    )
    process.exitCode = 1
  }
}
