import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

let singleton: SupabaseClient<Database> | undefined

function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) throw new Error('Supabase browser configuration is incomplete')
  return { url, anonKey }
}

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  const { url, anonKey } = publicConfig()
  return createBrowserClient<Database>(url, anonKey)
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  singleton ??= createSupabaseBrowserClient()
  return singleton
}
