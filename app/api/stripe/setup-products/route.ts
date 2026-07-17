import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { createSecurityAudit } from '@/lib/security/audit-log'
import { createBillingProductPort, setupBillingProducts } from '@/lib/billing/products'

export async function POST(req: Request) {
  const audit = createSecurityAudit(req)
  try {
    await verifyAdmin(req)
  } catch (error) {
    const response = handleAdminAuthError(error)
    return audit.reject(response, { event: 'ADMIN_OPERATION_REJECTED', domain: 'admin', operation: 'POST /api/stripe/setup-products', outcome: response.status >= 500 ? 'failed' : 'rejected', reason: response.status === 401 ? 'AUTH_REQUIRED' : response.status === 403 ? 'ADMIN_REQUIRED' : 'ADMIN_AUTH_FAILED', status: response.status })
  }

  try {
    return NextResponse.json(await setupBillingProducts(createBillingProductPort(process.env.STRIPE_SECRET_KEY!)))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
