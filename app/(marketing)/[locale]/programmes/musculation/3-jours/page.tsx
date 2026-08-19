import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { THREE_DAY_PROGRAM_CONTENT } from '@/content/training/three-day-program'
import { SITE_URL } from '@/lib/seo'

const PATH = '/fr/programmes/musculation/3-jours'
const CANONICAL_URL = `${SITE_URL}${PATH}`

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
    title: THREE_DAY_PROGRAM_CONTENT.seoTitle,
    description: THREE_DAY_PROGRAM_CONTENT.description,
    alternates: {
      canonical: CANONICAL_URL,
      languages: {
        fr: CANONICAL_URL,
        'x-default': CANONICAL_URL,
      },
    },
  }
}

export default async function ThreeDayProgramPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  requireFrenchLocale(locale)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${CANONICAL_URL}#webpage`,
    url: CANONICAL_URL,
    name: THREE_DAY_PROGRAM_CONTENT.title,
    description: THREE_DAY_PROGRAM_CONTENT.description,
    inLanguage: 'fr',
    isPartOf: {
      '@id': `${SITE_URL}/#website`,
    },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#f0ede8', fontFamily: 'var(--font-body)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '18px 24px' }}>
        <nav aria-label="Navigation principale" style={{ maxWidth: 980, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <Link href="/fr/landing" style={{ color: '#c9a84c', textDecoration: 'none' }}>MoovX</Link>
          <Link href="/fr/guides/musculation" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none' }}>Guide musculation</Link>
        </nav>
      </header>

      <main>
        <article style={{ maxWidth: 980, margin: '0 auto', padding: '64px 24px 88px' }}>
          <header style={{ maxWidth: 820, marginBottom: 48 }}>
            <p style={{ color: '#c9a84c', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Musculation · 3 jours</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 5rem)', lineHeight: 1, margin: '16px 0 24px' }}>
              {THREE_DAY_PROGRAM_CONTENT.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.76)', fontSize: 18, lineHeight: 1.75 }}>{THREE_DAY_PROGRAM_CONTENT.introduction}</p>
            <a href="https://app.moovx.ch/register-client" style={{ display: 'inline-block', marginTop: 18, background: '#c9a84c', color: '#080808', padding: '14px 20px', fontWeight: 800, textDecoration: 'none' }}>
              Créer mon programme personnalisé
            </a>
          </header>

          <nav aria-label="Sommaire" style={{ background: '#0d0c0b', border: '1px solid rgba(201,168,76,0.25)', padding: 24, marginBottom: 56 }}>
            <h2 style={{ color: '#c9a84c', marginTop: 0 }}>Sommaire</h2>
            <ol style={{ marginBottom: 0, paddingLeft: 22 }}>
              {THREE_DAY_PROGRAM_CONTENT.sections.map(section => (
                <li key={section.id} style={{ marginBottom: 8 }}>
                  <a href={`#${section.id}`} style={{ color: 'rgba(255,255,255,0.76)' }}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {THREE_DAY_PROGRAM_CONTENT.sections.map(section => (
            <section key={section.id} id={section.id} style={{ scrollMarginTop: 24, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 40, marginBottom: 56 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 5vw, 3rem)', color: '#c9a84c', lineHeight: 1.1 }}>{section.title}</h2>
              {section.paragraphs.map(paragraph => (
                <p key={paragraph} style={{ color: 'rgba(255,255,255,0.76)', fontSize: 16, lineHeight: 1.8 }}>{paragraph}</p>
              ))}
              {section.points && (
                <ul style={{ color: 'rgba(255,255,255,0.76)', lineHeight: 1.8 }}>
                  {section.points.map(point => <li key={point}>{point}</li>)}
                </ul>
              )}
              {section.sessions?.map(session => (
                <div key={session.name} style={{ marginTop: 28, overflowX: 'auto' }}>
                  <h3 style={{ color: '#f0ede8', fontSize: 22, marginBottom: 6 }}>{session.name}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.66)', marginTop: 0 }}>{session.focus}</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                    <caption className="sr-only">{session.name} : {session.focus}</caption>
                    <thead>
                      <tr>
                        {['Exercice', 'Séries', 'Répétitions', 'Repos'].map(header => (
                          <th key={header} scope="col" style={{ borderBottom: '1px solid rgba(201,168,76,0.4)', padding: 12, textAlign: 'left' }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {session.exercises.map(exercise => (
                        <tr key={exercise.name}>
                          <th scope="row" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 12, textAlign: 'left' }}>{exercise.name}</th>
                          <td style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 12 }}>{exercise.sets}</td>
                          <td style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 12 }}>{exercise.repetitions}</td>
                          <td style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 12 }}>{exercise.rest}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {section.links?.map(link => (
                <p key={link.href} style={{ marginTop: 20 }}>
                  <Link href={link.href} style={{ color: '#c9a84c', fontWeight: 700 }}>{link.label}</Link>
                </p>
              ))}
            </section>
          ))}

          <aside style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.08)', padding: 24, lineHeight: 1.7 }}>
            {THREE_DAY_PROGRAM_CONTENT.disclaimer}
          </aside>

          <p style={{ textAlign: 'center', marginTop: 40 }}>
            <a href="https://app.moovx.ch/register-client" style={{ display: 'inline-block', background: '#c9a84c', color: '#080808', padding: '14px 20px', fontWeight: 800, textDecoration: 'none' }}>
              Personnaliser mon programme avec MoovX
            </a>
          </p>
        </article>
      </main>
    </div>
  )
}
