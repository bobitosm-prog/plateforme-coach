'use client'

import useCoachDashboardController from './useCoachDashboardController'

export * from './useCoachDashboardController'
export * from './coach-dashboard-contract'

/** Stable public facade for the coach dashboard. */
export default function useCoachDashboard(...args: Parameters<typeof useCoachDashboardController>) {
  return useCoachDashboardController(...args)
}
