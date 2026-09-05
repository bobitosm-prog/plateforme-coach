import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let trustedWriterClient: SupabaseClient | null = null

function getTrustedWriterClient(): SupabaseClient {
  if (trustedWriterClient) return trustedWriterClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Trusted Athena writer is not configured')
  }

  trustedWriterClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return trustedWriterClient
}

type TrustedAssistantMessage = {
  authenticatedUserId: string
  content: string
}

/**
 * Persists a backend-generated Athena response with the trusted assistant role.
 * The caller must pass the user id obtained from a validated server session.
 */
export async function writeTrustedAthenaAssistantMessage({
  authenticatedUserId,
  content,
}: TrustedAssistantMessage): Promise<void> {
  if (!authenticatedUserId || typeof content !== 'string' || !content.trim()) {
    throw new Error('Invalid trusted Athena assistant message')
  }

  const { error } = await getTrustedWriterClient()
    .from('chat_ai_messages')
    .insert({
      user_id: authenticatedUserId,
      role: 'assistant',
      content,
    })

  if (error) {
    throw new Error('Unable to persist trusted Athena assistant message')
  }
}
