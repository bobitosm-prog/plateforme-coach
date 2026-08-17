import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CaloriesMacrosCalculator from './CaloriesMacrosCalculator'
import { calculateAutomaticCalorieMacroTargets } from '@/lib/nutrition/calorie-macro-targets'
import { buildMarketingSocialImage } from '@/lib/seo'

const CALCULATOR_LOCALE = 'fr'
const CALCULATOR_PATH = '/fr/outils/calculateur-calories-macros'
const MARKETING_SITE_URL = 'https://moovx.ch'
const CALCULATOR_URL = `${MARKETING_SITE_URL}${CALCULATOR_PATH}`
const TITLE = 'Calculateur calories et macros gratuit | MoovX'
const DESCRIPTION = 'Estimez vos calories de maintien et vos macros selon votre poids, votre activité et votre objectif : perte de poids, maintien ou prise de muscle.'

interface CalculatorPageProps {
  params: Promise<{ locale: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return [{ locale: CALCULATOR_LOCALE }]
}

export async function generateMetadata({ params }: CalculatorPageProps): Promise<Metadata> {
  const { locale } = await params
  if (locale !== CALCULATOR_LOCALE) {
    return {
      title: 'Page introuvable',
      robots: { index: false, follow: false },
    }
  }

  const socialImage = buildMarketingSocialImage('Calculateur de calories et macros MoovX')
  return {
    metadataBase: new URL(MARKETING_SITE_URL),
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical: CALCULATOR_URL,
      languages: {
        fr: CALCULATOR_URL,
        'x-default': CALCULATOR_URL,
      },
    },
    openGraph: {
      type: 'website',
      title: TITLE,
      description: DESCRIPTION,
      url: CALCULATOR_URL,
      locale: 'fr_CH',
      siteName: 'MoovX',
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
      images: [socialImage],
    },
    robots: { index: true, follow: true },
  }
}

const example = calculateAutomaticCalorieMacroTargets({
  gender: 'male',
  age: 32,
  height: 178,
  weight: 82,
  activityLevel: 'moderate',
  objective: 'maintain',
})

