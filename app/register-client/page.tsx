import AuthIntlProvider from '@/components/AuthIntlProvider'
import RegisterClientContent from './RegisterClientContent'

export default function RegisterClientPage() {
  return (
    <AuthIntlProvider>
      <RegisterClientContent />
    </AuthIntlProvider>
  )
}
