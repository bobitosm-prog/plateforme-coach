'use client'

import { useState, useRef } from 'react'
import { ChevronRight, ArrowLeft, Send, Check, CheckCheck, ImageIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

import { useMessageImageUpload } from '../../hooks/useMessageImageUpload'
import MessageImage from '../../components/MessageImage'
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
  sendMessage: (imageUrl?: string | null) => void
  unreadCounts: Record<string, number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  session: any
  msgEndRef: React.RefObject<HTMLDivElement | null>
}

export default function CoachMessages({
  clients, selectedClient, setSelectedClient, openChat,
  chatMessages, msgInput, setMsgInput, sendMessage,
  unreadCounts, supabase, session,
  msgEndRef,
}: CoachMessagesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { uploadImage, uploading } = useMessageImageUpload(supabase)
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)) }; e.target.value = '' }
  const clearFile = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setSelectedFile(null); setPreviewUrl(null) }
  const handleSend = async () => {
    if (uploading) return
    let imageUrl: string | null = null
    if (selectedFile) { imageUrl = await uploadImage(selectedFile); clearFile() }
    if (!msgInput.trim() && !imageUrl) return
    sendMessage(imageUrl)
  }

  return (
    <>
      {/* ── MESSAGES SECTION: client list (no chat open) ── */}
      {!selectedClient && (
        <div className="section-pad" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
              return (
                <div key={c.id} className="client-chat-row" onClick={() => openChat(c)}>
                  {c.profiles?.avatar_url
                    ? <img src={c.profiles.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div className="avatar-circle" style={{ width: 38, height: 38, fontSize: '0.9rem' }}>{ini}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: '0.9rem', color: TEXT_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ fontSize: '0.72rem', color: TEXT_MUTED, fontFamily: FONT_BODY, marginTop: 2 }}>Appuyer pour ouvrir</div>
                  </div>
                  {unread > 0 && (
                    <span style={{ minWidth: 20, height: 20, background: RED, borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                  <ChevronRight size={16} color={TEXT_DIM} style={{ flexShrink: 0 }} />
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
          <div style={{ padding: '14px 16px', paddingTop: 'max(14px, env(safe-area-inset-top, 14px))', background: BG_CARD, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => setSelectedClient(null)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: '6px', minWidth: 44, minHeight: 44 }}
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            {selectedClient.profiles?.avatar_url
              ? <img src={selectedClient.profiles.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div className="avatar-circle" style={{ flexShrink: 0 }}>{initials(selectedClient.profiles?.full_name)}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_ALT, fontWeight: 700, fontSize: '1rem', color: TEXT_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '1px', textTransform: 'uppercase' as const }}>
                {selectedClient.profiles?.full_name ?? 'Sans nom'}
              </div>
              <div style={{ fontSize: '0.72rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>Client</div>
            </div>
          </div>

          {/* Messages scroll area — paddingBottom leaves room for fixed input */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: TEXT_MUTED, fontSize: '0.85rem', fontFamily: FONT_BODY }}>Aucun message. Commencez la conversation !</p>
              </div>
            )}
            {chatMessages.map(msg => {
              const isMine = msg.sender_id === session.user.id
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%',
                    wordBreak: 'break-word',
                    background: isMine ? GOLD_DIM : BG_CARD_2,
                    color: TEXT_PRIMARY,
                    borderRadius: RADIUS_CARD,
                    padding: msg.image_url ? 4 : '10px 14px',
                    border: isMine ? `1px solid ${GOLD_RULE}` : `1px solid ${BORDER}`,
                    overflow: 'hidden',
                  }}>
                    {msg.image_url && <MessageImage supabase={supabase} path={msg.image_url} />}
                    {msg.content && <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.45, fontFamily: FONT_BODY, padding: msg.image_url ? '4px 10px 0' : 0 }}>{msg.content}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: 4, marginTop: 4, padding: msg.image_url ? '0 10px 4px' : 0 }}>
                      <span style={{ fontSize: '0.62rem', opacity: 0.5, fontFamily: FONT_BODY }}>{format(new Date(msg.created_at), 'HH:mm', { locale: fr })}</span>
                      {isMine && (msg.read ? <CheckCheck size={12} style={{ opacity: 0.6, color: GOLD }} /> : <Check size={12} style={{ opacity: 0.4, color: TEXT_DIM }} />)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={msgEndRef} />
          </div>

          {/* Fixed input bar — sits above bottom nav */}
          {previewUrl && (
            <div style={{ position: 'fixed', bottom: 120, left: 16, right: 16, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 202 }}>
              <img src={previewUrl} alt="Preview" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }} />
              <button onClick={clearFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 4 }}><X size={16} /></button>
            </div>
          )}
          <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, background: BG_CARD, borderTop: `1px solid ${BORDER}`, padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', display: 'flex', gap: 12, alignItems: 'center', zIndex: 201 }}>
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileSelected} />
            <button onClick={() => fileInputRef.current?.click()} style={{ width: 44, height: 44, borderRadius: 12, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ImageIcon size={17} color={TEXT_MUTED} />
            </button>
            <input
              className="msg-input"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={`Message à ${selectedClient.profiles?.full_name?.split(' ')[0] ?? 'client'}…`}
            />
            <button
              onClick={handleSend}
              disabled={uploading}
              style={{ width: 44, height: 44, borderRadius: 12, background: (msgInput.trim() || selectedFile) ? GOLD : BORDER, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 200ms' }}
            >
              {uploading ? <div style={{ width: 16, height: 16, border: '2px solid #0D0B08', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Send size={17} color={(msgInput.trim() || selectedFile) ? BG_BASE : TEXT_MUTED} />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
