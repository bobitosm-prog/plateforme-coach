import { NextResponse } from 'next/server'

export function POST(_request: Request) {
  void _request
  return NextResponse.json(
    {
      error: 'Legacy coach assignment is no longer supported.',
      code: 'LEGACY_ASSIGN_COACH_DISABLED',
    },
    { status: 410 },
  )
}
