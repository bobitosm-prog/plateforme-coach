import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingContent from './OnboardingContent'

export default function OnboardingPage() {
  return (
    <AuthIntlProvider>
      <OnboardingContent />
    </AuthIntlProvider>
  )
}
