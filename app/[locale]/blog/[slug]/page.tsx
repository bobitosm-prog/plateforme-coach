import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  SITE_URL,
  LOCALES,
  buildHreflangAlternates,
  getOgLocale,
  getAlternateOgLocales,
  type Locale,
} from '@/lib/seo'
import { getPost, getAllPosts } from '@/content/blog/posts'

export function generateStaticParams() {
  const posts = getAllPosts()
  const params: { locale: string; slug: string }[] = []
  for (const post of posts) {
    for (const locale of LOCALES) {
      params.push({ locale, slug: post.slug })
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const loc = locale as Locale
  const post = getPost(slug)
  if (!post) return { title: 'Not found' }
  const c = post.content[loc] || post.content.fr
  return {
    title: c.title,
    description: c.description,
    alternates: { languages: buildHreflangAlternates(`/blog/${slug}`) },
    openGraph: {
      title: c.title,
      description: c.description,
      type: 'article',
      locale: getOgLocale(loc),
      alternateLocale: getAlternateOgLocales(loc),
      url: `${SITE_URL}/${locale}/blog/${slug}`,
      siteName: 'MoovX',
    },
  }
}

export default async function BlogArticle({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const loc = (locale || 'fr') as Locale
  const post = getPost(slug)
  if (!post) notFound()

  const c = post.content[loc] || post.content.fr
  const dateFormatted = new Date(post.date).toLocaleDateString(
    loc === 'de' ? 'de-CH' : loc === 'en' ? 'en-GB' : 'fr-CH',
    { day: 'numeric', month: 'long', year: 'numeric' },
  )
  const labels: Record<Locale, { back: string; min: string; refs: string; cta: string }> = {
    fr: { back: '← Blog', min: 'min de lecture', refs: 'Références scientifiques', cta: 'Commencer maintenant' },
    en: { back: '← Blog', min: 'min read', refs: 'Scientific references', cta: 'Start now' },
    de: { back: '← Blog', min: 'Min. Lesezeit', refs: 'Wissenschaftliche Referenzen', cta: 'Jetzt starten' },
  }
  const l = labels[loc] || labels.fr

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: c.title,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'MoovX' },
    inLanguage: loc,
    url: `${SITE_URL}/${locale}/blog/${slug}`,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#e5e2e1', fontFamily: 'var(--font-body)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href={`/${locale}/blog`} style={{ color: 'var(--gold)', fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font-display)', letterSpacing: 2, textTransform: 'uppercase' }}>
          {l.back}
        </Link>
      </header>

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, letterSpacing: 2, lineHeight: 1.2, marginBottom: 16 }}>
          {c.title}
        </h1>

        <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>
          <span>{dateFormatted}</span>
          <span>·</span>
          <span>{post.readingMinutes} {l.min}</span>
        </div>

        <p style={{ fontSize: 17, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', marginBottom: 36 }}>
          {c.intro}
        </p>

        {c.sections.map((section, i) => (
          <section key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', fontWeight: 700, letterSpacing: 1, color: 'var(--gold)', marginBottom: 16 }}>
              {section.heading}
            </h2>
            {section.paragraphs.map((p, j) => (
              <p key={j} style={{ fontSize: 16, lineHeight: 1.8, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>
                {p}
              </p>
            ))}
          </section>
        ))}

        {c.table && c.tableTitle && (
          <div style={{ margin: '40px 0', background: '#111', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(212,168,67,0.15)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>
              {c.tableTitle}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {c.table.headers.map((h, i) => (
                      <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-body)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: '10px 16px', fontSize: 14, color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-body)' }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ margin: '48px 0', padding: '24px', background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 14, textAlign: 'center' }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', marginBottom: 16 }}>
            {c.ctaText}
          </p>
          <Link
            href="/register-client"
            style={{
              display: 'inline-block', padding: '12px 28px',
              background: 'var(--gold)', color: '#000', borderRadius: 12,
              fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
              letterSpacing: 2, textTransform: 'uppercase', textDecoration: 'none',
            }}
          >
            {l.cta}
          </Link>
        </div>

        {post.references.length > 0 && (
          <section style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>
              {l.refs}
            </h2>
            <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {post.references.map((ref, i) => (
                <li key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)' }}>
                  {ref.authors} ({ref.year}). <em>{ref.title}</em>. {ref.journal}.{' '}
                  <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
                    Lien
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 40, lineHeight: 1.6, fontStyle: 'italic' }}>
          {c.disclaimer}
        </p>
      </article>
    </div>
  )
}
