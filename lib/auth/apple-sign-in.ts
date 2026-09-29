import type { SupabaseClient, User } from '@supabase/supabase-js'

type AppleReply = { status: 'cancelled' } | { status: 'success'; identityToken: string; fullName?: string }
type AppleBridge = { postMessage(message: { nonce: string }): Promise<AppleReply> }
export type AppleSignInResult = { kind: 'redirect' | 'cancelled' } | { kind: 'signed-in'; user: User }

function nativeBridge(): AppleBridge | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { webkit?: { messageHandlers?: { moovxAppleAuth?: AppleBridge } } })
    .webkit?.messageHandlers?.moovxAppleAuth
}

// The existing browser client writes the session into this WKWebView's cookies.
// No token enters a URL, log, native persistent store or cross-window event.
export async function signInWithApple(supabase: SupabaseClient, redirectTo: string): Promise<AppleSignInResult> {
  const bridge = nativeBridge()
  if (!bridge) {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo } })
    if (error) throw new Error('apple_sign_in_failed')
    return { kind: 'redirect' }
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const nonce = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
  const hashedNonce = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  const reply = await bridge.postMessage({ nonce: hashedNonce })
  if (reply?.status === 'cancelled') return { kind: 'cancelled' }
  if (reply?.status !== 'success' || typeof reply.identityToken !== 'string' || !reply.identityToken) {
    throw new Error('apple_sign_in_failed')
  }
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: reply.identityToken, nonce })
  if (error || !data.user || !data.session) throw new Error('apple_sign_in_failed')
  // Apple supplies the name only on first authorization. Preserve existing names.
  if (reply.fullName?.trim() && !data.user.user_metadata?.full_name) {
    await supabase.auth.updateUser({ data: { full_name: reply.fullName.trim().slice(0, 200) } }).catch(() => {})
  }
  return { kind: 'signed-in', user: data.user }
}
