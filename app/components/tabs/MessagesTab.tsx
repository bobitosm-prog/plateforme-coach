'use client'
import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MessageCircle, Send } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BORDER, ORANGE, TEXT_PRIMARY, TEXT_MUTED,
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

export default function MessagesTab({
  session,
  coachId,
  messages,
  msgInput,
  setMsgInput,
  sendMessage,
  msgEndRef,
}: MessagesTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 72px)' }}>

      {/* Header */}
      <div style={{ background: BG_CARD, padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>MON COACH</h1>
      </div>

      {!coachId ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <MessageCircle size={40} color={TEXT_MUTED} />
          <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', margin: 0 }}>Aucun coach assigné pour l'instant.</p>
        </div>
      ) : (
        <>
          {/* Message bubbles */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: TEXT_MUTED, fontSize: '0.85rem' }}>Commencez la conversation avec votre coach !</p>
              </div>
            )}
            {messages.map(msg => {
              const isMine = msg.sender_id === session.user.id
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%',
                    background: isMine ? ORANGE : BG_CARD,
                    color: isMine ? '#000' : TEXT_PRIMARY,
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '10px 14px',
                    border: isMine ? 'none' : `1px solid ${BORDER}`,
                  }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.45 }}>{msg.content}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.62rem', opacity: 0.6, textAlign: isMine ? 'right' : 'left' }}>
                      {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', background: BG_CARD, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            <input
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Écrire un message…"
              style={{ flex: 1, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '10px 16px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none' }}
            />
            <button
              onClick={sendMessage}
              style={{ width: 42, height: 42, borderRadius: '50%', background: msgInput.trim() ? ORANGE : BORDER, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 200ms' }}
            >
              <Send size={16} color={msgInput.trim() ? '#000' : TEXT_MUTED} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
