import { NextResponse } from 'next/server'

/**
 * Compatibility tombstone. Invitation emails must be created server-side by
 * POST /api/coach/invitations; browser-provided links are never delivered.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'LEGACY_INVITATION_DISABLED',
        message: 'Use the verified coach invitation endpoint',
      },
    },
    { status: 410 },
  )
}
