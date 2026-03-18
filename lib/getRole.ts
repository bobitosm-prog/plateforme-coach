import { createBrowserClient } from '@supabase/ssr'

export async function getRole(userId: string, accessToken: string): Promise<string | null> {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    return data?.role ?? null
  } catch {
    return null
  }
}
