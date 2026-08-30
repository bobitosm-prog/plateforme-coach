import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingRouteGuard from '@/components/auth/OnboardingRouteGuard'
import OnboardingPhotoContent from './OnboardingPhotoContent'

export default function OnboardingPhotoPage() {
  return (
    <AuthIntlProvider>
      <OnboardingRouteGuard route="/onboarding-photo">
        <OnboardingPhotoContent />
      </OnboardingRouteGuard>
    </AuthIntlProvider>
  )
}
