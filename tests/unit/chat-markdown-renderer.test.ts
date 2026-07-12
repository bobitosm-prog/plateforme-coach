import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ChatMarkdown, ChatPlainText } from '../../app/components/chat/ChatMarkdown'

function render(content: string) {
  return renderToStaticMarkup(createElement(ChatMarkdown, { content }))
}

describe('ChatMarkdown — allowed Markdown subset', () => {
  it('renders level 2 and level 3 headings with text content', () => {
    const html = render('## Programme\n### Jour 1')

    expect(html).toContain('data-chat-markdown="heading-2"')
    expect(html).toContain('data-chat-markdown="heading-3"')
    expect(html).toContain('Programme')
    expect(html).toContain('Jour 1')
  })

  it('renders simple list items without creating links or rich HTML', () => {
    const html = render('- Squats\n- Pompes')

    expect(html).toContain('data-chat-markdown="list-item"')
    expect(html).toContain('• Squats')
    expect(html).toContain('• Pompes')
  })

  it('renders paired bold markers and leaves malformed markers visible', () => {
    const html = render('Un texte **important** puis **mal fermé')

    expect(html).toContain('<strong')
    expect(html).toContain('important</strong>')
    expect(html).toContain('**mal fermé')
  })

  it('preserves paragraphs, line breaks, blank lines and normal text', () => {
    const html = render('Première ligne\nDeuxième ligne\n\nDernier paragraphe')

    expect(html.match(/<br\/>/g)).toHaveLength(3)
    expect(html).toContain('Première ligne')
    expect(html).toContain('Deuxième ligne')
    expect(html).toContain('Dernier paragraphe')
  })
})

describe('ChatMarkdown — hostile input remains inert text', () => {
  it.each([
    ['script', '<script>alert(1)</script>'],
    ['image event', '<img src=x onerror=alert(1)>'],
    ['svg event', '<svg onload=alert(1)>'],
    ['iframe', '<iframe src="https://evil.example">'],
    ['onclick', '<div onclick="alert(1)">clic</div>'],
    ['onmouseover', '<span onmouseover="alert(1)">survol</span>'],
    ['style attribute', '<p style="background:url(javascript:alert(1))">x</p>'],
    ['javascript-like link', '[clic](javascript:alert(1))'],
    ['data-like link', '[clic](data:text/html,<script>alert(1)</script>)'],
    ['incomplete nested tags', '<div><strong><img src=x onerror=alert(1)>'],
  ])('does not create elements or attributes for %s', (_label, payload) => {
    const html = render(payload)

    expect(html).not.toMatch(/<(script|img|svg|iframe|a)\b/i)
    expect(html).not.toMatch(/<[^>]+\s(onclick|onmouseover|onerror|onload)=/i)
    expect(html).not.toContain('dangerouslySetInnerHTML')
    expect(html.length).toBeGreaterThan(0)
  })

  it.each([
    ['bold', '**<img src=x onerror=alert(1)>**'],
    ['heading 2', '## <script>alert(1)</script>'],
    ['heading 3', '### <svg onload=alert(1)>'],
    ['list', '- <iframe src="https://evil.example">'],
  ])('keeps hostile HTML inside %s visible as escaped text', (_label, payload) => {
    const html = render(payload)

    expect(html).not.toMatch(/<(script|img|svg|iframe)\b/i)
    expect(html).toContain('&lt;')
  })

  it('does not decode HTML entities into markup', () => {
    const html = render('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &#x3C;img&#x3E;')

    expect(html).toContain('&amp;lt;script&amp;gt;')
    expect(html).toContain('&amp;amp;')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
  })

  it('preserves angle brackets, ampersands, quotes and apostrophes as text', () => {
    const html = render(`< > & "double" 'simple'`)

    expect(html).toContain('&lt; &gt; &amp; &quot;double&quot; &#x27;simple&#x27;')
  })

  it('handles a very long string and malformed Markdown without crashing', () => {
    const payload = `${'a'.repeat(100_000)} **never closed <script>alert(1)`

    expect(() => render(payload)).not.toThrow()
    const html = render(payload)
    expect(html).not.toContain('<script')
    expect(html).toContain('**never closed')
  })

  it('renders user messages as escaped plain text without Markdown interpretation', () => {
    const payload = '## titre **gras** <img src=x onerror=alert(1)>'
    const html = renderToStaticMarkup(createElement(ChatPlainText, { content: payload }))

    expect(html).toContain('## titre **gras** &lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toMatch(/<(img|strong|div)\b/i)
  })
})
