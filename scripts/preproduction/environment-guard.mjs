import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'

export const PRODUCTION_SUPABASE_PROJECT_REF = 'njlzossopgknanhkzcbk'
export const STAGING_SUPABASE_ORGANIZATION_ID = 'mlasmyrpaaqnhuuhuzma'
export const STAGING_SUPABASE_REGIONS = new Set(['eu-central-1', 'eu-central-2'])
export const PRODUCTION_HOSTS = new Set([
  'app.moovx.ch',
  'moovx.ch',
  `${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
])

const ENVIRONMENT_URL_NAMES = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
]

const ENVIRONMENT_PROJECT_REF_NAMES = [
  'SUPABASE_PROJECT_REF',
  'SUPABASE_STAGING_PROJECT_REF',
]

const STRIPE_KEY_NAMES = [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_RECONCILIATION_KEY',
  'STRIPE_SECRET_KEY',
]

const SECRET_FIELD_PATTERN = /(password|secret|token|private.?key|service.?role|anon.?key)/i

const IMMUTABLE_PRODUCTION_CRON_MIGRATIONS = new Map([
  ['20260529120000_schedule_weekly_diagnostic_cron.sql', {
    sha256: '1168f4ec5c131e521e108e2b97905c0f784c8e5dda9c84b8e63b83a265ca2d0a',
    productionReferences: 1,
  }],
  ['20260529140000_update_weekly_diagnostic_cron_to_daily.sql', {
    sha256: '234a7be3b25747e1fc8b49c2077c8447faa8498f26c27d447ff500e677013a5b',
    productionReferences: 1,
  }],
  ['20260531110137_schedule_training_regen_cron.sql', {
    sha256: 'fd4722777d1cf1a85a6a29be7c25904b6a383cf317805300db884c2b7285a264',
    productionReferences: 1,
  }],
  ['20260613_streak_reminder.sql', {
    sha256: '17895af49d23d324d7bf44ebd772cd82bedb3973833f7988fe55536abfe89f84',
    productionReferences: 2,
  }],
  ['20260725190000_configure_environment_scoped_cron.sql', {
    sha256: 'e7d59231733fcfdefca669f9fb2809b70bd0faedadbadb8c0e838901af627480',
    productionReferences: 1,
  }],
])

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required staging value: ${label}`)
  }
  return value.trim()
}

function hostFromValue(value, label) {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    throw new Error(`Invalid URL in ${label}`)
  }
}

function containsProductionReference(value) {
  const normalized = String(value).toLowerCase()
  return normalized.includes(PRODUCTION_SUPABASE_PROJECT_REF)
    || [...PRODUCTION_HOSTS].some(host => normalized === host || normalized.includes(`://${host}`))
}

function assertManifestHasNoSecrets(value, path = 'manifest') {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (SECRET_FIELD_PATTERN.test(key)) {
      throw new Error(`Secret-like field forbidden in staging manifest: ${childPath}`)
    }
    assertManifestHasNoSecrets(child, childPath)
  }
}

function assertEnvironmentIsSafe(environment) {
  if (environment.MOOVX_ENVIRONMENT !== 'staging') {
    throw new Error('MOOVX_ENVIRONMENT must be exactly staging')
  }
  if (environment.VERCEL_ENV && environment.VERCEL_ENV !== 'preview') {
    throw new Error(`VERCEL_ENV must be preview when present, received ${environment.VERCEL_ENV}`)
  }

  for (const name of ENVIRONMENT_URL_NAMES) {
    const value = environment[name]
    if (!value) continue
    const host = hostFromValue(value, name)
    if (PRODUCTION_HOSTS.has(host) || containsProductionReference(value)) {
      throw new Error(`Production URL forbidden in ${name}`)
    }
  }

  for (const name of ENVIRONMENT_PROJECT_REF_NAMES) {
    const value = environment[name]
    if (value && containsProductionReference(value)) {
      throw new Error(`Production Supabase project forbidden in ${name}`)
    }
  }

  for (const name of STRIPE_KEY_NAMES) {
    const value = environment[name]
    if (value && /_(live)_/i.test(value)) {
      throw new Error(`Stripe live credential forbidden in ${name}`)
    }
  }
}

/**
 * @param {{
 *   manifest: Record<string, any>,
 *   environment?: Record<string, string | undefined>,
 * }} input
 */
