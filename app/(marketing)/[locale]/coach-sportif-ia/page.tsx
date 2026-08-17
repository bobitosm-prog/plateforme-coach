import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AI_COACH_PAGE } from '@/content/ai/ai-coach'
import { buildMarketingSocialImage } from '@/lib/seo'

const AI_COACH_LOCALE = 'fr'
const MARKETING_SITE_URL = 'https://moovx.ch'
const AI_COACH_PATH = '/fr/coach-sportif-ia'
const AI_COACH_URL = `${MARKETING_SITE_URL}${AI_COACH_PATH}`

interface AiCoachPageProps {
  params: Promise<{ locale: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return [{ locale: AI_COACH_LOCALE }]
}

export async function generateMetadata({ params }: AiCoachPageProps): Promise<Metadata> {
  const { locale } = await params
  if (locale !== AI_COACH_LOCALE) {
    return {
      title: 'Page introuvable',
      robots: { index: false, follow: false },
    }
  }

  const socialImage = buildMarketingSocialImage(AI_COACH_PAGE.headline)
  return {
    metadataBase: new URL(MARKETING_SITE_URL),
    title: AI_COACH_PAGE.title,
    description: AI_COACH_PAGE.description,
    alternates: {
      canonical: AI_COACH_URL,
      languages: {
        fr: AI_COACH_URL,
        'x-default': AI_COACH_URL,
      },
    },
    openGraph: {
      type: 'website',
      title: AI_COACH_PAGE.title,
      description: AI_COACH_PAGE.description,
      url: AI_COACH_URL,
      locale: 'fr_CH',
      siteName: 'MoovX',
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: AI_COACH_PAGE.title,
      description: AI_COACH_PAGE.description,
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

export default async function AiCoachPage({ params }: AiCoachPageProps) {
  const { locale } = await params
  if (locale !== AI_COACH_LOCALE) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${AI_COACH_URL}#webpage`,
    name: AI_COACH_PAGE.headline,
    description: AI_COACH_PAGE.description,
    url: AI_COACH_URL,
    inLanguage: 'fr-CH',
    datePublished: AI_COACH_PAGE.datePublished,
    dateModified: AI_COACH_PAGE.dateModified,
    about: {
      '@id': `${MARKETING_SITE_URL}/#software`,
    },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#f0ede8', fontFamily: 'var(--font-body)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <header style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '18px 24px' }}>
        <nav aria-label="Navigation coach sportif IA" style={{ maxWidth: 940, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <Link href="/fr/landing" style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 700 }}>
            MoovX
          </Link>
          <Link href="/fr/guides/musculation" style={{ color: '#b0aaa4', textDecoration: 'none' }}>
            Guide musculation
          </Link>
        </nav>
      </header>

      <main>
        <article style={{ maxWidth: 940, margin: '0 auto', padding: '64px 24px 88px' }}>
          <header style={{ marginBottom: 48 }}>
            <p style={{ color: '#c9a84c', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
              Coaching fitness personnalisé
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: 1, letterSpacing: 1, margin: '12px 0 20px' }}>
              {AI_COACH_PAGE.headline}
            </h1>
            <p style={{ color: '#aaa49e', fontSize: 19, lineHeight: 1.75, maxWidth: 780 }}>
              {AI_COACH_PAGE.lead}
            </p>
            <Link href="/register-client" style={{ display: 'inline-block', marginTop: 14, padding: '13px 22px', background: '#c9a84c', color: '#050505', fontWeight: 800, textDecoration: 'none', borderRadius: 10 }}>
              Créer mon plan fitness
            </Link>
          </header>

          <nav aria-label="Sommaire" style={{ background: '#0d0c0b', border: '1px solid rgba(201,168,76,0.25)', padding: 28, marginBottom: 56 }}>
            <h2 style={{ color: '#c9a84c', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', marginTop: 0 }}>
              Sommaire
            </h2>
            <ol style={{ columns: '2 280px', paddingLeft: 22, lineHeight: 1.9, marginBottom: 0 }}>
              {AI_COACH_PAGE.sections.map(section => (
                <li key={section.id} style={{ breakInside: 'avoid' }}>
                  <a href={`#${section.id}`} style={{ color: '#d2cdc8' }}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {AI_COACH_PAGE.sections.map(section => (
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

          <section aria-labelledby="create-plan-title" style={{ textAlign: 'center', paddingTop: 24 }}>
            <h2 id="create-plan-title" style={{ fontFamily: 'var(--font-display)', fontSize: 30, letterSpacing: 1 }}>
              Construire un programme à partir de votre profil
            </h2>
            <p style={{ color: '#aaa49e', lineHeight: 1.7, maxWidth: 650, margin: '0 auto' }}>
              Renseignez votre objectif, votre expérience et vos contraintes pour obtenir une proposition structurée dans MoovX.
            </p>
            <Link href="/register-client" style={{ display: 'inline-block', marginTop: 18, padding: '13px 28px', background: '#c9a84c', color: '#050505', fontWeight: 800, textDecoration: 'none', borderRadius: 10 }}>
              Créer mon plan fitness
            </Link>
          </section>
        </article>
      </main>
    </div>
  )
}
