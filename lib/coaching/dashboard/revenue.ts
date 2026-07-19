export type PaidPayment = { amount: number; paid_at: string }
export type CoachRevenue = { monthRevenue: number; yearRevenue: number; totalRevenue: number; monthPaymentsCount: number }
export function aggregateCoachRevenue(payments: readonly PaidPayment[], now: Date): CoachRevenue {
  const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const year = new Date(now.getFullYear(), 0, 1).toISOString()
  return payments.reduce<CoachRevenue>((out, payment) => {
    const amount = Number.isFinite(payment.amount) ? payment.amount : 0
    out.totalRevenue += amount
    if (payment.paid_at >= year) out.yearRevenue += amount
    if (payment.paid_at >= month) { out.monthRevenue += amount; out.monthPaymentsCount += 1 }
    return out
  }, { monthRevenue: 0, yearRevenue: 0, totalRevenue: 0, monthPaymentsCount: 0 })
}