export default async function CalculatorPage({ params }: CalculatorPageProps) {
  const { locale } = await params
  if (locale !== CALCULATOR_LOCALE) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${CALCULATOR_URL}#calculator`,
    name: 'Calculateur de calories et macros MoovX',
    description: DESCRIPTION,
    url: CALCULATOR_URL,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    inLanguage: 'fr-CH',
    isAccessibleForFree: true,
    provider: {
      '@type': 'Organization',
      '@id': `${MARKETING_SITE_URL}/#organization`,
      name: 'MoovX',
      url: MARKETING_SITE_URL,
    },
  }

  const sectionStyle = { borderTop: '1px solid #282522', paddingTop: 38, marginTop: 48 }
  const paragraphStyle = { color: '#bdb7b1', fontSize: 16, lineHeight: 1.8 }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#f0ede8', fontFamily: 'var(--font-body)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <header style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '18px 24px' }}>
        <nav aria-label="Navigation du calculateur" style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <Link href="/fr/landing" style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 700 }}>MoovX</Link>
          <Link href="/fr/guides/nutrition" style={{ color: '#b0aaa4', textDecoration: 'none' }}>Guide nutrition</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '60px 24px 88px' }}>
        <article>
          <header style={{ marginBottom: 42 }}>
            <p style={{ color: '#c9a84c', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Outil nutrition MoovX</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: 1, letterSpacing: 1, margin: '12px 0 20px' }}>
              Calculateur de calories et macros
            </h1>
            <p style={{ color: '#aaa49e', fontSize: 19, lineHeight: 1.75, maxWidth: 780 }}>
              Estimez votre métabolisme de repos, vos calories de maintien et une répartition quotidienne des protéines, glucides et lipides adaptée à votre objectif.
            </p>
          </header>

          <CaloriesMacrosCalculator />

          <section style={sectionStyle}>
            <h2>Comment calculer ses calories&nbsp;?</h2>
            <p style={paragraphStyle}>
              Le calcul commence par une estimation du métabolisme de repos avec l’équation de Mifflin–St Jeor. Cette estimation utilise le poids, la taille, l’âge et le coefficient associé au sexe prévu par la formule. Elle est ensuite multipliée par un niveau d’activité pour estimer la dépense énergétique quotidienne.
            </p>
            <p style={paragraphStyle}>
              L’objectif choisi ajuste ce niveau de maintien. MoovX applique les mêmes règles que son outil nutritionnel interne afin d’éviter qu’un calcul public et un plan enregistré donnent deux réponses différentes.
            </p>
            <p style={paragraphStyle}>
              Si votre objectif est de développer votre masse musculaire, utilisez cette estimation pour <Link href="/fr/nutrition/prise-de-masse" style={{ color: '#c9a84c' }}>préparer une alimentation de prise de masse</Link> adaptée à votre suivi.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>BMR et TDEE&nbsp;: quelle différence&nbsp;?</h2>
            <p style={paragraphStyle}>
              Le BMR représente une estimation de l’énergie utilisée au repos. Le TDEE ajoute une estimation de l’activité quotidienne et sportive. Le premier décrit une base théorique&nbsp;; le second sert de point de départ pour estimer les calories de maintien.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>Calcul des protéines, glucides et lipides</h2>
            <p style={paragraphStyle}>
              Les protéines sont estimées selon le poids et l’objectif. Une part des calories est réservée aux lipides, puis les glucides complètent l’énergie disponible. Cette répartition reste un point de départ&nbsp;: préférences alimentaires, tolérance digestive, entraînement et évolution réelle peuvent justifier des ajustements.
            </p>
            <p style={paragraphStyle}>
              Pour approfondir ces principes, consultez le <Link href="/fr/guides/nutrition" style={{ color: '#c9a84c' }}>guide de nutrition sportive</Link> et le <Link href="/fr/guides/musculation" style={{ color: '#c9a84c' }}>guide de musculation</Link>.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>Exemple fictif</h2>
            <p style={paragraphStyle}>
              Pour un homme fictif de 32 ans, 178&nbsp;cm et 82&nbsp;kg, modérément actif et souhaitant maintenir son poids, le calcul donne un métabolisme de repos estimé de {example.bmr}&nbsp;kcal et une maintenance estimée de {example.tdee}&nbsp;kcal par jour. La répartition automatique correspond à {example.protein}&nbsp;g de protéines, {example.carbs}&nbsp;g de glucides et {example.fat}&nbsp;g de lipides.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2>Pourquoi le résultat reste une estimation</h2>
            <p style={paragraphStyle}>
              Une équation ne mesure ni votre dépense réelle ni votre état de santé. Le sommeil, les déplacements, la composition corporelle, les variations d’activité et les adaptations individuelles influencent les besoins. Utilisez le résultat comme une hypothèse initiale à confronter à plusieurs semaines d’observation.
            </p>
            <aside style={{ border: '1px solid rgba(201,168,76,0.25)', background: '#0d0c0b', padding: 20, color: '#aaa49e', lineHeight: 1.7 }}>
              Cet outil est informatif et ne constitue pas un diagnostic ou une prescription médicale. Demandez conseil à un professionnel de santé en cas de pathologie, grossesse, trouble alimentaire ou besoin nutritionnel particulier.
            </aside>
          </section>

          <section style={sectionStyle}>
            <h2>Comment MoovX transforme ces objectifs en plan nutritionnel</h2>
            <p style={paragraphStyle}>
              Dans l’application, les objectifs peuvent être complétés par les préférences alimentaires, les exclusions et le suivi quotidien. MoovX utilise alors les mêmes cibles calories/macros pour structurer un plan de repas que vous pouvez consulter et ajuster.
            </p>
            <Link href="/register-client" style={{ display: 'inline-block', marginTop: 8, padding: '13px 22px', background: '#c9a84c', color: '#050505', fontWeight: 800, textDecoration: 'none', borderRadius: 10 }}>
              Créer mon plan nutritionnel personnalisé
            </Link>
          </section>
        </article>
      </main>
    </div>
  )
}
