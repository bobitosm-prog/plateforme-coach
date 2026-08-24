import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { loadEffectiveEntitlementContext } from './entitlements/server-context'

type GuardDependencies = {
  supabaseUrl?: string
  serviceKey?: string
  createServerClient?: typeof createClient
  loadContext?: typeof loadEffectiveEntitlementContext
}

function deniedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Autorisation impossible' },
    { status: 403 },
  )
}

/**
 * Server-side guard for users whose product capabilities are coach-managed.
 * Returns a 403 NextResponse if blocked, or null if allowed.
 * Pass the userId from the request body.
 */
export async function guardCoachManagedCapabilities(
  userId: string | undefined,
  dependencies: GuardDependencies = {},
): Promise<NextResponse | null> {
  if (!userId) return deniedResponse()

  const supabaseUrl = dependencies.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = dependencies.serviceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return deniedResponse()

  try {
    const createServerClient = dependencies.createServerClient ?? createClient
    const loadContext = dependencies.loadContext ?? loadEffectiveEntitlementContext
    const supabase = createServerClient(supabaseUrl, serviceKey)
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) return deniedResponse()

    const { capabilities } = await loadContext(
      userId,
      data.subscription_type,
    )
    if (!capabilities.ai) {
      return NextResponse.json(
        { error: 'Cette fonctionnalité est gérée par ton coach. Contacte-le directement.' },
        { status: 403 },
      )
    }

    return null
  } catch {
    return deniedResponse()
  }
}
