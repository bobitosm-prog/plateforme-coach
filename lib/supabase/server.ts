import 'server-only'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptionsWithName } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'
import { getSupabaseServerEnv } from '@/lib/supabase/env'

export interface SupabaseCookieStore {
  getAll(): { name: string; value: string }[]
  set(name: string, value: string, options?: CookieOptionsWithName): void
}

/**
 * Client Supabase server-side pour route handlers (app/api/.../route.ts).
 * Respecte les cookies de session de l'utilisateur. Soumis aux RLS.
 */
export async function createSupabaseServerClient(cookieStore?: SupabaseCookieStore): Promise<SupabaseClient<Database>> {
  const currentCookieStore = cookieStore ?? await cookies()
  const { url, anonKey } = getSupabaseServerEnv()
  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => currentCookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              currentCookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — ignore (middleware refreshes)
          }
        },
      },
    }
  )
}

// Compatibility wrapper: existing routes keep their historical broad type until
// they are migrated individually against the generated schema.
export async function createSupabaseRouteClient(): Promise<SupabaseClient> {
  return createSupabaseServerClient()
}
