#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

export const PHASE6_STAGING_PROJECT_REF = 'cycbnnojcymjnaqomlyj'
export const PHASE6_STAGING_SUPABASE_URL =
  `https://${PHASE6_STAGING_PROJECT_REF}.supabase.co`
const PHASE6_AUTH_V2_AUTHORITY = 'moovx-phase6-staging-auth-v2'
const PRODUCTION_PROJECT_REF = 'njlzossopgknanhkzcbk'
const V2_UUID_PATTERN =
  /^76100000-0000-4000-8000-00000000000[1-9]$/
const V2_EMAIL_PATTERN =
  /^phase6-v2-(?:admin|coach-1|client-[1-7])@moovx\.invalid$/

function sameJsonObject(actual, expected) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false
  const actualKeys = Object.keys(actual).sort()
  const expectedKeys = Object.keys(expected).sort()
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) =>
      key === expectedKeys[index] && actual[key] === expected[key])
}

export function expectedPhase6AuthMetadata(persona, authority) {
  return {
    role: persona.role,
    synthetic: true,
    seed: authority,
    full_name: persona.fullName,
  }
}

export function assertPhase6AuthV2Manifest(manifest) {
  if (
    manifest?.schemaVersion !== 2
    || manifest.authority !== PHASE6_AUTH_V2_AUTHORITY
    || manifest.environment !== 'staging'
    || manifest.projectRef !== PHASE6_STAGING_PROJECT_REF
    || manifest.supabaseUrl !== PHASE6_STAGING_SUPABASE_URL
    || manifest.namespace !== '76100000'
  ) {
    throw new Error('Invalid Phase 6 Auth v2 staging authority')
  }
  if (
    manifest.projectRef === PRODUCTION_PROJECT_REF
    || manifest.supabaseUrl.includes(PRODUCTION_PROJECT_REF)
    || !manifest.supabaseUrl.startsWith('https://')
  ) {
    throw new Error('Production Supabase project forbidden')
  }
  if (
    manifest.provisioning?.method !== 'supabase.auth.admin.createUser'
    || manifest.provisioning?.provider !== 'email'
    || manifest.provisioning?.emailConfirm !== true
  ) {
    throw new Error('Auth v2 must use confirmed email createUser provisioning')
  }
  if (!Array.isArray(manifest.personas) || manifest.personas.length !== 9) {
    throw new Error('Expected exactly 9 Phase 6 Auth v2 personas')
  }

  const ids = manifest.personas.map(persona => persona.id)
  const emails = manifest.personas.map(persona => persona.email.toLowerCase())
  if (new Set(ids).size !== 9 || ids.some(id => !V2_UUID_PATTERN.test(id))) {
    throw new Error('Phase 6 Auth v2 UUIDs must be deterministic and unique')
  }
  if (
    new Set(emails).size !== 9
    || emails.some(email => !V2_EMAIL_PATTERN.test(email))
  ) {
    throw new Error('Phase 6 Auth v2 emails must be deterministic and unique')
  }

  const roleCounts = manifest.personas.reduce((counts, persona) => {
    counts[persona.role] = (counts[persona.role] ?? 0) + 1
    return counts
  }, {})
  if (
    roleCounts.super_admin !== 1
    || roleCounts.coach !== 1
    || roleCounts.client !== 7
  ) {
    throw new Error('Unexpected Phase 6 Auth v2 role distribution')
  }
  if (
    JSON.stringify(manifest).match(
      /\b(?:sk_live|sk_test|pk_live|pk_test|service_role|eyJ[A-Za-z0-9_-]*\.)/,
    )
  ) {
    throw new Error('Credential-shaped value forbidden in Auth v2 manifest')
  }
  return manifest
}

export function assertPhase6StagingTarget({
  projectRef,
  supabaseUrl,
}) {
  if (
    projectRef !== PHASE6_STAGING_PROJECT_REF
    || supabaseUrl !== PHASE6_STAGING_SUPABASE_URL
    || projectRef === PRODUCTION_PROJECT_REF
    || supabaseUrl.includes(PRODUCTION_PROJECT_REF)
  ) {
    throw new Error('Auth v2 target is not the authorized staging project')
  }
  return {
    projectRef: PHASE6_STAGING_PROJECT_REF,
    supabaseUrl: PHASE6_STAGING_SUPABASE_URL,
    productionExcluded: true,
  }
}

