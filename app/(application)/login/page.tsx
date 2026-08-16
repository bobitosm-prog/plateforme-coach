import AuthIntlProvider from '@/components/AuthIntlProvider'
import LoginPageContent from '@/app/login/LoginPageContent'

export default function LoginPage() {
  return (
    <AuthIntlProvider>
      <LoginPageContent />
    </AuthIntlProvider>
  )
}
