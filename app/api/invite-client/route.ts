import { NextResponse } from 'next/server'

/**
 * Legacy endpoint intentionally disabled. Invitation V2 has a single creation
 * authority at POST /api/coach/invitations and never accepts a browser link.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'INVITATION_LEGACY_DISABLED', message: 'Invitation endpoint retired' },
    },
    { status: 410 },
  )
}
