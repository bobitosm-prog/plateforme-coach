import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin
  const origin = request.headers.get('origin')
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ success: false }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  const role = body?.role
  if (role !== 'client' && role !== 'coach') {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('moovx_oauth_role_intent', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/auth/callback',
  })
  return response
}
