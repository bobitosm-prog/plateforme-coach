import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Server-side guard: check if the requesting user is an invited client.
 * Returns a 403 NextResponse if blocked, or null if allowed.
 * Pass the userId from the request body.
 */
export async function guardInvitedClient(userId: string | undefined): Promise<NextResponse | null> {
  if (!userId) return null // No user — let other auth handle it

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null // Can't check without service key

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', userId)
    .maybeSingle()

  if (data?.subscription_type === 'invited') {
    return NextResponse.json(
      { error: 'Cette fonctionnalité est gérée par ton coach. Contacte-le directement.' },
      { status: 403 }
    )
  }

  return null // Allowed
}
