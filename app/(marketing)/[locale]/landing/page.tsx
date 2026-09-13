import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import {
  SITE_URL,
  buildAlternates,
  getOgLocale,
  getAlternateOgLocales,
  type Locale,
} from '@/lib/seo'
import { getActiveBetaOffer, trialDaysFor } from '@/lib/beta-offer'
import StructuredData from '@/components/StructuredData';
import { buildLandingSchemaGraph } from '@/lib/structured-data';
import LandingV2 from './components/LandingV2'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  const path = '/landing'
  const alternates = buildAlternates(path, locale)
  const ogImage = `${SITE_URL}/og-image.jpg`

  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    keywords: t('keywords').split(','),
    authors: [{ name: 'MoovX SA', url: SITE_URL }],
    creator: 'MoovX SA',
    publisher: 'MoovX SA',
    alternates,
    openGraph: {
      type: 'website',
      url: alternates.canonical,
      siteName: 'MoovX',
      title: t('ogTitle'),
      description: t('ogDescription'),
      locale: getOgLocale(locale),
      alternateLocale: getAlternateOgLocales(locale),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: t('ogImageAlt'),
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('twitterTitle'),
      description: t('twitterDescription'),
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
  }
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const betaOffer = await getActiveBetaOffer()
  const trialDays = trialDaysFor(betaOffer)
  const schemaGraph = buildLandingSchemaGraph()

  return (
    <>
      <StructuredData data={schemaGraph} />
      <div id="features">
        <LandingV2 locale={locale as Locale} trialDays={trialDays} />
      </div>
    </>
  );
}
