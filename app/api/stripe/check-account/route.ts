import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import {
  ConnectServiceError,
  createStripeConnectPort,
  readConnectStatus,
} from '@/lib/billing/connect'

export async function POST() {
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, stripe_account_id')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  if (profile.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return NextResponse.json({ connected: false, status: 'error', error: 'Stripe non configuré' })

  try {
    return NextResponse.json(await readConnectStatus({
      accountId: profile.stripe_account_id,
      stripe: createStripeConnectPort(secret),
    }))
  } catch (error) {
    if (error instanceof ConnectServiceError && error.code === 'PROVIDER_ERROR') {
      return NextResponse.json({ connected: false, status: 'error', error: 'Erreur Stripe Connect' })
    }
    return NextResponse.json({ connected: false, status: 'error', error: 'Erreur Stripe Connect' })
  }
}
