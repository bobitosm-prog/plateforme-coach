'use client'
import { supabase } from '@/lib/supabase/client'

/**
 * Fetch wrapper pour les routes /api/admin/*.
 * Récupère le token de session et l'ajoute en Bearer.
 */
export async function adminFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(init.headers || {}),
    },
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(errBody.error || `HTTP ${res.status}`)
  }

  return res.json()
}
