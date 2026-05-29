import { use } from 'react'
import AuthIntlProvider from '@/components/AuthIntlProvider'
import WeeklyDiagnosticDetailContent from './WeeklyDiagnosticDetailContent'

export default function WeeklyDiagnosticDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <AuthIntlProvider>
      <WeeklyDiagnosticDetailContent id={id} />
    </AuthIntlProvider>
  )
}
