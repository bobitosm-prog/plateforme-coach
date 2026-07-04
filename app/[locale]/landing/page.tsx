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
import Cursor from './components/Cursor';
import ScrollBar from './components/ScrollBar';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MarqueeSection from './components/MarqueeSection';
import Results from './components/Results';
import NutritionSection from './components/NutritionSection';
import TrainingSection from './components/TrainingSection';
import TrackingSection from './components/TrackingSection';
import CoachIaSection from './components/CoachIaSection';
import CoachingPro from './components/CoachingPro';
// import EconomicModel from './components/EconomicModel';
// SKIP — fait doublon avec PricingSection, a refondre Power dans session future
import Steps from './components/Steps';
import PWASection from './components/PwaSection';
import PricingSection from './components/PricingSection';
import FaqSection from './components/FaqSection';
import GenevaSection from './components/GenevaSection';
import CtaSection from './components/CtaSection';
import FooterSection from './components/FooterSection';
import StructuredData from '@/components/StructuredData';
import {
  buildOrganizationSchema,
  buildLocalBusinessSchema,
  buildWebSiteSchema,
  buildSchemaGraph,
} from '@/lib/structured-data';

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

function GoldSeparator() {
  return (
    <div style={{
      height: 1,
      background: 'linear-gradient(90deg, transparent 5%, rgba(212,168,67,0.2) 30%, rgba(212,168,67,0.2) 70%, transparent 95%)',
      maxWidth: 1280,
      margin: '0 auto',
    }} />
  )
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const betaOffer = await getActiveBetaOffer()
  const trialDays = trialDaysFor(betaOffer)
  const schemaGraph = buildSchemaGraph([
    buildOrganizationSchema(),
    buildLocalBusinessSchema(),
    buildWebSiteSchema(locale),
  ]);

  return (
    <>
      <StructuredData data={schemaGraph} />
      <Cursor />
      <ScrollBar />

      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9997, opacity: 0.022,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '160px',
      }} />

      <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
        <Navbar />
        <Hero />
        <MarqueeSection />
        <div style={{ background: '#0a0a0a' }}><Results /></div>
        <GoldSeparator />
        <div style={{ background: '#111' }}><NutritionSection /></div>
        <GoldSeparator />
        <div style={{ background: '#0a0a0a' }}><TrainingSection /></div>
        <GoldSeparator />
        <div style={{ background: '#111' }}><TrackingSection /></div>
        <GoldSeparator />
        <div style={{ background: '#0a0a0a' }}><CoachIaSection /></div>
        <GoldSeparator />
        <div style={{ background: '#111' }}><CoachingPro /></div>
        <GoldSeparator />
        {/* <div style={{ background: '#0a0a0a' }}><EconomicModel /></div> */}
        {/* SKIP : doublon avec PricingSection, a refondre Power */}
        <GoldSeparator />
        <div style={{ background: '#0a0a0a' }}><Steps /></div>
        <GoldSeparator />
        <div style={{ background: '#111' }}><PWASection /></div>
        <GoldSeparator />
        <div style={{ background: '#0a0a0a' }}><PricingSection trialDays={trialDays} /></div>
        <GoldSeparator />
        <div style={{ background: '#111' }}><FaqSection /></div>
        <GoldSeparator />
        <div style={{ background: '#0a0a0a' }}><GenevaSection /></div>
        <GoldSeparator />
        <CtaSection />
        <FooterSection />
      </div>
    </>
  );
}
