import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase browser mutualisé (singleton).
 * À utiliser dans tous les composants client ('use client').
 * Respecte les RLS de l'utilisateur connecté.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
