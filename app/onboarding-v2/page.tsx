import AuthIntlProvider from '@/components/AuthIntlProvider'
import OnboardingV2Content from './OnboardingV2Content'

export default function OnboardingV2Page() {
  return (
    <AuthIntlProvider>
      <OnboardingV2Content />
    </AuthIntlProvider>
  )
}
