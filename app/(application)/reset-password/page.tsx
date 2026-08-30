import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AuthIntlProvider from '@/components/AuthIntlProvider'
import ResetPasswordContent from './ResetPasswordContent'

export default async function ResetPasswordPage() {
  const cookieStore = await cookies()
  if (cookieStore.get('moovx_recovery_session')?.value !== '1') {
    redirect('/login?auth_error=recovery_error')
  }

  return (
    <AuthIntlProvider>
      <ResetPasswordContent />
    </AuthIntlProvider>
  )
}
