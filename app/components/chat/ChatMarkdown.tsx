import { Fragment, type ReactNode } from 'react'
import { colors, fonts } from '../../../lib/design-tokens'

interface ChatMarkdownProps {
  content: string
}

interface ChatPlainTextProps {
  content: string
}

function renderBoldText(text: string, lineIndex: number): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  let segment = 0

  while (cursor < text.length) {
    const opening = text.indexOf('**', cursor)
    if (opening === -1) {
      nodes.push(text.slice(cursor))
      break
    }

    const closing = text.indexOf('**', opening + 2)
    if (closing === -1) {
      nodes.push(text.slice(cursor))
      break
    }

    if (opening > cursor) nodes.push(text.slice(cursor, opening))
    nodes.push(
      <strong key={`${lineIndex}-${segment}`} style={{ color: colors.gold }}>
        {text.slice(opening + 2, closing)}
      </strong>
    )
    segment += 1
    cursor = closing + 2
  }

  return nodes
}

function renderLine(line: string, lineIndex: number): ReactNode {
  if (line.startsWith('### ')) {
    return (
      <div
        data-chat-markdown="heading-3"
        style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 700, color: colors.gold, letterSpacing: 1, margin: '10px 0 4px', textTransform: 'uppercase' }}
      >
        {renderBoldText(line.slice(4), lineIndex)}
      </div>
    )
  }

  if (line.startsWith('## ')) {
    return (
      <div
        data-chat-markdown="heading-2"
        style={{ fontFamily: fonts.headline, fontSize: 18, color: colors.gold, letterSpacing: 2, margin: '12px 0 6px' }}
      >
        {renderBoldText(line.slice(3), lineIndex)}
      </div>
    )
  }

  if (line.startsWith('- ')) {
    return (
      <div data-chat-markdown="list-item" style={{ paddingLeft: 12, margin: '2px 0' }}>
        • {renderBoldText(line.slice(2), lineIndex)}
      </div>
    )
  }

  return <>{renderBoldText(line, lineIndex)}</>
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  const lines = content.split('\n')

  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {renderLine(line, index)}
          {index < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  )
}

export function ChatPlainText({ content }: ChatPlainTextProps) {
  return <>{content}</>
}
