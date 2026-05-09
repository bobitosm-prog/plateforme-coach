'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, Send, Check, CheckCheck, ImageIcon, X, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'
import { useMessageImageUpload } from '../../hooks/useMessageImageUpload'
import MessageImage from '../../components/MessageImage'
import { initials } from '../hooks/useCoachDashboard'
import type { ClientRow } from '../hooks/useCoachDashboard'

interface ConversationPanelProps {
  selectedClient: ClientRow | null
  setSelectedClient: (c: ClientRow | null) => void
  chatMessages: any[]
  msgInput: string
  setMsgInput: (v: string) => void
  sendMessage: (imageUrl?: string | null) => void
  supabase: any
  session: any
  msgEndRef: React.RefObject<HTMLDivElement | null>
  isMobile: boolean
}

export default function ConversationPanel({
  selectedClient, setSelectedClient,
  chatMessages, msgInput, setMsgInput, sendMessage,
  supabase, session, msgEndRef, isMobile,
}: ConversationPanelProps) {
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

  // ── Empty state (desktop only, no client selected) ──
  if (!selectedClient) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: BG_BASE,
      }}>
        <MessageSquare size={48} color={TEXT_DIM} strokeWidth={1.2} />
        <span style={{ fontFamily: FONT_BODY, fontSize: '0.95rem', color: TEXT_MUTED }}>
          Sélectionnez une conversation
        </span>
      </div>
    )
  }

  // ── Active conversation ──
  return (
    <div
      className={isMobile ? 'chat-fullscreen' : undefined}
      style={isMobile ? undefined : {
        display: 'flex', flexDirection: 'column',
        height: '100%', maxHeight: '100%', background: BG_BASE,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        paddingTop: isMobile ? 'max(14px, env(safe-area-inset-top, 14px))' : '14px',
        background: BG_CARD, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <button
          onClick={() => setSelectedClient(null)}
          style={{
            display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: TEXT_MUTED, padding: '6px', minWidth: 44, minHeight: 44,
          }}
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

      {/* Messages scroll area */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: isMobile ? '100px' : '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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

      {/* Image preview */}
      {previewUrl && (
        <div style={{ ...(isMobile ? { position: 'fixed' as const, bottom: 120, left: 16, right: 16 } : { margin: '0 16px 8px' }), background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 202 }}>
          <img src={previewUrl} alt="Preview" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }} />
          <button onClick={clearFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 4 }}><X size={16} /></button>
        </div>
      )}

      {/* Input bar */}
      <div style={{ ...(isMobile ? { position: 'fixed' as const, bottom: 60, left: 0, right: 0, paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' } : { position: 'relative' as const }), background: BG_CARD, borderTop: `1px solid ${BORDER}`, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', zIndex: 201, flexShrink: 0 }}>
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
  )
}
