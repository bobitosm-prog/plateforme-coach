export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'DEFAULT_COACH_ASSIGNMENT_DEPRECATED' },
    { status: 410 },
  )
}
