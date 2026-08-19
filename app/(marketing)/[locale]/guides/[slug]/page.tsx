import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GUIDE_SLUGS, getGuide, type GuideSlug } from '@/content/guides/guides'
import { SITE_URL } from '@/lib/seo'

export const dynamicParams = false

export function generateStaticParams() {
  return GUIDE_SLUGS.map(slug => ({ locale: 'fr', slug }))
}

function resolveGuide(locale: string, slug: string) {
  if (locale !== 'fr') notFound()
  const guide = getGuide(slug)
  if (!guide) notFound()
  return guide
}

function guideUrl(slug: string) {
  return `${SITE_URL}/fr/guides/${slug}`
}

function getContextualLink(guideSlug: GuideSlug, sectionId: string) {
  if (guideSlug === 'nutrition' && sectionId === 'calories') {
    return {
      href: '/fr/outils/calculateur-calories-macros',
      label: 'calculer vos calories et vos macros',
      prefix: 'Utilisez le calculateur MoovX pour ',
    }
  }

  if (guideSlug === 'nutrition' && sectionId === 'proteines') {
    return {
      href: '/fr/nutrition/proteines-par-jour',
      label: 'estimer combien de protéines consommer par jour',
      prefix: 'Pour relier ces repères à votre objectif, découvrez comment ',
    }
  }

  if (guideSlug === 'nutrition' && sectionId === 'prise-de-masse') {
    return {
      href: '/fr/nutrition/prise-de-masse',
      label: 'construire une prise de masse progressive',
      prefix: 'Approfondissez ces repères pour ',
    }
  }

  if (guideSlug === 'nutrition' && sectionId === 'perte-de-poids') {
    return {
      href: '/fr/nutrition/perte-de-poids',
      label: 'adapter votre alimentation pour une perte de poids progressive',
      prefix: 'Retrouvez une méthode structurée pour ',
    }
  }

  if (guideSlug === 'musculation' && sectionId === 'frequence') {
    return {
      href: '/fr/programmes/musculation/debutant',
      label: 'commencer avec un programme de musculation débutant',
      prefix: 'Pour organiser vos premières semaines, vous pouvez ',
    }
  }

  if (guideSlug === 'musculation' && sectionId === 'split') {
    return {
      href: '/fr/coach-sportif-ia',
      label: 'découvrir le coach sportif IA MoovX',
      prefix: 'Vous pouvez aussi ',
    }
  }

  if (guideSlug === 'musculation' && sectionId === 'recuperation') {
    return {
      href: '/fr/programmes/musculation/3-jours',
      label: 'organiser un programme de musculation sur trois jours',
      prefix: 'Pour répartir séances et récupération dans la semaine, découvrez comment ',
    }
  }

  return null
}

function ContextualGuideLink({
  guideSlug,
  sectionId,
}: {
  guideSlug: GuideSlug
  sectionId: string
}) {
  const contextualLink = getContextualLink(guideSlug, sectionId)

  if (!contextualLink) return null

  return (
    <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7, marginTop: 24 }}>
      {contextualLink.prefix}
      <Link href={contextualLink.href} style={{ color: '#c9a84c', textUnderlineOffset: 4 }}>
        {contextualLink.label}
      </Link>.
    </p>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const guide = resolveGuide(locale, slug)
  const canonical = guideUrl(guide.slug)

  return {
    title: guide.seoTitle,
    description: guide.description,
    alternates: {
      canonical,
      languages: {
        fr: canonical,
        'x-default': canonical,
      },
    },
    openGraph: {
      type: 'article',
      title: guide.seoTitle,
      description: guide.description,
      url: canonical,
      locale: 'fr_CH',
      siteName: 'MoovX',
    },
  }
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const guide = resolveGuide(locale, slug)
  const canonical = guideUrl(guide.slug)
  const otherGuide = guide.slug === 'nutrition' ? 'musculation' : 'nutrition'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${canonical}#article`,
    url: canonical,
    mainEntityOfPage: canonical,
    headline: guide.title,
    description: guide.description,
    inLanguage: 'fr',
    author: {
      '@type': 'Organization',
      name: 'MoovX',
      url: SITE_URL,
    },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#f0ede8', fontFamily: 'var(--font-body)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '18px 24px' }}>
        <nav aria-label="Navigation du guide" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <Link href="/fr/landing" style={{ color: '#c9a84c', textDecoration: 'none' }}>MoovX</Link>
          <Link href={`/fr/guides/${otherGuide}`} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
            Guide {otherGuide}
          </Link>
        </nav>
      </header>

      <main>
        <article style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px 88px' }}>
          <header style={{ marginBottom: 48 }}>
            <p style={{ color: '#c9a84c', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{guide.eyebrow}</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 5rem)', lineHeight: 1, margin: '16px 0 24px' }}>
              {guide.title}
            </h1>
            <p style={{ maxWidth: 760, color: 'rgba(255,255,255,0.75)', fontSize: 18, lineHeight: 1.75 }}>{guide.introduction}</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{guide.readingMinutes} minutes de lecture environ</p>
          </header>

          <nav aria-label="Sommaire" style={{ background: '#0d0c0b', border: '1px solid rgba(201,168,76,0.25)', padding: 24, marginBottom: 56 }}>
            <h2 style={{ color: '#c9a84c', marginTop: 0 }}>Sommaire</h2>
            <ol style={{ marginBottom: 0, paddingLeft: 22 }}>
              {guide.sections.map(section => (
                <li key={section.id} style={{ marginBottom: 8 }}>
                  <a href={`#${section.id}`} style={{ color: 'rgba(255,255,255,0.75)' }}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {guide.sections.map(section => (
            <section key={section.id} id={section.id} style={{ scrollMarginTop: 24, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 40, marginBottom: 56 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 5vw, 3rem)', color: '#c9a84c', lineHeight: 1.1 }}>
                {section.title}
              </h2>
              {section.paragraphs.map(paragraph => (
                <p key={paragraph} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 1.8 }}>{paragraph}</p>
              ))}
              {section.points && (
                <ul style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8 }}>
                  {section.points.map(point => <li key={point}>{point}</li>)}
                </ul>
              )}
              {section.table && (
                <div style={{ overflowX: 'auto', marginTop: 28 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                    <caption style={{ textAlign: 'left', color: '#c9a84c', fontWeight: 700, marginBottom: 12 }}>{section.table.caption}</caption>
                    <thead>
                      <tr>
                        {section.table.headers.map(header => (
                          <th key={header} scope="col" style={{ borderBottom: '1px solid rgba(201,168,76,0.4)', padding: 12, textAlign: 'left' }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map(row => (
                        <tr key={row.join('|')}>
                          {row.map(cell => <td key={cell} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 12, color: 'rgba(255,255,255,0.72)' }}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <ContextualGuideLink guideSlug={guide.slug} sectionId={section.id} />
            </section>
          ))}

          <aside style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.08)', padding: 24, lineHeight: 1.7 }}>
            <strong>À retenir :</strong> {guide.disclaimer}
          </aside>
        </article>
      </main>
    </div>
  )
}
