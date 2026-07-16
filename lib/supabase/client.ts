import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

/**
 * Client Supabase browser mutualisé (singleton).
 * À utiliser dans tous les composants client ('use client').
 * Respecte les RLS de l'utilisateur connecté.
 */
export const supabase = getSupabaseBrowserClient()
export { createSupabaseBrowserClient, getSupabaseBrowserClient } from '@/lib/supabase/browser'
