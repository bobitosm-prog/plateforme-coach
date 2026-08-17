import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingPhotoContent from './OnboardingPhotoContent'

export default function OnboardingPhotoPage() {
  return (
    <AuthIntlProvider>
      <OnboardingPhotoContent />
    </AuthIntlProvider>
  )
}
