import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/seo'
import CaloriesMacrosCalculator from './CaloriesMacrosCalculator'

const PATH = '/fr/outils/calculateur-calories-macros'
const CANONICAL_URL = `${SITE_URL}${PATH}`
const TITLE = 'Calculateur calories et macros gratuit | MoovX'
const DESCRIPTION = 'Estimez vos calories de maintien et vos macros selon votre poids, votre activité et votre objectif : perte de poids, maintien ou prise de muscle.'

export const dynamicParams = false

export function generateStaticParams() {
  return [{ locale: 'fr' }]
}

function requireFrenchLocale(locale: string) {
  if (locale !== 'fr') notFound()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  requireFrenchLocale(locale)

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical: CANONICAL_URL,
      languages: {
        fr: CANONICAL_URL,
        'x-default': CANONICAL_URL,
      },
    },
  }
}

export default async function CalorieMacroCalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  requireFrenchLocale(locale)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Calculateur de calories et macros MoovX',
    description: DESCRIPTION,
    url: CANONICAL_URL,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    inLanguage: 'fr',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#f0ede8', fontFamily: 'var(--font-body)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '18px 24px' }}>
        <nav aria-label="Navigation principale" style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <Link href="/fr/landing" style={{ color: '#c9a84c', textDecoration: 'none' }}>MoovX</Link>
          <Link href="/fr/guides/nutrition" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none' }}>Guide nutrition</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '64px 24px 88px' }}>
        <header style={{ maxWidth: 820, marginBottom: 48 }}>
          <p style={{ color: '#c9a84c', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Outil gratuit · Nutrition</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 5rem)', lineHeight: 1, margin: '16px 0 24px' }}>
            Calculateur de calories et macros
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.76)', fontSize: 18, lineHeight: 1.75 }}>
            Estimez votre métabolisme de repos, vos calories de maintien et une répartition quotidienne des protéines, glucides et lipides selon votre profil.
          </p>
        </header>

        <CaloriesMacrosCalculator />

        <article style={{ maxWidth: 820, margin: '72px auto 0', color: 'rgba(255,255,255,0.76)', lineHeight: 1.8 }}>
          <section style={{ marginBottom: 44 }}>
            <h2 style={{ color: '#c9a84c' }}>Comment calculer ses calories ?</h2>
            <p>Une estimation calorique combine le métabolisme de repos et le niveau d’activité. Elle donne un repère initial, à confronter ensuite à l’évolution du poids, aux sensations et aux performances.</p>
          </section>

          <section style={{ marginBottom: 44 }}>
            <h2 style={{ color: '#c9a84c' }}>BMR et TDEE : quelle différence ?</h2>
            <p>Le BMR représente une estimation de l’énergie utilisée au repos. Le TDEE ajoute une estimation de l’activité quotidienne et sportive pour approcher les calories de maintien.</p>
          </section>

          <section style={{ marginBottom: 44 }}>
            <h2 style={{ color: '#c9a84c' }}>Protéines, glucides et lipides</h2>
            <p>Les macronutriments contribuent différemment à l’énergie, à la récupération et au fonctionnement de l’organisme. Leur répartition doit rester compatible avec vos préférences et votre contexte.</p>
            <p>Pour approfondir ces repères, consultez le <Link href="/fr/guides/nutrition" style={{ color: '#c9a84c' }}>guide de la nutrition sportive</Link>.</p>
          </section>

          <section style={{ marginBottom: 44 }}>
            <h2 style={{ color: '#c9a84c' }}>Pourquoi le résultat reste une estimation</h2>
            <p>Une formule ne mesure pas directement votre dépense réelle. Le sommeil, le travail, l’entraînement, la récupération et les variations individuelles peuvent modifier les besoins observés.</p>
          </section>

          <aside style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.08)', padding: 24 }}>
            Cet outil fournit une estimation informative et ne constitue ni un diagnostic ni une prescription médicale. En cas de situation médicale, de grossesse ou de besoins nutritionnels particuliers, demandez conseil à un professionnel qualifié.
          </aside>
        </article>
      </main>
    </div>
  )
}
