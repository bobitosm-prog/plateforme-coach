import RootDocument, { rootMetadata, rootViewport } from '@/app/components/layout/RootDocument'
import ClientIntlProvider from '@/components/ClientIntlProvider'
import CookieConsent from '@/components/CookieConsent'

export const metadata = rootMetadata
export const viewport = rootViewport

export default function ApplicationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument lang="fr">
    {children}
    <ClientIntlProvider><CookieConsent /></ClientIntlProvider>
  </RootDocument>
}
