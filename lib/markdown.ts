// lib/markdown.ts
// Minimal markdown to HTML converter for legal pages (no external dependency)
// Handles: headings, paragraphs, bold, italic, links, lists, horizontal rules

export function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const html: string[] = []
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) { html.push('</ul>'); inList = false }
      html.push('<hr />')
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      if (inList) { html.push('</ul>'); inList = false }
      const level = headingMatch[1].length
      const text = inlineFormat(headingMatch[2])
      html.push(`<h${level}>${text}</h${level}>`)
      continue
    }

    // Unordered list items
    if (/^[-*]\s+/.test(line.trim())) {
      if (!inList) { html.push('<ul>'); inList = true }
      const text = inlineFormat(line.trim().replace(/^[-*]\s+/, ''))
      html.push(`<li>${text}</li>`)
      continue
    }

    // Ordered list items
    if (/^\d+\.\s+/.test(line.trim())) {
      if (!inList) { html.push('<ul>'); inList = true }
      const text = inlineFormat(line.trim().replace(/^\d+\.\s+/, ''))
      html.push(`<li>${text}</li>`)
      continue
    }

    // Close list if we hit a non-list line
    if (inList) { html.push('</ul>'); inList = false }

    // Empty line
    if (line.trim() === '') {
      continue
    }

    // Paragraph
    html.push(`<p>${inlineFormat(line)}</p>`)
  }

  if (inList) html.push('</ul>')
  return html.join('\n')
}

function inlineFormat(text: string): string {
  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  // Bold: **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>')
  // Italic: *text* or _text_
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Inline code: `text`
  text = text.replace(/`(.+?)`/g, '<code>$1</code>')
  return text
}
