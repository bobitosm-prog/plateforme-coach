import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingRouteGuard from '@/components/auth/OnboardingRouteGuard'
import OnboardingCoachContent from './OnboardingCoachContent'

export default function OnboardingCoachPage() {
  return (
    <AuthIntlProvider>
      <OnboardingRouteGuard route="/onboarding-coach">
        <OnboardingCoachContent />
      </OnboardingRouteGuard>
    </AuthIntlProvider>
  )
}
