import 'server-only'

function required(value: string | undefined, label: string): string {
  const normalized = value?.trim()
  if (!normalized) throw new Error(`Supabase server configuration is incomplete (${label})`)
  return normalized
}

export function getSupabaseServerEnv() {
  return {
    url: required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'URL missing'),
    anonKey: required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'public credential missing'),
  }
}

export function getSupabaseAdminEnv() {
  return {
    url: required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'URL missing'),
    serviceRoleKey: required(process.env.SUPABASE_SERVICE_ROLE_KEY, 'server credential missing'),
  }
}
