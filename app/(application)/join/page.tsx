import AuthIntlProvider from '@/components/AuthIntlProvider'
import JoinPageContent from '@/app/join/JoinPageContent'

export const metadata = {
  referrer: 'no-referrer',
}

export default function JoinPage() {
  return (
    <AuthIntlProvider>
      <JoinPageContent />
    </AuthIntlProvider>
  )
}
