import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ connected: false, status: 'error', error: 'Stripe non configuré' })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim())
    const { accountId } = await req.json()

    if (!accountId) {
      return NextResponse.json({ connected: false, status: 'no_account' })
    }

    const account = await stripe.accounts.retrieve(accountId)

    return NextResponse.json({
      connected: account.charges_enabled && account.payouts_enabled,
      status: account.charges_enabled ? 'active' : 'incomplete',
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements?.currently_due || [],
    })
  } catch (error: any) {
    return NextResponse.json({ connected: false, status: 'error', error: error.message })
  }
}
