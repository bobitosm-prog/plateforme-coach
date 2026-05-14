import { supabase } from './supabase/client'
import { COACH_EMAIL } from './constants'

export async function getRole(userId: string, accessToken: string): Promise<string | null> {

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
      if (data.email === COACH_EMAIL) return 'coach'

      // DB role
      if (data.role === 'coach') return 'coach'

      // Default: client
      return data.role === 'client' || !data.role ? 'client' : data.role
    } catch {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 500)); continue }
      return null
    }
  }
  return null
}
