'use client'
import { useRef, useEffect } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MessageCircle, Send, Check, CheckCheck } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  TEXT_PRIMARY, TEXT_MUTED, FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD,
} from '../../../lib/design-tokens'

interface MessagesTabProps {
  session: any
  coachId: string | null
  messages: any[]
  msgInput: string
  setMsgInput: (v: string) => void
  sendMessage: () => Promise<void>
  msgEndRef: React.RefObject<HTMLDivElement | null>
}

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return "Aujourd'hui"
  if (isYesterday(d)) return 'Hier'
  return format(d, 'd MMMM yyyy', { locale: fr })
}

export default function MessagesTab({
  session, coachId, messages, msgInput, setMsgInput, sendMessage, msgEndRef,
}: MessagesTabProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px'
    }
  }, [msgInput])

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (messages.length === 0) return
    const isInitial = prevLengthRef.current === 0
    prevLengthRef.current = messages.length
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: isInitial ? 'instant' as ScrollBehavior : 'smooth' })
    }, 0)
    return () => clearTimeout(timer)
  }, [messages.length])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ background: BG_CARD, padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: RADIUS_CARD, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_ALT, fontSize: '0.85rem', fontWeight: 700, color: '#050505' }}>C</div>
        <div>
          <h1 style={{ fontFamily: FONT_ALT, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '2px', margin: 0, color: TEXT_PRIMARY, textTransform: 'uppercase' }}>MON COACH</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: RADIUS_CARD, background: '#22C55E' }} />
            <span style={{ fontSize: '0.62rem', color: '#22C55E', fontWeight: 600, fontFamily: FONT_BODY }}>En ligne</span>
          </div>
        </div>
      </div>

      {!coachId ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <MessageCircle size={40} color={TEXT_MUTED} />
          <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', margin: 0, fontFamily: FONT_BODY, fontWeight: 300 }}>Aucun coach assigné pour l'instant.</p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <MessageCircle size={32} color={TEXT_MUTED} style={{ marginBottom: 8 }} />
                <p style={{ color: TEXT_MUTED, fontSize: '0.85rem', margin: 0, fontFamily: FONT_BODY, fontWeight: 300 }}>Envoie ton premier message !</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === session.user.id
              const prevMsg = messages[i - 1]
              const currDate = new Date(msg.created_at).toDateString()
              const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null
              const showDate = currDate !== prevDate

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0', padding: '0 8px' }}>
                      <div style={{ flex: 1, height: 1, background: BORDER }} />
                      <span style={{ fontSize: '0.62rem', color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', flexShrink: 0, fontFamily: FONT_ALT }}>{dateLabel(msg.created_at)}</span>
                      <div style={{ flex: 1, height: 1, background: BORDER }} />
                    </div>
                  )}
                  {/* Bubble */}
                  <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
                    <div style={{
                      maxWidth: '78%',
                      background: isMine ? GOLD_DIM : BG_CARD_2,
                      color: isMine ? TEXT_PRIMARY : TEXT_PRIMARY,
                      borderRadius: RADIUS_CARD,
                      padding: '10px 14px',
                      border: isMine ? `1px solid ${GOLD_RULE}` : `1px solid ${BORDER}`,
                    }}>
                      <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', fontFamily: FONT_BODY, fontWeight: 400 }}>{msg.content}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: 4, marginTop: 3 }}>
                        <span style={{ fontSize: '0.58rem', opacity: 0.5, fontFamily: FONT_BODY }}>{format(new Date(msg.created_at), 'HH:mm')}</span>
                        {isMine && (msg.read ? <CheckCheck size={12} style={{ opacity: 0.6, color: GOLD }} /> : <Check size={12} style={{ opacity: 0.4 }} />)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <div style={{ flexShrink: 0, padding: '12px 14px', background: BG_BASE, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Écrire un message..."
              rows={1}
              style={{ flex: 1, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 16px', color: TEXT_PRIMARY, fontSize: '0.88rem', outline: 'none', resize: 'none', maxHeight: 100, lineHeight: 1.4, fontFamily: FONT_BODY, fontWeight: 400 }}
            />
            <button
              onClick={sendMessage}
              disabled={!msgInput.trim()}
              style={{ width: 40, height: 40, borderRadius: 12, background: msgInput.trim() ? GOLD : BORDER, border: 'none', cursor: msgInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 200ms' }}
            >
              <Send size={16} color={msgInput.trim() ? '#050505' : TEXT_MUTED} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
