import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { markdownToHtml } from '@/lib/markdown'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const dynamicParams = false
export function generateStaticParams() {
  return ['fr', 'en', 'de'].flatMap(locale => ['cgu', 'privacy'].map(document => ({ locale, document })))
}

// Public, read-only legal documents: no user data or authentication required.
// Only these six checked-in files can be read; never accept arbitrary paths.
export async function GET(_request: Request, context: { params: Promise<{ locale: string; document: string }> }) {
  const { locale, document } = await context.params
  if (!['fr', 'en', 'de'].includes(locale) || !['cgu', 'privacy'].includes(document)) {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  const markdown = await readFile(path.join(process.cwd(), 'content/legal', `${document}-${locale}.md`), 'utf8')
  return Response.json({ html: markdownToHtml(markdown) }, {
    headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
  })
}
