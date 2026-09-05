import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AthenaMessageContent from '@/app/components/AthenaMessageContent'

function renderMessage(content: string) {
  return renderToStaticMarkup(AthenaMessageContent({ content }))
}

describe('Athena assistant message rendering', () => {
  it('preserves text and bold formatting', () => {
    const html = renderMessage('Bonjour **Marco**')

    expect(html).toContain('Bonjour ')
    expect(html).toContain('<strong')
    expect(html).toContain('Marco</strong>')
  })

  it('preserves headings and simple lists', () => {
    const html = renderMessage('## Analyse\n### Conseil\n- Conseil 1\n- Conseil 2')

    for (const text of ['Analyse', 'Conseil', '• Conseil 1', '• Conseil 2']) {
      expect(html).toContain(text)
    }
  })

  it('renders script payloads as text', () => {
    const html = renderMessage('<script>alert(1)</script>')

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('renders dangerous HTML attributes as text', () => {
    const html = renderMessage('<img src=x onerror=alert(1)>')

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('does not create active javascript links', () => {
    const html = renderMessage('<a href="javascript:alert(1)">ouvrir</a>')

    expect(html).not.toContain('<a ')
    expect(html).toContain('&lt;a href=&quot;javascript:alert(1)&quot;&gt;ouvrir&lt;/a&gt;')
  })

  it('escapes payloads inside headings and list items', () => {
    const html = renderMessage('## <img src=x onerror=alert(1)>\n- <script>alert(1)</script>')

    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('routes every assistant history message through the safe renderer', () => {
    const chatSource = readFileSync('app/components/ChatAI.tsx', 'utf8')

    expect(chatSource).toContain('<AthenaMessageContent content={msg.content} />')
    expect(chatSource).not.toContain('dangerouslySetInnerHTML')
    expect(chatSource).not.toContain('renderMarkdown')
  })
})
