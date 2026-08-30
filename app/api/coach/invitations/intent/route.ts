export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { coachInvitationBodySchema } from '@/lib/coach-invitations/token'

const COOKIE_NAME = 'moovx_coach_invitation_intent'
const COOKIE_PATH = '/'
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function clearIntent(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: COOKIE_PATH,
  })
  return response
}

export async function POST(request: NextRequest) {
  const parsed = coachInvitationBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return clearIntent(NextResponse.json({ success: false }, { status: 400 }))
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, parsed.data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: COOKIE_PATH,
  })
  return response
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const parsed = coachInvitationBodySchema.safeParse({ token })
  if (!parsed.success) {
    return clearIntent(NextResponse.json({ success: false }, { status: 404 }))
  }
  return NextResponse.json({ success: true, data: { token: parsed.data.token } })
}

export async function DELETE() {
  return clearIntent(NextResponse.json({ success: true }))
}