async function listAllAuthUsers(authAdmin) {
  const users = []
  const perPage = 1000
  for (let page = 1; ; page += 1) {
    const { data, error } = await authAdmin.listUsers({ page, perPage })
    if (error) throw new Error(`Auth v2 preflight list failed: ${error.message}`)
    const pageUsers = data?.users ?? []
    users.push(...pageUsers)
    if (pageUsers.length < perPage) return users
  }
}

function canonicalDivergences(user, persona, authority) {
  const divergences = []
  if (user.id !== persona.id) divergences.push('uuid')
  if (user.email?.toLowerCase() !== persona.email.toLowerCase()) {
    divergences.push('email')
  }
  if (!user.email_confirmed_at) divergences.push('email_confirmation')
  if (
    !sameJsonObject(
      user.user_metadata,
      expectedPhase6AuthMetadata(persona, authority),
    )
  ) {
    divergences.push('user_metadata')
  }
  const identities = Array.isArray(user.identities) ? user.identities : []
  const emailIdentities = identities.filter(identity =>
    identity.provider === 'email')
  if (
    emailIdentities.length !== 1
    || emailIdentities[0]?.identity_data?.email?.toLowerCase()
      !== persona.email.toLowerCase()
  ) {
    divergences.push('email_identity')
  }
  if (
    user.app_metadata?.provider !== 'email'
    || !Array.isArray(user.app_metadata?.providers)
    || !user.app_metadata.providers.includes('email')
  ) {
    divergences.push('app_metadata')
  }
  return divergences
}

export async function preflightPhase6AuthV2({
  authAdmin,
  manifest,
  projectRef = manifest?.projectRef,
  supabaseUrl = manifest?.supabaseUrl,
}) {
  assertPhase6AuthV2Manifest(manifest)
  assertPhase6StagingTarget({ projectRef, supabaseUrl })

  const listedUsers = await listAllAuthUsers(authAdmin)
  const usersById = new Map(listedUsers.map(user => [user.id, user]))
  const usersByEmail = new Map(
    listedUsers
      .filter(user => user.email)
      .map(user => [user.email.toLowerCase(), user]),
  )
  const entries = []

  for (const persona of manifest.personas) {
    const uuidMatch = usersById.get(persona.id)
    const emailMatch = usersByEmail.get(persona.email.toLowerCase())
    if (!uuidMatch && !emailMatch) {
      entries.push({ key: persona.key, status: 'absent', divergences: [] })
      continue
    }
    if (
      !uuidMatch
      || !emailMatch
      || uuidMatch.id !== emailMatch.id
    ) {
      entries.push({
        key: persona.key,
        status: 'collision',
        divergences: [
          !uuidMatch
            ? 'email_owned_by_another_uuid'
            : !emailMatch
              ? 'uuid_has_another_email'
              : 'uuid_email_cross_collision',
        ],
      })
      continue
    }

    const { data, error } = await authAdmin.getUserById(persona.id)
    if (error || !data?.user) {
      throw new Error(
        `Auth v2 preflight detail failed for ${persona.key}: ${
          error?.message ?? 'missing user'
        }`,
      )
    }
    const divergences = canonicalDivergences(
      data.user,
      persona,
      manifest.authority,
    )
    entries.push({
      key: persona.key,
      status: divergences.length === 0 ? 'canonical' : 'collision',
      divergences,
    })
  }

  const collisionCount = entries.filter(row => row.status === 'collision').length
  return {
    status: collisionCount === 0 ? 'ready' : 'blocked',
    projectRef: PHASE6_STAGING_PROJECT_REF,
    expectedCount: manifest.personas.length,
    canonicalCount: entries.filter(row => row.status === 'canonical').length,
    absentCount: entries.filter(row => row.status === 'absent').length,
    collisionCount,
    entries,
  }
}

export function assertSuccessfulPhase6AuthPreflight(preflight, {
  allowAbsent = false,
} = {}) {
  if (
    preflight?.status !== 'ready'
    || preflight.collisionCount !== 0
    || (!allowAbsent && (
      preflight.absentCount !== 0
      || preflight.canonicalCount !== preflight.expectedCount
    ))
  ) {
    throw new Error('Phase 6 Auth v2 preflight is not fully canonical')
  }
  return preflight
}

