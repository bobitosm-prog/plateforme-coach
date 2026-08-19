import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BULK_MENU_CONTENT } from '@/content/nutrition/bulk-menu'
import { SITE_URL } from '@/lib/seo'

const PATH = '/fr/nutrition/menu-prise-de-masse'
const CANONICAL_URL = `${SITE_URL}${PATH}`

export const dynamicParams = false

export function generateStaticParams() {
  return [{ locale: 'fr' }]
}

function requireFrenchLocale(locale: string) {
  if (locale !== 'fr') notFound()
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  requireFrenchLocale(locale)

  return {
    title: BULK_MENU_CONTENT.seoTitle,
    description: BULK_MENU_CONTENT.description,
    alternates: {
      canonical: CANONICAL_URL,
      languages: {
        fr: CANONICAL_URL,
        'x-default': CANONICAL_URL,
      },
    },
  }
}

export default async function BulkMenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  requireFrenchLocale(locale)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${CANONICAL_URL}#webpage`,
    url: CANONICAL_URL,
    name: BULK_MENU_CONTENT.title,
    description: BULK_MENU_CONTENT.description,
    inLanguage: 'fr',
    isPartOf: { '@id': `${SITE_URL}/#website` },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#f0ede8', fontFamily: 'var(--font-body)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '18px 24px' }}>
        <nav aria-label="Navigation principale" style={{ maxWidth: 920, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <Link href="/fr/landing" style={{ color: '#c9a84c', textDecoration: 'none' }}>MoovX</Link>
          <Link href="/fr/outils/calculateur-calories-macros" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none' }}>Calculateur calories et macros</Link>
        </nav>
      </header>

      <main>
        <article style={{ maxWidth: 920, margin: '0 auto', padding: '64px 24px 88px' }}>
          <header style={{ maxWidth: 800, marginBottom: 48 }}>
            <p style={{ color: '#c9a84c', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Nutrition · Menu prise de masse</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 5rem)', lineHeight: 1, margin: '16px 0 24px' }}>{BULK_MENU_CONTENT.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.76)', fontSize: 18, lineHeight: 1.75 }}>{BULK_MENU_CONTENT.introduction}</p>
          </header>

          <nav aria-label="Sommaire" style={{ background: '#0d0c0b', border: '1px solid rgba(201,168,76,0.25)', padding: 24, marginBottom: 56 }}>
            <h2 style={{ color: '#c9a84c', marginTop: 0 }}>Sommaire</h2>
            <ol style={{ marginBottom: 0, paddingLeft: 22 }}>
              {BULK_MENU_CONTENT.sections.map(section => (
                <li key={section.id} style={{ marginBottom: 8 }}>
                  <a href={`#${section.id}`} style={{ color: 'rgba(255,255,255,0.76)' }}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {BULK_MENU_CONTENT.sections.map(section => (
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
              {section.examples && (
                <div style={{ display: 'grid', gap: 18, marginTop: 28 }}>
                  {section.examples.map(example => (
                    <section key={example.label} aria-label={example.label} style={{ background: '#0d0c0b', border: '1px solid rgba(201,168,76,0.2)', padding: 20 }}>
                      <h3 style={{ color: '#c9a84c', marginTop: 0 }}>{example.label}</h3>
                      <ul style={{ color: 'rgba(255,255,255,0.76)', lineHeight: 1.8 }}>
                        {example.foods.map(food => <li key={food}>{food}</li>)}
                      </ul>
                      <p style={{ color: 'rgba(255,255,255,0.68)', lineHeight: 1.7, marginBottom: 0 }}>{example.note}</p>
                    </section>
                  ))}
                </div>
              )}
            </section>
          ))}

          <section aria-labelledby="related-content" style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 40, marginBottom: 56 }}>
            <h2 id="related-content" style={{ color: '#c9a84c' }}>Approfondir votre prise de masse</h2>
            <ul style={{ display: 'grid', gap: 14, padding: 0, listStyle: 'none' }}>
              {BULK_MENU_CONTENT.links.map(link => (
                <li key={link.href} style={{ background: '#0d0c0b', border: '1px solid rgba(201,168,76,0.2)', padding: 18 }}>
                  <Link href={link.href} style={{ color: '#c9a84c', fontWeight: 700 }}>{link.label}</Link>
                  <p style={{ marginBottom: 0, color: 'rgba(255,255,255,0.7)' }}>{link.description}</p>
                </li>
              ))}
            </ul>
          </section>

          <aside style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.08)', padding: 24, lineHeight: 1.7 }}>
            {BULK_MENU_CONTENT.disclaimer}
          </aside>

          <p style={{ textAlign: 'center', marginTop: 40 }}>
            <a href="https://app.moovx.ch/register-client" style={{ display: 'inline-block', background: '#c9a84c', color: '#080808', padding: '14px 20px', fontWeight: 800, textDecoration: 'none' }}>
              Créer mon compte MoovX
            </a>
          </p>
        </article>
      </main>
    </div>
  )
}
