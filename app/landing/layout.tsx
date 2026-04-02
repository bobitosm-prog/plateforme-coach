import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MoovX — Coaching Fitness Pro à Genève | Plans Nutrition & Entraînement Personnalisés',
  description: 'Coaching fitness professionnel à Genève. Plans nutrition personnalisés, programme musculation PPL 6 jours, scanner code-barres, recettes fitness. Dès CHF 10/mois. Swiss Made.',
  keywords: 'coaching fitness Genève, coach sportif Genève, plan nutrition Genève, musculation Genève, programme entraînement Genève, personal trainer Genève, fitness Suisse romande',
  openGraph: {
    title: 'MoovX — Coaching Fitness Pro à Genève',
    description: 'Plans nutrition personnalisés, programme PPL 6 jours, scanner code-barres, recettes fitness. Coaching sportif nouvelle génération à Genève. Dès CHF 10/mois.',
    url: 'https://moovx.ch',
    siteName: 'MoovX - Coaching Fitness Genève',
    locale: 'fr_CH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoovX — Coaching Fitness Pro à Genève',
    description: 'Plans nutrition personnalisés, programme PPL 6 jours, scanner code-barres, recettes fitness. Dès CHF 10/mois.',
  },
  alternates: {
    canonical: 'https://moovx.ch',
  },
  other: {
    'geo.region': 'CH-GE',
    'geo.placename': 'Genève',
    'geo.position': '46.2044;6.1432',
    'ICBM': '46.2044, 6.1432',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children
}
