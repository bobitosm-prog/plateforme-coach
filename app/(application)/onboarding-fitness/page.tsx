import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingRouteGuard from '@/components/auth/OnboardingRouteGuard'
import OnboardingFitnessContent from './OnboardingFitnessContent'

export default function OnboardingFitnessPage() {
  return (
    <AuthIntlProvider>
      <OnboardingRouteGuard route="/onboarding-fitness">
        <OnboardingFitnessContent />
      </OnboardingRouteGuard>
    </AuthIntlProvider>
  )
}
