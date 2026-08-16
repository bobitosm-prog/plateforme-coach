import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { markdownToHtml } from '@/lib/markdown'
import { buildAlternates, type Locale } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legal' })
  return {
    title: t('cgu.title') + ' | MoovX',
    alternates: buildAlternates('/cgu', locale as Locale),
  }
}

export default async function CguPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legal' })
  const filePath = path.join(process.cwd(), 'content', 'legal', `cgu-${locale}.md`)
  const md = fs.readFileSync(filePath, 'utf-8')
  const html = markdownToHtml(md)

  return (
    <div style={{ minHeight: '100vh', background: '#0D0B08', color: '#F0EDE8', padding: '80px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ color: '#8A8580', fontSize: 12, marginBottom: 8 }}>{t('cgu.version')}</p>
        <div
          className="legal-prose"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <style>{`
          .legal-prose h1 { font-family: var(--font-display, 'Bebas Neue'); font-size: 48px; color: #D4A843; letter-spacing: 2px; margin: 0 0 32px; text-transform: uppercase; }
          .legal-prose h2 { font-family: var(--font-alt, 'Barlow Condensed'); font-size: 20px; color: #F0EDE8; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 40px 0 16px; }
          .legal-prose h3 { font-family: var(--font-alt, 'Barlow Condensed'); font-size: 16px; color: #D4A843; font-weight: 600; margin: 24px 0 12px; }
          .legal-prose p { color: #8A8580; line-height: 1.8; margin-bottom: 16px; font-size: 14px; }
          .legal-prose strong { color: #F0EDE8; }
          .legal-prose a { color: #D4A843; text-decoration: underline; }
          .legal-prose a:hover { color: #E5BC56; }
          .legal-prose ul { color: #8A8580; line-height: 1.8; padding-left: 20px; margin-bottom: 16px; font-size: 14px; }
          .legal-prose li { margin-bottom: 6px; }
          .legal-prose hr { border: none; border-top: 1px solid rgba(212,168,67,0.15); margin: 40px 0; }
          .legal-prose code { background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 3px; font-size: 13px; }
        `}</style>
      </div>
    </div>
  )
}
