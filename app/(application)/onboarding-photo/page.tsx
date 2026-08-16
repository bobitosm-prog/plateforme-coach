import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingPhotoContent from '@/app/onboarding-photo/OnboardingPhotoContent'

export default function OnboardingPhotoPage() {
  return (
    <AuthIntlProvider>
      <OnboardingPhotoContent />
    </AuthIntlProvider>
  )
}
