import type { Metadata } from 'next'
import Link from 'next/link'
import { buildAlternates, type Locale } from '@/lib/seo'
import { getAllPosts } from '@/content/blog/posts'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const loc = locale as Locale
  const titles: Record<Locale, string> = { fr: 'Blog — MoovX', en: 'Blog — MoovX', de: 'Blog — MoovX' }
  const descriptions: Record<Locale, string> = {
    fr: 'Articles nutrition et entraînement basés sur la science. Par MoovX, plateforme fitness Swiss Made.',
    en: 'Science-based nutrition and training articles. By MoovX, Swiss Made fitness platform.',
    de: 'Wissenschaftlich fundierte Ernährungs- und Trainingsartikel. Von MoovX, Swiss Made Fitnessplattform.',
  }
  return {
    title: titles[loc] || titles.fr,
    description: descriptions[loc] || descriptions.fr,
    alternates: buildAlternates('/blog', loc),
  }
}

export default async function BlogIndex({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const loc = (locale || 'fr') as Locale
  const posts = getAllPosts()
  const labels: Record<Locale, { back: string; read: string; min: string }> = {
    fr: { back: 'Retour', read: 'Lire', min: 'min de lecture' },
    en: { back: 'Back', read: 'Read', min: 'min read' },
    de: { back: 'Zurück', read: 'Lesen', min: 'Min. Lesezeit' },
  }
  const l = labels[loc] || labels.fr

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#e5e2e1', fontFamily: 'var(--font-body)' }}>
      <header style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href={`/${locale}/landing`} style={{ color: 'var(--gold)', fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font-display)', letterSpacing: 2, textTransform: 'uppercase' }}>
          ← {l.back}
        </Link>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Blog</span>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 40 }}>
          Blog MoovX
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {posts.map((post) => {
            const c = post.content[loc] || post.content.fr
            return (
              <Link
                key={post.slug}
                href={`/${locale}/blog/${post.slug}`}
                style={{
                  display: 'block', padding: '24px', background: '#111',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
                  textDecoration: 'none', color: 'inherit',
                  transition: 'border-color 150ms',
                }}
                className="coach-clickable"
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: 1 }}>
                  {c.title}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 12 }}>
                  {c.description}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>
                  <span>{new Date(post.date).toLocaleDateString(loc === 'de' ? 'de-CH' : loc === 'en' ? 'en-GB' : 'fr-CH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span>·</span>
                  <span>{post.readingMinutes} {l.min}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
