import AuthIntlProvider from '@/components/AuthIntlProvider'
import RegisterClientContent from '@/app/register-client/RegisterClientContent'
import { getActiveBetaOffer, trialDaysFor } from '@/lib/beta-offer'

export default async function RegisterClientPage() {
  const betaOffer = await getActiveBetaOffer()
  const trialDays = trialDaysFor(betaOffer)

  return (
    <AuthIntlProvider>
      <RegisterClientContent trialDays={trialDays} />
    </AuthIntlProvider>
  )
}
