import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingCoachContent from './OnboardingCoachContent'

export default function OnboardingCoachPage() {
  return (
    <AuthIntlProvider>
      <OnboardingCoachContent />
    </AuthIntlProvider>
  )
}
