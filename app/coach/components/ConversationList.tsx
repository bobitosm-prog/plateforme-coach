'use client'

import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM,
  RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'
import { initials } from '../hooks/useCoachDashboard'
import type { ClientRow } from '../hooks/useCoachDashboard'

function formatLastTime(iso: string): string {
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function lastMsgPreview(msg: { content: string; image_url: string | null } | undefined): string {
  if (!msg) return 'Démarrer la conversation'
  if (msg.image_url) return msg.content || '📷 Photo'
  return msg.content || ''
}

interface ConversationListProps {
  clients: ClientRow[]
  openChat: (c: ClientRow) => void
  unreadCounts: Record<string, number>
  lastMessages: Map<string, { content: string; image_url: string | null; created_at: string }>
  selectedClientId?: string | null
}

export default function ConversationList({
  clients, openChat, unreadCounts, lastMessages, selectedClientId,
}: ConversationListProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: `1px solid ${BORDER}`, background: BG_CARD, flexShrink: 0 }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: 0 }}>Messages</h2>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, background: BG_BASE }}>
        {clients.length === 0 && (
          <p style={{ padding: '24px 16px', color: TEXT_MUTED, fontSize: '0.85rem', textAlign: 'center', fontFamily: FONT_BODY }}>Aucun client.</p>
        )}
        {clients.map(c => {
          const name = c.profiles?.full_name ?? 'Sans nom'
          const ini = initials(c.profiles?.full_name)
          const unread = unreadCounts[c.client_id] || 0
          const last = lastMessages.get(c.client_id)
          const preview = lastMsgPreview(last)
          const time = last ? formatLastTime(last.created_at) : ''
          const isSelected = selectedClientId === c.client_id
          return (
            <div
              key={c.id}
              onClick={() => openChat(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: `1px solid ${BORDER}`,
                transition: 'background 150ms',
                background: isSelected ? GOLD_DIM : 'transparent',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = BG_CARD_2 }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
            >
              {c.profiles?.avatar_url
                ? <img src={c.profiles.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 44, height: 44, borderRadius: '50%', background: GOLD, color: '#0D0B08', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{ini}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: '0.95rem', color: TEXT_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  {time && <span style={{ fontSize: '0.7rem', color: unread > 0 ? GOLD : TEXT_DIM, flexShrink: 0 }}>{time}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.8rem', color: unread > 0 ? TEXT_PRIMARY : TEXT_MUTED, fontWeight: unread > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: FONT_BODY }}>{preview}</span>
                  {unread > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: RED, color: '#fff', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{unread > 9 ? '9+' : unread}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
