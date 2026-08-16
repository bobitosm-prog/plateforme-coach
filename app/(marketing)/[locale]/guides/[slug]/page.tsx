import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllGuides, getGuide } from '@/content/guides/guides'
import { SITE_URL } from '@/lib/seo'

const GUIDE_LOCALE = 'fr'
const OG_IMAGE = `${SITE_URL}/og-image.jpg`

interface GuidePageProps {
  params: Promise<{ locale: string; slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return getAllGuides().map(guide => ({ locale: GUIDE_LOCALE, slug: guide.slug }))
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const guide = locale === GUIDE_LOCALE ? getGuide(slug) : undefined

  if (!guide) {
    return {
      title: 'Page introuvable',
      robots: { index: false, follow: false },
    }
  }

  const canonical = `${SITE_URL}/fr/guides/${guide.slug}`

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical,
      languages: {
        fr: canonical,
        'x-default': canonical,
      },
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: 'article',
      locale: 'fr_CH',
      url: canonical,
      siteName: 'MoovX',
      images: [{ url: OG_IMAGE, alt: guide.headline }],
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.description,
      images: [OG_IMAGE],
    },
  }
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { locale, slug } = await params
  const guide = locale === GUIDE_LOCALE ? getGuide(slug) : undefined

  if (!guide) notFound()

  const canonical = `${SITE_URL}/fr/guides/${guide.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.headline,
    description: guide.description,
    image: [OG_IMAGE],
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    inLanguage: 'fr-CH',
    mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: 'MoovX', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'MoovX',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-moovx-192.png` },
    },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#f0ede8', fontFamily: 'var(--font-body)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <header style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '18px 24px' }}>
        <nav aria-label="Navigation du guide" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <Link href="/fr/landing" style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 700 }}>
            MoovX
          </Link>
          <Link href="/fr/blog" style={{ color: '#b0aaa4', textDecoration: 'none' }}>
            Blog
          </Link>
        </nav>
      </header>

      <main>
        <article style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px 88px' }}>
          <header style={{ marginBottom: 48 }}>
            <p style={{ color: '#c9a84c', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
              Guide MoovX
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: 1, letterSpacing: 2, margin: '12px 0 20px' }}>
              {guide.headline}
            </h1>
            <p style={{ color: '#aaa49e', fontSize: 18, lineHeight: 1.75, maxWidth: 760 }}>
              {guide.lead}
            </p>
            <p style={{ color: '#77716c', fontSize: 13, marginTop: 18 }}>
              Mis à jour le 16 août 2026 · {guide.readingMinutes} min de lecture
            </p>
          </header>

          <nav aria-label="Sommaire" style={{ background: '#0d0c0b', border: '1px solid rgba(201,168,76,0.25)', padding: '28px', marginBottom: 56 }}>
            <h2 style={{ color: '#c9a84c', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', marginTop: 0 }}>
              Sommaire
            </h2>
            <ol style={{ columns: '2 280px', paddingLeft: 22, lineHeight: 1.9, marginBottom: 0 }}>
              {guide.sections.map(section => (
                <li key={section.id} style={{ breakInside: 'avoid' }}>
                  <a href={`#${section.id}`} style={{ color: '#d2cdc8' }}>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {guide.sections.map(section => (
            <section key={section.id} id={section.id} style={{ borderTop: '1px solid #282522', paddingTop: 40, marginBottom: 56, scrollMarginTop: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', color: '#c9a84c', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', letterSpacing: 1, margin: '0 0 22px' }}>
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} style={{ color: '#c1bbb5', fontSize: 16, lineHeight: 1.85, margin: '0 0 16px' }}>
                  {paragraph}
                </p>
              ))}
              {section.table && (
                <div style={{ overflowX: 'auto', marginTop: 28 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <caption style={{ textAlign: 'left', color: '#eee9e4', fontWeight: 700, marginBottom: 12 }}>
                      {section.table.caption}
                    </caption>
                    <thead>
                      <tr>
                        {section.table.headers.map(header => (
                          <th key={header} scope="col" style={{ color: '#c9a84c', textAlign: 'left', padding: '12px', borderBottom: '1px solid rgba(201,168,76,0.35)', fontSize: 13 }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} style={{ color: '#bbb5af', padding: '12px', borderBottom: '1px solid #282522', verticalAlign: 'top' }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          <aside style={{ border: '1px solid rgba(201,168,76,0.25)', background: '#0d0c0b', padding: 24, color: '#9f9993', lineHeight: 1.7 }}>
            {guide.disclaimer}
          </aside>

          <div style={{ textAlign: 'center', paddingTop: 56 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, letterSpacing: 2 }}>
              Mettre ces principes en pratique
            </h2>
            <p style={{ color: '#aaa49e', lineHeight: 1.7 }}>
              Découvrez les outils MoovX pour structurer et suivre votre progression.
            </p>
            <Link href="/register-client" style={{ display: 'inline-block', marginTop: 12, padding: '13px 28px', background: '#c9a84c', color: '#050505', fontWeight: 800, textDecoration: 'none' }}>
              Découvrir MoovX
            </Link>
          </div>
        </article>
      </main>
    </div>
  )
}
