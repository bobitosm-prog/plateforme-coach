import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MoovX — Coaching Fitness Pro | Plans Nutrition & Entraînement Personnalisés · Swiss Made',
  description: 'Coaching fitness professionnel Swiss Made. Plans nutrition personnalisés, programme musculation PPL 6 jours, 163 exercices guidés, scanner code-barres, recettes fitness. Dès CHF 10/mois.',
  keywords: 'coaching fitness, coach sportif, plan nutrition, musculation, programme entraînement, personal trainer, fitness Suisse, coaching en ligne, MoovX',
  openGraph: {
    title: 'MoovX — Coaching Fitness Pro · Swiss Made',
    description: 'Plans nutrition personnalisés, programme PPL 6 jours, 163 exercices guidés, scanner code-barres, recettes fitness. Coaching sportif nouvelle génération. Dès CHF 10/mois.',
    url: 'https://moovx.ch',
    siteName: 'MoovX',
    locale: 'fr_CH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoovX — Coaching Fitness Pro · Swiss Made',
    description: 'Plans nutrition personnalisés, programme PPL 6 jours, 163 exercices guidés. Dès CHF 10/mois.',
  },
  alternates: {
    canonical: 'https://moovx.ch',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MoovX',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'Plateforme de coaching fitness Swiss Made. Plans nutrition personnalisés, programme musculation PPL, 163 exercices guidés.',
  url: 'https://moovx.ch',
  offers: {
    '@type': 'Offer',
    price: '10',
    priceCurrency: 'CHF',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '1200',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
