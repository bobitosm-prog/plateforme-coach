import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingFitnessContent from '@/app/onboarding-fitness/OnboardingFitnessContent'

export default function OnboardingFitnessPage() {
  return (
    <AuthIntlProvider>
      <OnboardingFitnessContent />
    </AuthIntlProvider>
  )
}
