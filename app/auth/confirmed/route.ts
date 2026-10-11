import { NextRequest, NextResponse } from 'next/server'

// No credential in the app link: the native app still requires a real login.
export function GET(request: NextRequest) {
  const join = request.nextUrl.searchParams.get('next') === '/join'
  return new NextResponse(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Retour dans MoovX</title><style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#111110;color:#f5f3ed;font-family:Arial,sans-serif}main{width:100%;max-width:440px;padding:32px;border-radius:24px;background:#211f18;border:1px solid #39352a}h1{font-size:32px}p{color:#bdb7a8;line-height:1.6}a{display:block;padding:16px;text-align:center;border-radius:12px;color:#dfc477;font-weight:700}.primary{margin-top:24px;background:#dfc477;color:#16150f;text-decoration:none}a:focus-visible{outline:3px solid white;outline-offset:4px}</style></head><body><main><h1>Retrouve MoovX.</h1><p>Ton e-mail est confirmé. Ouvre l’app pour te connecter avec ton e-mail et ton mot de passe.</p><a class="primary" href="moovx://auth/confirmed${join ? '?next=%2Fjoin' : ''}">Ouvrir MoovX</a><a href="/login?confirmed=1${join ? '&amp;next=%2Fjoin' : ''}">Continuer dans le navigateur</a></main></body></html>`, { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  } })
}