export async function provisionPhase6AuthV2({
  authAdmin,
  manifest,
  passwordFor,
  projectRef = manifest?.projectRef,
  supabaseUrl = manifest?.supabaseUrl,
}) {
  if (typeof passwordFor !== 'function') {
    throw new Error('An in-memory password provider is required')
  }
  const preflight = await preflightPhase6AuthV2({
    authAdmin,
    manifest,
    projectRef,
    supabaseUrl,
  })
  assertSuccessfulPhase6AuthPreflight(preflight, { allowAbsent: true })

  const absentKeys = new Set(
    preflight.entries
      .filter(row => row.status === 'absent')
      .map(row => row.key),
  )
  let createdCount = 0
  for (const persona of manifest.personas) {
    if (!absentKeys.has(persona.key)) continue
    const password = await passwordFor(persona.key)
    if (typeof password !== 'string' || password.length < 12) {
      throw new Error(`Invalid in-memory credential for ${persona.key}`)
    }
    const { data, error } = await authAdmin.createUser({
      id: persona.id,
      email: persona.email,
      password,
      email_confirm: true,
      user_metadata: expectedPhase6AuthMetadata(
        persona,
        manifest.authority,
      ),
    })
    if (error || data?.user?.id !== persona.id) {
      throw new Error(
        `Auth v2 creation failed for ${persona.key}: ${
          error?.message ?? 'unexpected user id'
        }`,
      )
    }
    createdCount += 1
  }

  const postflight = await preflightPhase6AuthV2({
    authAdmin,
    manifest,
    projectRef,
    supabaseUrl,
  })
  assertSuccessfulPhase6AuthPreflight(postflight)
  return {
    status: 'provisioned',
    projectRef: PHASE6_STAGING_PROJECT_REF,
    createdCount,
    preservedCount: preflight.canonicalCount,
    canonicalCount: postflight.canonicalCount,
  }
}

export function createPhase6AuthAdminClient(serviceRoleValue) {
  if (typeof serviceRoleValue !== 'string' || serviceRoleValue.length < 20) {
    throw new Error('Missing in-memory staging Auth authority')
  }
  return createClient(PHASE6_STAGING_SUPABASE_URL, serviceRoleValue, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }).auth.admin
}

export function readHiddenOperatorValue(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Sensitive operator input requires an interactive TTY')
  }
  return new Promise((resolveValue, reject) => {
    let value = ''
    const input = process.stdin
    process.stdout.write(`${label}: `)
    input.setRawMode(true)
    input.resume()
    input.setEncoding('utf8')

    const finish = (error) => {
      input.off('data', onData)
      input.setRawMode(false)
      input.pause()
      process.stdout.write('\n')
      if (error) reject(error)
      else resolveValue(value)
    }
    const onData = chunk => {
      for (const character of chunk) {
        if (character === '\u0003') {
          finish(new Error('Operator input cancelled'))
          return
        }
        if (character === '\r' || character === '\n') {
          finish()
          return
        }
        if (character === '\u007f') value = value.slice(0, -1)
        else value += character
      }
    }
    input.on('data', onData)
  })
}

async function main() {
  if (process.argv.length !== 2) {
    throw new Error('CLI arguments are forbidden for Auth v2 provisioning')
  }
  const manifest = assertPhase6AuthV2Manifest(JSON.parse(readFileSync(
    resolve('scripts/preproduction/phase6-auth-v2-manifest.json'),
    'utf8',
  )))
  const serviceRoleValue = await readHiddenOperatorValue(
    'Staging Auth authority (hidden)',
  )
  const authAdmin = createPhase6AuthAdminClient(serviceRoleValue)
  const preflight = await preflightPhase6AuthV2({ authAdmin, manifest })
  assertSuccessfulPhase6AuthPreflight(preflight, { allowAbsent: true })
  const absentKeys = new Set(
    preflight.entries
      .filter(row => row.status === 'absent')
      .map(row => row.key),
  )
  const passwords = new Map()
  for (const persona of manifest.personas) {
    if (!absentKeys.has(persona.key)) continue
    passwords.set(
      persona.key,
      await readHiddenOperatorValue(`Credential for ${persona.key} (hidden)`),
    )
  }
  let result
  try {
    result = await provisionPhase6AuthV2({
      authAdmin,
      manifest,
      passwordFor: key => passwords.get(key),
    })
  } finally {
    passwords.clear()
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(
      `Phase 6 Auth v2 provisioning refused: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    )
    process.exitCode = 1
  })
}
