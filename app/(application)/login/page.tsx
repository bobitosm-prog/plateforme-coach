import AuthIntlProvider from '@/components/AuthIntlProvider'
import LoginPageContent from './LoginPageContent'

export default function LoginPage() {
  return (
    <AuthIntlProvider>
      <LoginPageContent />
    </AuthIntlProvider>
  )
}
