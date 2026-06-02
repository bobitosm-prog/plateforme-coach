'use client'

import { MessageCircle, ChevronRight } from 'lucide-react'
import {
  BG_BASE, GOLD, GOLD_DIM, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

interface ClientCardProps {
  name: string
  email: string
  avatarUrl?: string | null
  initials: string
  statusColor: string
  statusLabel: string
  sinceLabel: string
  unread: number
  invited?: boolean
  onOpen: () => void
  onMessage: () => void
}

export default function ClientCard({
  name, email, avatarUrl, initials, statusColor, statusLabel,
  sinceLabel, unread, invited, onOpen, onMessage,
}: ClientCardProps) {
  return (
    <div className="coach-clickable" onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 34, height: 34, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 700, color: BG_BASE, flexShrink: 0 }}>{initials}</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>{name}</div>
        {email && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: statusColor }}>{statusLabel}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: TEXT_DIM }}>{sinceLabel}</span>
          {invited && <span style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: GOLD_DIM, color: GOLD, letterSpacing: '0.08em' }}>INVITE</span>}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onMessage() }}
        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, position: 'relative' }}
        aria-label="Messages"
      >
        <MessageCircle size={16} color={unread > 0 ? RED : TEXT_MUTED} />
        {unread > 0 && <span style={{ minWidth: 16, height: 16, background: RED, borderRadius: 8, fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      <ChevronRight size={14} color={TEXT_DIM} style={{ flexShrink: 0 }} />
    </div>
  )
}
