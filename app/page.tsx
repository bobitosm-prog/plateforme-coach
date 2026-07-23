import { Suspense } from 'react'
import DashboardClientIsland from './components/dashboard/DashboardClientIsland'
import DashboardServerFallback from './components/dashboard/DashboardServerFallback'

/**
 * Root App Router server shell.
 *
 * Authentication and profile loading intentionally remain in the existing
 * client authority so the shell neither serializes credentials nor duplicates
 * the owner-scoped initial load.
 */
export default function DashboardPage() {
  return (
    <main data-dashboard-server-shell style={{ minHeight: '100dvh', background: '#0D0B08' }}>
      <h1 className="sr-only">MoovX</h1>
      <Suspense fallback={<DashboardServerFallback />}>
        <DashboardClientIsland />
      </Suspense>
    </main>
  )
}
