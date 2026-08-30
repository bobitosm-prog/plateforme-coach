import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingRouteGuard from '@/components/auth/OnboardingRouteGuard'
import OnboardingContent from './OnboardingContent'

export default function OnboardingPage() {
  return (
    <AuthIntlProvider>
      <OnboardingRouteGuard route="/onboarding">
        <OnboardingContent />
      </OnboardingRouteGuard>
    </AuthIntlProvider>
  )
}
