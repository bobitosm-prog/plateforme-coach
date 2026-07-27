#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXPECTED = Object.freeze({
  authority: 'moovx-phase6-vercel-preview-v1',
  environment: 'preview',
  branch: 'phase-6-staging',
  projectId: 'prj_WI7LdZkzqU2SlXUCPCfBaASO52NJ',
  projectName: 'plateforme-coach',
  teamId: 'team_jsmwUqZtuecSoWUzmdJF8N1W',
  teamSlug: 'bobitosm-3757s-projects',
  stagingRef: 'cycbnnojcymjnaqomlyj',
  productionRef: 'njlzossopgknanhkzcbk',
})

const DISABLED_VALUE = 'disabled_phase6_staging'
const SYNTHETIC_EMAIL_DOMAIN = '@moovx.invalid'

function required(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required Preview value: ${label}`)
  }
  return value.trim()
}

function assertSafeUrl(value, label, { exactHost } = {}) {
  let url
  try {
    url = new URL(required(value, label))
  } catch {
    throw new Error(`Invalid Preview URL: ${label}`)
  }
  if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS`)
  const host = url.hostname.toLowerCase()
  if (
    host === 'app.moovx.ch'
    || host === 'moovx.ch'
    || host.endsWith('.moovx.ch')
    || host.includes(EXPECTED.productionRef)
  ) {
    throw new Error(`Production host forbidden in ${label}`)
  }
  if (exactHost && host !== exactHost) {
    throw new Error(`${label} must target ${exactHost}`)
  }
  return url
}

export function buildPhase6PreviewVariablePlan({
  manifest,
  anonKey,
  serviceRoleKey,
}) {
  const aliasUrl = `https://${manifest.alias}`
  return {
    MOOVX_ENVIRONMENT: 'staging',
    NEXT_PUBLIC_APP_URL: aliasUrl,
    NEXT_PUBLIC_SITE_URL: aliasUrl,
    NEXT_PUBLIC_SUPABASE_URL: manifest.supabase.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: required(anonKey, 'Supabase anon key'),
    SUPABASE_SERVICE_ROLE_KEY: required(serviceRoleKey, 'Supabase service role key'),
    NEXT_PUBLIC_ADMIN_EMAIL: 'phase6-admin@moovx.invalid',
    NEXT_PUBLIC_COACH_EMAIL: 'phase6-coach@moovx.invalid',
    ADMIN_EMAIL: 'phase6-admin@moovx.invalid',
    DEFAULT_COACH_EMAIL: 'phase6-coach@moovx.invalid',
    ANTHROPIC_API_KEY: DISABLED_VALUE,
    CRON_SECRET: DISABLED_VALUE,
    SMTP_HOST: 'disabled.moovx.invalid',
    SMTP_PORT: '1',
    SMTP_USER: DISABLED_VALUE,
    SMTP_PASS: DISABLED_VALUE,
    STRIPE_SECRET_KEY: DISABLED_VALUE,
    STRIPE_WEBHOOK_SECRET: DISABLED_VALUE,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: DISABLED_VALUE,
    NEXT_PUBLIC_PRICE_CLIENT_MONTHLY: DISABLED_VALUE,
    NEXT_PUBLIC_PRICE_CLIENT_YEARLY: DISABLED_VALUE,
    NEXT_PUBLIC_PRICE_CLIENT_LIFETIME: DISABLED_VALUE,
    NEXT_PUBLIC_PRICE_COACH_MONTHLY: DISABLED_VALUE,
  }
}

