import type { ReactNode } from 'react'
import { colors, fonts } from '../../lib/design-tokens'

function renderBold(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const boldPattern = /\*\*(.*?)\*\*/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index))
    }

    nodes.push(
      <strong key={`bold-${match.index}`} style={{ color: colors.gold }}>
        {match[1]}
      </strong>,
    )
    cursor = match.index + match[0].length
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor))
  }

  return nodes
}

export default function AthenaMessageContent({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <>
      {lines.map((line, index) => {
        if (line.startsWith('### ')) {
          return (
            <div
              key={index}
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 700,
                color: colors.gold,
                letterSpacing: 1,
                margin: '10px 0 4px',
                textTransform: 'uppercase',
              }}
            >
              {renderBold(line.slice(4))}
            </div>
          )
        }

        if (line.startsWith('## ')) {
          return (
            <div
              key={index}
              style={{
                fontFamily: fonts.headline,
                fontSize: 18,
                color: colors.gold,
                letterSpacing: 2,
                margin: '12px 0 6px',
              }}
            >
              {renderBold(line.slice(3))}
            </div>
          )
        }

        if (line.startsWith('- ')) {
          return (
            <div key={index} style={{ paddingLeft: 12, margin: '2px 0' }}>
              • {renderBold(line.slice(2))}
            </div>
          )
        }

        if (line === '') {
          return <br key={index} />
        }

        return (
          <span key={index}>
            {renderBold(line)}
            {index < lines.length - 1 && <br />}
          </span>
        )
      })}
    </>
  )
}
