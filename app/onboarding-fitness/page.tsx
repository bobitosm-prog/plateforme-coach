import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingFitnessContent from './OnboardingFitnessContent'

export default function OnboardingFitnessPage() {
  return (
    <AuthIntlProvider>
      <OnboardingFitnessContent />
    </AuthIntlProvider>
  )
}
