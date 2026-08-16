import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingCoachContent from '@/app/onboarding-coach/OnboardingCoachContent'

export default function OnboardingCoachPage() {
  return (
    <AuthIntlProvider>
      <OnboardingCoachContent />
    </AuthIntlProvider>
  )
}
