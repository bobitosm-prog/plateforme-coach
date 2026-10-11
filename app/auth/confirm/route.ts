import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
const headers = {
  'Cache-Control': 'no-store, max-age=0',
  // Preserve same-origin POST validation without disclosing the token-bearing URL.
  'Referrer-Policy': 'strict-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
}
// Supabase prefixes signup hashes with `pkce_` for SSR/PKCE registrations.
// Keep it intact for verifyOtp; only accept an HTML-safe, bounded token format.
const validToken = (value: unknown): value is string => typeof value === 'string' && /^(?:pkce_)?[a-f0-9]{32,128}$/i.test(value)

function invitationNext(value: string | null, origin: string) {
  if (value === '/join') return '/join'
  try {
    const url = new URL(value || '')
    return url.origin === origin && url.pathname === '/auth/callback' && url.searchParams.get('next') === '/join' ? '/join' : ''
  } catch { return '' }
}

function redirect(origin: string, success: boolean, next = '') {
  return NextResponse.redirect(`${origin}/login?${success ? 'confirmed=1' : 'auth_error=confirmation_error'}${next === '/join' ? '&next=%2Fjoin' : ''}`, { status: 303, headers })
}

// GET never consumes the one-time token: mail scanners may open links automatically.
export function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token_hash')
  if (!validToken(token)) return redirect(url.origin, false)
  const next = invitationNext(url.searchParams.get('next'), url.origin)
  let nativeSource = false
  try {
    const destination = new URL(url.searchParams.get('next') || '')
    nativeSource = destination.origin === url.origin && destination.pathname === '/auth/callback' && destination.searchParams.get('source') === 'ios'
  } catch { /* Missing or external destinations stay on the web. */ }
  return new NextResponse(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmer mon e-mail — MoovX</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100dvh;background:#111110;color:#f5f3ed;font-family:Arial,sans-serif;display:grid;place-items:center;padding:24px}main{width:100%;max-width:440px;padding:32px;background:#211f18;border:1px solid #39352a;border-radius:24px}.brand{color:#dfc477;letter-spacing:.25em;font-weight:700}h1{font-size:32px;line-height:1.15;margin:28px 0 16px}p{color:#bdb7a8;line-height:1.6}button,a{display:block;width:100%;padding:16px;border-radius:12px;font:inherit;font-weight:700;text-align:center}button{margin-top:24px;border:0;background:#dfc477;color:#16150f;cursor:pointer}a{margin-top:12px;color:#dfc477}button:focus-visible,a:focus-visible{outline:3px solid white;outline-offset:4px}</style></head><body><main><div class="brand">MOOVX</div><h1>Confirme ton e-mail.</h1><p>Appuie sur le bouton pour valider ton adresse. Tu pourras ensuite te connecter dans MoovX avec ton e-mail et ton mot de passe.</p><form method="post" action="/auth/confirm"><input type="hidden" name="token_hash" value="${token}"><input type="hidden" name="next" value="${next}"><input type="hidden" name="source" value="${nativeSource ? 'ios' : 'web'}"><button type="submit">Confirmer mon e-mail</button></form><a href="/login">Retour à la connexion</a></main></body></html>`, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url)
  if (request.headers.get('origin') !== origin) return new NextResponse(null, { status: 403, headers })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rate = checkRateLimit(`confirm-email:${ip}`, 10, 60_000)
  if (!rate.allowed) return new NextResponse('Trop de tentatives. Réessaie dans une minute.', { status: 429, headers: { ...headers, 'Retry-After': String(rate.retryAfter || 60) } })
  const form = await request.formData().catch(() => null)
  const token = form?.get('token_hash')
  const next = form?.get('next') === '/join' ? '/join' : ''
  if (!validToken(token)) return redirect(origin, false)
  // Validate possession of the email token, independent of PKCE cookies and browser.
  // Never install this temporary session in cookies or replace another logged-in account.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  try {
    const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'email' })
    if (error) return redirect(origin, false)
    await supabase.auth.signOut({ scope: 'local' })
    if (form?.get('source') === 'ios') {
      return NextResponse.redirect(`${origin}/auth/confirmed${next === '/join' ? '?next=%2Fjoin' : ''}`, { status: 303, headers })
    }
    return redirect(origin, true, next)
  } catch { return redirect(origin, false) }
}
