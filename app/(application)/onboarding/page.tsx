import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingContent from '@/app/onboarding/OnboardingContent'

export default function OnboardingPage() {
  return (
    <AuthIntlProvider>
      <OnboardingContent />
    </AuthIntlProvider>
  )
}
