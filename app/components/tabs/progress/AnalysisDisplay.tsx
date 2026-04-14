'use client'
import { colors } from '../../../../lib/design-tokens'

export default function AnalysisDisplay({ text }: { text: string }) {
  const sections = [
    { title: 'ANALYSE VISUELLE', color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
    { title: 'COHERENCE PROGRAMME', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
    { title: 'POINTS POSITIFS', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
    { title: 'AXES DE PROGRESSION', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
    { title: 'RECOMMANDATION PRIORITAIRE', color: '#D4A843', bg: colors.goldDim, border: colors.goldRule },
  ]

  const parts: { title: string; content: string; color: string; bg: string; border: string }[] = []
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    const regex = new RegExp(`(?:^|\\n)\\**${i + 1}\\.\\s*(?:[\\u{1F441}\\u2696\\u2705\\u{1F3AF}\\u{1F680}]\\s*)?(?:\\**${s.title.split(' ')[0]}[^\\n]*)?[:\\s]*`, 'iu')
    const nextRegex = i < sections.length - 1 ? new RegExp(`(?:^|\\n)\\**${i + 2}\\.\\s*`, 'i') : null
    const match = text.match(regex)
    if (match) {
      const startIdx = (match.index || 0) + match[0].length
      const endIdx = nextRegex ? text.slice(startIdx).search(nextRegex) : -1
      const content = endIdx >= 0 ? text.slice(startIdx, startIdx + endIdx).trim() : (i === sections.length - 1 ? text.slice(startIdx).trim() : '')
      if (content) parts.push({ ...s, content })
    }
  }

  if (parts.length === 0) {
    return <div style={{ fontSize: '0.82rem', color: '#D1D5DB', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {parts.map(({ title, content, color, bg, border }) => (
        <div key={title} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{title}</div>
          <p style={{ fontSize: '0.78rem', color: '#D1D5DB', lineHeight: 1.55, margin: 0 }}>{content}</p>
        </div>
      ))}
    </div>
  )
}
