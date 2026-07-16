import type { User } from '@supabase/supabase-js'
import type { DatabaseClient } from '@/lib/supabase/types'
import type { RepositoryResult } from '@/lib/repositories/result'

export interface AuthenticatedIdentity {
  id: string
  email: string | null
}

export type IdentityResult =
  | { ok: true; kind: 'authenticated'; data: AuthenticatedIdentity }
  | { ok: false; kind: 'anonymous' }
  | { ok: false; kind: 'failure'; error: { kind: 'auth'; contextCode?: string } }

function minimalIdentity(user: User): AuthenticatedIdentity {
  return { id: user.id, email: user.email ?? null }
}

export function createIdentityRepository(client: DatabaseClient) {
  return {
    async getCurrent(): Promise<IdentityResult> {
      const { data, error } = await client.auth.getUser()
      if (error) {
        const code = 'code' in error && typeof error.code === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(error.code) ? error.code : undefined
        return { ok: false, kind: 'failure', error: { kind: 'auth', ...(code ? { contextCode: code } : {}) } }
      }
      if (!data.user) return { ok: false, kind: 'anonymous' }
      return { ok: true, kind: 'authenticated', data: minimalIdentity(data.user) }
    },
  }
}

export type IdentityRepository = ReturnType<typeof createIdentityRepository>
export type { RepositoryResult }