export function assertPhase6PreviewPlan({
  manifest,
  variables,
  target = 'preview',
  branch = manifest?.branch,
  command = 'vercel',
}) {
  if (
    manifest?.schemaVersion !== 1
    || manifest.authority !== EXPECTED.authority
    || manifest.environment !== EXPECTED.environment
  ) {
    throw new Error('Invalid Phase 6 Preview manifest authority')
  }
  if (
    manifest.branch !== EXPECTED.branch
    || branch !== EXPECTED.branch
    || target !== 'preview'
  ) {
    throw new Error('Preview must be branch-scoped to phase-6-staging')
  }
  if (manifest.gitAutomaticDeployment !== false) {
    throw new Error('Automatic Git deployment must be disabled for phase-6-staging')
  }
  if (
    manifest.project?.id !== EXPECTED.projectId
    || manifest.project?.name !== EXPECTED.projectName
    || manifest.team?.id !== EXPECTED.teamId
    || manifest.team?.slug !== EXPECTED.teamSlug
  ) {
    throw new Error('Unexpected Vercel project or team')
  }
  if (
    manifest.supabase?.projectRef !== EXPECTED.stagingRef
    || manifest.supabase.projectRef === EXPECTED.productionRef
  ) {
    throw new Error('Unexpected Supabase project ref')
  }
  if (/(^|\s)--prod(?:\s|$)/.test(command) || /production/i.test(target)) {
    throw new Error('Production Vercel command forbidden')
  }

  const alias = required(manifest.alias, 'alias').toLowerCase()
  if (!alias.endsWith('.vercel.app') || alias.includes('moovx.ch')) {
    throw new Error('Preview alias must be an isolated *.vercel.app host')
  }
  assertSafeUrl(`https://${alias}`, 'Preview alias', { exactHost: alias })
  assertSafeUrl(manifest.supabase.url, 'Supabase URL', {
    exactHost: `${EXPECTED.stagingRef}.supabase.co`,
  })

  const requiredNames = manifest.requiredBranchScopedVariables
  if (!Array.isArray(requiredNames) || requiredNames.length === 0) {
    throw new Error('Missing required branch-scoped variable contract')
  }
  const missing = requiredNames.filter(name => !required(variables[name], name))
  if (missing.length > 0) {
    throw new Error(`Missing branch-scoped Preview variables: ${missing.join(', ')}`)
  }
  if (Object.keys(variables).some(name => !requiredNames.includes(name))) {
    throw new Error('Unexpected variable in Preview configuration plan')
  }

  if (variables.MOOVX_ENVIRONMENT !== 'staging') {
    throw new Error('MOOVX_ENVIRONMENT must be staging')
  }
  assertSafeUrl(variables.NEXT_PUBLIC_APP_URL, 'NEXT_PUBLIC_APP_URL', {
    exactHost: alias,
  })
  assertSafeUrl(variables.NEXT_PUBLIC_SITE_URL, 'NEXT_PUBLIC_SITE_URL', {
    exactHost: alias,
  })
  assertSafeUrl(variables.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL', {
    exactHost: `${EXPECTED.stagingRef}.supabase.co`,
  })
  for (const name of [
    'NEXT_PUBLIC_ADMIN_EMAIL',
    'NEXT_PUBLIC_COACH_EMAIL',
    'ADMIN_EMAIL',
    'DEFAULT_COACH_EMAIL',
  ]) {
    if (!variables[name].endsWith(SYNTHETIC_EMAIL_DOMAIN)) {
      throw new Error(`Non-synthetic email forbidden in ${name}`)
    }
  }
  for (const name of [
    'ANTHROPIC_API_KEY',
    'CRON_SECRET',
    'SMTP_USER',
    'SMTP_PASS',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_PRICE_CLIENT_MONTHLY',
    'NEXT_PUBLIC_PRICE_CLIENT_YEARLY',
    'NEXT_PUBLIC_PRICE_CLIENT_LIFETIME',
    'NEXT_PUBLIC_PRICE_COACH_MONTHLY',
  ]) {
    if (variables[name] !== DISABLED_VALUE) {
      throw new Error(`${name} must be explicitly disabled`)
    }
  }
  const serialized = JSON.stringify(variables)
  if (
    serialized.includes(EXPECTED.productionRef)
    || /app\.moovx\.ch|https?:\/\/(?:www\.)?moovx\.ch/i.test(serialized)
    || /\b(?:sk|pk|rk)_live_/i.test(serialized)
  ) {
    throw new Error('Production or Stripe live value forbidden in Preview')
  }

  return {
    status: 'ok',
    authority: manifest.authority,
    project: manifest.project.name,
    team: manifest.team.slug,
    environment: 'preview',
    branch: EXPECTED.branch,
    alias,
    supabaseProjectRef: EXPECTED.stagingRef,
    variableCount: requiredNames.length,
    branchScoped: true,
    productionExcluded: true,
    stripe: 'disabled',
    cron: 'disabled',
    smtp: 'disabled',
    anthropic: 'disabled',
    fallbackFilesLoaded: false,
  }
}

function main() {
  const manifestIndex = process.argv.indexOf('--manifest')
  if (manifestIndex === -1 || !process.argv[manifestIndex + 1]) {
    throw new Error('Missing --manifest')
  }
  const manifest = JSON.parse(
    readFileSync(resolve(process.argv[manifestIndex + 1]), 'utf8'),
  )
  const placeholder = 'validated_private_staging_key'
  const result = assertPhase6PreviewPlan({
    manifest,
    variables: buildPhase6PreviewVariablePlan({
      manifest,
      anonKey: placeholder,
      serviceRoleKey: placeholder,
    }),
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `Phase 6 Vercel Preview guard refused: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    )
    process.exitCode = 1
  }
}
