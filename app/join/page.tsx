import AuthIntlProvider from '@/components/AuthIntlProvider'
import JoinPageContent from './JoinPageContent'

export default function JoinPage() {
  return (
    <AuthIntlProvider>
      <JoinPageContent />
    </AuthIntlProvider>
  )
}
