import { NextResponse } from 'next/server'
import { handleAdminAuthError, verifyAdmin } from '@/lib/admin/auth'
import { buildRuntimeEnvironmentDiagnostic } from '@/lib/preproduction/runtime-environment-diagnostic'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const rateLimit = checkRateLimit(
      `rc1-environment:${admin.userId}:${ip}`,
      5,
      60_000,
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'private, no-store, max-age=0',
            'Retry-After': String(rateLimit.retryAfter ?? 60),
          },
        },
      )
    }

    return NextResponse.json(
      buildRuntimeEnvironmentDiagnostic(process.env),
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    return handleAdminAuthError(error)
  }
}
