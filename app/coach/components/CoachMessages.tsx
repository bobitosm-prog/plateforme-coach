'use client'

import { ChevronRight, ArrowLeft, Send } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { initials } from '../hooks/useCoachDashboard'
import type { ClientRow } from '../hooks/useCoachDashboard'

interface CoachMessagesProps {
  clients: ClientRow[]
  selectedClient: ClientRow | null
  setSelectedClient: (c: ClientRow | null) => void
  openChat: (c: ClientRow) => void
  chatMessages: any[]
  msgInput: string
  setMsgInput: (v: string) => void
  sendMessage: () => void
  unreadCounts: Record<string, number>
  session: any
  msgEndRef: React.RefObject<HTMLDivElement | null>
}

export default function CoachMessages({
  clients, selectedClient, setSelectedClient, openChat,
  chatMessages, msgInput, setMsgInput, sendMessage,
  unreadCounts, session,
  msgEndRef,
}: CoachMessagesProps) {
  return (
    <>
      {/* ── MESSAGES SECTION: client list (no chat open) ── */}
      {!selectedClient && (
        <div className="section-pad" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #374151', background: '#1F2937', flexShrink: 0 }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F8FAFC', margin: 0 }}>Messages</h2>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, background: '#1F2937' }}>
            {clients.length === 0 && (
              <p style={{ padding: '24px 16px', color: '#6B7280', fontSize: '0.85rem', textAlign: 'center' }}>Aucun client.</p>
            )}
            {clients.map(c => {
              const name = c.profiles?.full_name ?? 'Sans nom'
              const ini = initials(c.profiles?.full_name)
              const unread = unreadCounts[c.client_id] || 0
              return (
                <div key={c.id} className="client-chat-row" onClick={() => openChat(c)}>
                  {c.profiles?.avatar_url
                    ? <img src={c.profiles.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div className="avatar-circle" style={{ width: 38, height: 38, fontSize: '0.9rem' }}>{ini}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>Appuyer pour ouvrir</div>
                  </div>
                  {unread > 0 && (
                    <span style={{ minWidth: 20, height: 20, background: '#EF4444', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                  <ChevronRight size={16} color="#4B5563" style={{ flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CHAT FULL-SCREEN OVERLAY (any section, when client selected) ── */}
      {selectedClient && (
        <div className="chat-fullscreen">

          {/* Header */}
          <div style={{ padding: '14px 16px', paddingTop: 'max(14px, env(safe-area-inset-top, 14px))', background: '#1F2937', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => setSelectedClient(null)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '6px', minWidth: 44, minHeight: 44 }}
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            {selectedClient.profiles?.avatar_url
              ? <img src={selectedClient.profiles.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div className="avatar-circle" style={{ flexShrink: 0 }}>{initials(selectedClient.profiles?.full_name)}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedClient.profiles?.full_name ?? 'Sans nom'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Client</div>
            </div>
          </div>

          {/* Messages scroll area — paddingBottom leaves room for fixed input */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>Aucun message. Commencez la conversation !</p>
              </div>
            )}
            {chatMessages.map(msg => {
              const isMine = msg.sender_id === session.user.id
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%',
                    wordBreak: 'break-word',
                    background: isMine ? '#F97316' : '#1F2937',
                    color: '#F8FAFC',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '10px 14px',
                    border: isMine ? 'none' : '1px solid #374151',
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

          {/* Fixed input bar — sits above bottom nav */}
          <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, background: '#1F2937', borderTop: '1px solid #374151', padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', display: 'flex', gap: 12, alignItems: 'center', zIndex: 201 }}>
            <input
              className="msg-input"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={`Message à ${selectedClient.profiles?.full_name?.split(' ')[0] ?? 'client'}…`}
            />
            <button
              onClick={sendMessage}
              style={{ width: 44, height: 44, borderRadius: '50%', background: msgInput.trim() ? '#F97316' : '#374151', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 200ms' }}
            >
              <Send size={17} color={msgInput.trim() ? '#000' : '#6B7280'} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
