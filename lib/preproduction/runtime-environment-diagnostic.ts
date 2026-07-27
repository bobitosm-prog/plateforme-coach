import 'server-only'

type RuntimeEnvironment = Record<string, string | undefined>

export type RuntimeEnvironmentDiagnostic = {
  environment: 'staging' | 'production' | 'preview' | 'development' | 'unknown'
  supabase: {
    project_ref: string | null
  }
  stripe: {
    secret_key_class: 'test' | 'live' | 'unknown'
    webhook_expected_livemode: boolean | 'unknown'
  }
  webhook: {
    platform_secret_present: boolean
    connect_secret_present: boolean
  }
}

function classifyEnvironment(value: string | undefined): RuntimeEnvironmentDiagnostic['environment'] {
  if (
    value === 'staging'
    || value === 'production'
    || value === 'preview'
    || value === 'development'
  ) {
    return value
  }
  return 'unknown'
}

function extractSupabaseProjectRef(value: string | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    const match = /^([a-z0-9]{20})\.supabase\.co$/i.exec(url.hostname)
    return match?.[1]?.toLowerCase() ?? null
  } catch {
    return null
  }
}

function classifyStripeSecret(value: string | undefined): 'test' | 'live' | 'unknown' {
  if (value?.startsWith('sk_test_')) return 'test'
  if (value?.startsWith('sk_live_')) return 'live'
  return 'unknown'
}

function parseExpectedLivemode(value: string | undefined): boolean | 'unknown' {
  if (value === 'true') return true
  if (value === 'false') return false
  return 'unknown'
}

/**
 * Builds an expurgated RC1 operator diagnostic from the runtime environment.
 * The returned contract contains no environment value other than fixed
 * classifications and the public Supabase project reference.
 */
export function buildRuntimeEnvironmentDiagnostic(
  environment: RuntimeEnvironment,
): RuntimeEnvironmentDiagnostic {
  return {
    environment: classifyEnvironment(environment.MOOVX_ENVIRONMENT),
    supabase: {
      project_ref: extractSupabaseProjectRef(environment.NEXT_PUBLIC_SUPABASE_URL),
    },
    stripe: {
      secret_key_class: classifyStripeSecret(environment.STRIPE_SECRET_KEY),
      webhook_expected_livemode: parseExpectedLivemode(
        environment.STRIPE_WEBHOOK_EXPECTED_LIVEMODE,
      ),
    },
    webhook: {
      platform_secret_present: Boolean(environment.STRIPE_PLATFORM_WEBHOOK_SECRET),
      connect_secret_present: Boolean(environment.STRIPE_CONNECT_WEBHOOK_SECRET),
    },
  }
}
