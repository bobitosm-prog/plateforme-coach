import { readFileSync } from 'node:fs'

export const CRON_JOB_DEFINITIONS = [
  {
    name: 'weekly-diagnostic-auto',
    schedule: '0 18 * * *',
    path: '/api/weekly-diagnostic/cron',
  },
  {
    name: 'training-regen-auto',
    schedule: '0 17 * * *',
    path: '/api/training-regen/cron',
  },
  {
    name: 'streak-reminder-summer',
    schedule: '0 16 * * *',
    path: '/api/streak-reminder/cron',
  },
  {
    name: 'streak-reminder-winter',
    schedule: '0 17 * * *',
    path: '/api/streak-reminder/cron',
  },
]

function required(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

function parseHttpsOrigin(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} must be a valid URL`)
  }
  if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS`)
  if (url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${label} must be an HTTPS origin without credentials, port, path, query, or hash`)
  }
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(`${label} must not be local`)
  }
  return url
}

/**
 * @param {{
 *   environment: string,
 *   baseUrl: string,
 *   expectedPreviewBaseUrl?: string,
 *   cronSecretPresent: boolean,
 * }} input
 */
export function createCronConfigurationPlan({
  environment,
  baseUrl,
  expectedPreviewBaseUrl,
  cronSecretPresent,
}) {
  const normalizedEnvironment = required(environment, 'environment')
  if (!['production', 'staging'].includes(normalizedEnvironment)) {
    throw new Error('environment must be production or staging')
  }

  const url = parseHttpsOrigin(required(baseUrl, 'baseUrl'), 'baseUrl')
  const normalizedBaseUrl = url.origin

  if (!cronSecretPresent) throw new Error('cron secret is required')

  if (normalizedEnvironment === 'production') {
    if (normalizedBaseUrl !== 'https://app.moovx.ch') {
      throw new Error('production cron URL must be exactly https://app.moovx.ch')
    }
  } else {
    const expectedUrl = parseHttpsOrigin(
      required(expectedPreviewBaseUrl, 'expectedPreviewBaseUrl'),
      'expectedPreviewBaseUrl',
    )
    if (normalizedBaseUrl !== expectedUrl.origin) {
      throw new Error('staging cron URL must match the manifest Preview alias')
    }
    if (
      normalizedBaseUrl === 'https://app.moovx.ch'
      || url.hostname === 'moovx.ch'
      || url.hostname.endsWith('.moovx.ch')
    ) {
      throw new Error('production MoovX host is forbidden in staging')
    }
    if (!url.hostname.endsWith('.vercel.app')) {
      throw new Error('staging cron URL must use a Vercel Preview alias')
    }
  }

  return {
    environment: normalizedEnvironment,
    baseUrl: normalizedBaseUrl,
    secretSource: 'environment',
    secretPersistedIn: 'supabase_vault',
    jobs: CRON_JOB_DEFINITIONS.map(job => ({
      ...job,
      url: `${normalizedBaseUrl}${job.path}`,
    })),
  }
}

export function assertCronRunnerContainsNoSecret(runnerPath) {
  const source = readFileSync(runnerPath, 'utf8')
  const forbidden = [
    /Bearer\s+[A-Za-z0-9_-]{16,}/,
    /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+/,
    /YOUR_CRON_SECRET_HERE/,
    /<CRON_SECRET>/,
  ]
  if (forbidden.some(pattern => pattern.test(source))) {
    throw new Error('cron runner contains a clear-text secret or historical placeholder')
  }
}