export function assertPreCreateEnvironment({
  manifest,
  environment = process.env,
}) {
  assertManifestHasNoSecrets(manifest)
  assertEnvironmentIsSafe(environment)

  if (manifest?.schemaVersion !== 1) {
    throw new Error('Unsupported or missing staging manifest schemaVersion')
  }
  if (manifest.environment !== 'staging') {
    throw new Error('Manifest environment must be exactly staging')
  }

  const supabase = manifest.supabase
  if (!supabase || typeof supabase !== 'object') {
    throw new Error('Missing required staging value: manifest.supabase')
  }

  const organizationId = requiredString(supabase.organizationId, 'manifest.supabase.organizationId')
  const projectName = requiredString(supabase.projectName, 'manifest.supabase.projectName')
  const region = requiredString(supabase.region, 'manifest.supabase.region')
  const size = requiredString(supabase.size, 'manifest.supabase.size')

  if (organizationId !== STAGING_SUPABASE_ORGANIZATION_ID) {
    throw new Error(`Staging organization must be ${STAGING_SUPABASE_ORGANIZATION_ID}`)
  }
  if (projectName !== 'moovx-staging') {
    throw new Error(`Staging project name must be moovx-staging, received ${projectName}`)
  }
  if (!STAGING_SUPABASE_REGIONS.has(region)) {
    throw new Error(`Staging region must be one of ${[...STAGING_SUPABASE_REGIONS].join(', ')}, received ${region}`)
  }
  if (size !== 'nano') {
    throw new Error(`Staging compute size must be nano, received ${size}`)
  }
  if (supabase.projectRef !== undefined && supabase.projectRef !== null) {
    throw new Error('Pre-create manifest must not contain a Supabase project ref')
  }
  if (containsProductionReference(organizationId) || containsProductionReference(projectName)) {
    throw new Error('Production reference forbidden in staging manifest')
  }

  return {
    environment: 'staging',
    organizationId,
    projectName,
    region,
    size,
    productionProjectExcluded: true,
    productionVariablesLoaded: false,
  }
}

export function readManifestForPreCreate(manifestPath, repositoryRoot = process.cwd()) {
  if (!isAbsolute(manifestPath)) {
    throw new Error('Staging manifest path must be absolute')
  }

  const absoluteManifestPath = resolve(manifestPath)
  const absoluteRepositoryRoot = resolve(repositoryRoot)
  const pathFromRepository = relative(absoluteRepositoryRoot, absoluteManifestPath)
  if (pathFromRepository === '' || (!pathFromRepository.startsWith('..') && !isAbsolute(pathFromRepository))) {
    throw new Error('Staging manifest must be stored outside the Git workspace')
  }

  const mode = statSync(absoluteManifestPath).mode & 0o777
  if ((mode & 0o077) !== 0) {
    throw new Error('Staging manifest permissions must not grant group or public access')
  }

  return JSON.parse(readFileSync(absoluteManifestPath, 'utf8'))
}

export function findForbiddenMigrationReferences(migrationsRoot) {
  const findings = []
  for (const entry of readdirSync(migrationsRoot, { withFileTypes: true })) {
    const entryPath = join(migrationsRoot, entry.name)
    if (entry.isDirectory()) {
      findings.push(...findForbiddenMigrationReferences(entryPath))
      continue
    }
    if (!entry.isFile() || !entry.name.endsWith('.sql')) continue

    const lines = readFileSync(entryPath, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      if (containsProductionReference(line)) {
        findings.push({
          file: entryPath,
          line: index + 1,
        })
      }
    })
  }
  return findings
}

export function assertMigrationSourcesSafe(migrationsRoot) {
  const findings = findForbiddenMigrationReferences(migrationsRoot)
  const grouped = new Map()
  for (const finding of findings) {
    const fileFindings = grouped.get(finding.file) ?? []
    fileFindings.push(finding)
    grouped.set(finding.file, fileFindings)
  }

  for (const [file, fileFindings] of grouped) {
    const allowed = IMMUTABLE_PRODUCTION_CRON_MIGRATIONS.get(basename(file))
    const source = readFileSync(file)
    const sha256 = createHash('sha256').update(source).digest('hex')
    if (
      !allowed
      || allowed.sha256 !== sha256
      || allowed.productionReferences !== fileFindings.length
    ) {
      const locations = fileFindings.map(finding => `${finding.file}:${finding.line}`).join(', ')
      throw new Error(`Production references forbidden in migration sources: ${locations}`)
    }
  }

  return {
    allowedImmutableProductionReferences: findings.length,
    requiresPgCronAbsentDuringHistoricalReplay: findings.length > 0,
  }
}
