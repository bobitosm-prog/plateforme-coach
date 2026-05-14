import 'server-only'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ADMIN_EMAIL } from '@/lib/constants'

export class AdminAuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/**
 * Vérifie qu'une requête API admin provient bien de l'admin.
 *
 * Flow :
 * 1. Extrait le Bearer token de l'header Authorization
 * 2. Valide le token via supabaseAdmin.auth.getUser()
 * 3. Compare l'email au ADMIN_EMAIL constant
 *
 * À appeler EN PREMIER dans CHAQUE route handler admin.
 *
 * @throws AdminAuthError 401 si pas de token / token invalide
 * @throws AdminAuthError 403 si user n'est pas l'admin
 */
export async function verifyAdmin(req: Request): Promise<{
  userId: string
  email: string
}> {
  const authHeader = req.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AdminAuthError(401, 'Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    throw new AdminAuthError(401, 'Empty bearer token')
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    throw new AdminAuthError(401, 'Invalid or expired token')
  }

  const email = data.user.email
  if (!email || email !== ADMIN_EMAIL) {
    throw new AdminAuthError(403, 'Forbidden: admin access only')
  }

  return { userId: data.user.id, email }
}

/**
 * Wrapper pour transformer une AdminAuthError en NextResponse.
 * Usage :
 *   try { const admin = await verifyAdmin(req); ... }
 *   catch (e) { return handleAdminAuthError(e) }
 */
export function handleAdminAuthError(err: unknown): NextResponse {
  if (err instanceof AdminAuthError) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status }
    )
  }
  console.error('[admin-auth] Unexpected error:', err)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
