import type { SupabaseClient } from '@supabase/supabase-js'
import {
  POST_AUTH_PROFILE_SELECT,
  classifyProfileResult,
  resolvePostAuthDestination,
  type PostAuthDecision,
  type PostAuthProfile,
  type ProfileState,
} from './post-auth-routing'

type SupabaseLike = Pick<SupabaseClient, 'from' | 'rpc'>

export interface ClientPostAuthResult {
  profileState: Exclude<ProfileState, 'loading'>
  profile: PostAuthProfile | null
  decision: PostAuthDecision
}

function safeMetadataRole(value: unknown): 'client' | 'coach' | null {
  return value === 'client' || value === 'coach' ? value : null
}

async function readProfile(supabase: SupabaseLike, userId: string) {
  const result = await supabase
    .from('profiles')
    .select(POST_AUTH_PROFILE_SELECT)
    .eq('id', userId)
    .single()
  return classifyProfileResult<PostAuthProfile>(result)
}

export async function resolveClientPostAuth(input: {
  supabase: SupabaseLike
  user: { id: string; user_metadata?: Record<string, unknown> }
  joinIntent?: boolean
}): Promise<ClientPostAuthResult> {
  let result = await readProfile(input.supabase, input.user.id)

  if (result.state === 'ready' && !result.profile?.role) {
    const metadataRole = safeMetadataRole(input.user.user_metadata?.role)
    if (metadataRole) {
      const repair = await input.supabase.rpc('set_role', { p_role: metadataRole })
      if (repair.error) {
        return {
          profileState: 'error',
          profile: null,
          decision: resolvePostAuthDestination({ authenticated: true, profileState: 'error' }),
        }
      }
      // Never trust metadata as the final authority. Re-read the protected DB role.
      result = await readProfile(input.supabase, input.user.id)
    }
  }

  const decision = resolvePostAuthDestination({
    authenticated: true,
    profileState: result.state,
    profile: result.profile,
    joinIntent: input.joinIntent,
    adminExempt: Boolean(result.profile?.email && result.profile.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bobitosm@gmail.com')),
  })

  return { profileState: result.state, profile: result.profile, decision }
}
