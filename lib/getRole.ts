import { createBrowserClient } from '@supabase/ssr'
import { ADMIN_EMAIL, COACH_EMAIL } from './constants'

export async function getRole(userId: string, accessToken: string): Promise<string | null> {
  const supabase = createBrowserClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  )

  // Retry up to 3 times on failure (transient network/RLS errors)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', userId)
        .single()

      if (error || !data) {
        if (attempt < 2) { await new Promise(r => setTimeout(r, 500)); continue }
        return null
      }

      // Email-based override (safety net)
      if (data.email === ADMIN_EMAIL) return 'super_admin'
      if (data.email === COACH_EMAIL) return 'coach'

      // DB role (only trust 'coach' if explicitly set, never trust 'super_admin' from DB for non-admin emails)
      if (data.role === 'coach') return 'coach'

      // Default: client (null, 'client', or any other value)
      return data.role === 'client' || !data.role ? 'client' : data.role
    } catch {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 500)); continue }
      return null
    }
  }
  return null
}
