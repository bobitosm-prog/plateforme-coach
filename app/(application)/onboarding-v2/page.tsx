import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingRouteGuard from '@/components/auth/OnboardingRouteGuard'
import OnboardingV2Content from './OnboardingV2Content'

export default function OnboardingV2Page() {
  return (
    <AuthIntlProvider>
      <OnboardingRouteGuard route="/onboarding-v2">
        <OnboardingV2Content />
      </OnboardingRouteGuard>
    </AuthIntlProvider>
  )
}
