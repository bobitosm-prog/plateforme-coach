const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Fetches the user's role from Supabase with no caching.
 * Uses raw fetch() to bypass the Supabase SDK's session cache.
 */
export async function getRole(userId: string, accessToken: string): Promise<string | null> {
  const url = `${SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${userId}&limit=1&_t=${Date.now()}`
  console.log('[getRole] fetching:', url)
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Cache-Control': 'no-cache, no-store',
      },
      cache: 'no-store',
    })
    console.log('[getRole] response status:', res.status)
    const rows: { role: string }[] = await res.json()
    console.log('[getRole] parsed rows:', rows)
    const role = rows?.[0]?.role ?? null
    console.log('[getRole] returning role:', role)
    return role
  } catch (err) {
    console.error('[getRole] fetch error:', err)
    return null
  }
}
