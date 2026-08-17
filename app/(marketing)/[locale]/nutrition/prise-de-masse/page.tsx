import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BULK_GAIN_PAGE } from '@/content/nutrition/bulk-gain'
import { buildMarketingSocialImage } from '@/lib/seo'

const BULK_GAIN_LOCALE = 'fr'
const MARKETING_SITE_URL = 'https://moovx.ch'
const BULK_GAIN_PATH = '/fr/nutrition/prise-de-masse'
const BULK_GAIN_URL = `${MARKETING_SITE_URL}${BULK_GAIN_PATH}`

interface BulkGainPageProps {
  params: Promise<{ locale: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return [{ locale: BULK_GAIN_LOCALE }]
}

export async function generateMetadata({ params }: BulkGainPageProps): Promise<Metadata> {
  const { locale } = await params
  if (locale !== BULK_GAIN_LOCALE) {
    return {
      title: 'Page introuvable',
      robots: { index: false, follow: false },
    }
  }

  const socialImage = buildMarketingSocialImage(BULK_GAIN_PAGE.headline)
  return {
    metadataBase: new URL(MARKETING_SITE_URL),
    title: BULK_GAIN_PAGE.title,
    description: BULK_GAIN_PAGE.description,
    alternates: {
      canonical: BULK_GAIN_URL,
      languages: {
        fr: BULK_GAIN_URL,
        'x-default': BULK_GAIN_URL,
      },
    },
    openGraph: {
      type: 'website',
      title: BULK_GAIN_PAGE.title,
      description: BULK_GAIN_PAGE.description,
      url: BULK_GAIN_URL,
      locale: 'fr_CH',
      siteName: 'MoovX',
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: BULK_GAIN_PAGE.title,
      description: BULK_GAIN_PAGE.description,
      images: [socialImage],
    },
    robots: { index: true, follow: true },
  }
}

const sectionStyle = {
  borderTop: '1px solid #282522',
  paddingTop: 40,
  marginBottom: 56,
  scrollMarginTop: 24,
}

const paragraphStyle = {
  color: '#c1bbb5',
  fontSize: 16,
  lineHeight: 1.85,
  margin: '0 0 16px',
}

export default async function BulkGainPage({ params }: BulkGainPageProps) {
  const { locale } = await params
  if (locale !== BULK_GAIN_LOCALE) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${BULK_GAIN_URL}#webpage`,
    name: BULK_GAIN_PAGE.headline,
    description: BULK_GAIN_PAGE.description,
    url: BULK_GAIN_URL,
    inLanguage: 'fr-CH',
    datePublished: BULK_GAIN_PAGE.datePublished,
    dateModified: BULK_GAIN_PAGE.dateModified,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${MARKETING_SITE_URL}/#website`,
      url: MARKETING_SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${MARKETING_SITE_URL}/#organization`,
      name: 'MoovX',
      url: MARKETING_SITE_URL,
    },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#f0ede8', fontFamily: 'var(--font-body)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <header style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '18px 24px' }}>
        <nav aria-label="Navigation prise de masse" style={{ maxWidth: 940, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <Link href="/fr/landing" style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 700 }}>
            MoovX
          </Link>
          <Link href="/fr/outils/calculateur-calories-macros" style={{ color: '#b0aaa4', textDecoration: 'none' }}>
            Calculateur calories/macros
          </Link>
        </nav>
      </header>

      <main>
        <article style={{ maxWidth: 940, margin: '0 auto', padding: '64px 24px 88px' }}>
          <header style={{ marginBottom: 48 }}>
            <p style={{ color: '#c9a84c', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
              Nutrition sportive
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: 1, letterSpacing: 1, margin: '12px 0 20px' }}>
              {BULK_GAIN_PAGE.headline}
            </h1>
            <p style={{ color: '#aaa49e', fontSize: 19, lineHeight: 1.75, maxWidth: 780 }}>
              {BULK_GAIN_PAGE.lead}
            </p>
            <Link href="/fr/outils/calculateur-calories-macros" style={{ display: 'inline-block', marginTop: 14, padding: '13px 22px', background: '#c9a84c', color: '#050505', fontWeight: 800, textDecoration: 'none', borderRadius: 10 }}>
              Calculer mes calories de prise de masse
            </Link>
          </header>

          <nav aria-label="Sommaire" style={{ background: '#0d0c0b', border: '1px solid rgba(201,168,76,0.25)', padding: 28, marginBottom: 56 }}>
            <h2 style={{ color: '#c9a84c', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', marginTop: 0 }}>
              Sommaire
            </h2>
            <ol style={{ columns: '2 280px', paddingLeft: 22, lineHeight: 1.9, marginBottom: 0 }}>
              {BULK_GAIN_PAGE.sections.map(section => (
                <li key={section.id} style={{ breakInside: 'avoid' }}>
                  <a href={`#${section.id}`} style={{ color: '#d2cdc8' }}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {BULK_GAIN_PAGE.sections.map(section => (
            <section key={section.id} id={section.id} style={sectionStyle}>
              <h2 style={{ fontFamily: 'var(--font-display)', color: '#c9a84c', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', letterSpacing: 1, margin: '0 0 22px' }}>
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} style={paragraphStyle}>{paragraph}</p>
              ))}
              {'points' in section && section.points && (
                <ul style={{ color: '#bbb5af', lineHeight: 1.8, paddingLeft: 24 }}>
                  {section.points.map(point => <li key={point} style={{ marginBottom: 8 }}>{point}</li>)}
                </ul>
              )}
              {'links' in section && section.links && (
                <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
                  {section.links.map(link => (
                    <Link key={link.href} href={link.href} style={{ display: 'block', border: '1px solid rgba(201,168,76,0.25)', background: '#0d0c0b', padding: 18, color: '#c9a84c', textDecoration: 'none' }}>
                      <strong>{link.label}</strong>
                      <span style={{ display: 'block', color: '#9f9993', lineHeight: 1.6, marginTop: 5 }}>{link.description}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}

          <section aria-labelledby="sources-title" style={sectionStyle}>
            <h2 id="sources-title" style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>Sources</h2>
            <ol style={{ color: '#aaa49e', lineHeight: 1.7, paddingLeft: 24 }}>
              {BULK_GAIN_PAGE.sources.map(source => (
                <li key={source.url} style={{ marginBottom: 12 }}>
                  {source.authors} ({source.year}).{' '}
                  <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: '#c9a84c' }}>
                    {source.title}
                  </a>. {source.publication}.
                </li>
              ))}
            </ol>
          </section>

          <aside style={{ border: '1px solid rgba(201,168,76,0.25)', background: '#0d0c0b', padding: 24, color: '#9f9993', lineHeight: 1.7 }}>
            {BULK_GAIN_PAGE.disclaimer}
          </aside>

          <section aria-labelledby="personal-plan-title" style={{ textAlign: 'center', paddingTop: 56 }}>
            <h2 id="personal-plan-title" style={{ fontFamily: 'var(--font-display)', fontSize: 30, letterSpacing: 1 }}>
              Passer de l’estimation au suivi
            </h2>
            <p style={{ color: '#aaa49e', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
              Utilisez vos objectifs comme point de départ, puis structurez et ajustez votre plan nutritionnel dans MoovX.
            </p>
            <Link href="/register-client" style={{ display: 'inline-block', marginTop: 18, padding: '13px 28px', background: '#c9a84c', color: '#050505', fontWeight: 800, textDecoration: 'none', borderRadius: 10 }}>
              Créer mon plan nutritionnel personnalisé
            </Link>
          </section>
        </article>
      </main>
    </div>
  )
}
