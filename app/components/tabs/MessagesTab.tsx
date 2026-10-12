'use client'
import styles from '../client/SupportPages.module.css'
import { useRef, useEffect, useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MessageCircle, Send, Check, CheckCheck, ImageIcon, X, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD,
  TEXT_PRIMARY, TEXT_MUTED, FONT_ALT, FONT_BODY,
} from '../../../lib/app-design-tokens'
import { useMessageImageUpload } from '../../hooks/useMessageImageUpload'
import MessageImage from '../MessageImage'

interface MessagesTabProps {
  session: any
  coachId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  messages: any[]
  msgInput: string
  setMsgInput: (v: string) => void
  sendMessage: (imageUrl?: string | null) => Promise<void>
  msgEndRef: React.RefObject<HTMLDivElement | null>
  isCoachManaged?: boolean
  onBack?: () => void
}

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return "Aujourd'hui"
  if (isYesterday(d)) return 'Hier'
  return format(d, 'd MMMM yyyy', { locale: fr })
}

export default function MessagesTab({
  session, coachId, supabase, messages, msgInput, setMsgInput, sendMessage, msgEndRef, isCoachManaged = true, onBack,
}: MessagesTabProps) {
  const tc = useTranslations('common')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { uploadImage, uploading } = useMessageImageUpload(supabase)

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    e.target.value = ''
  }
  const clearFile = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setSelectedFile(null); setPreviewUrl(null) }

  const handleSend = async () => {
    if (uploading) return
    let imageUrl: string | null = null
    if (selectedFile) {
      imageUrl = await uploadImage(selectedFile)
      clearFile()
    }
    if (!msgInput.trim() && !imageUrl) return
    await sendMessage(imageUrl)
  }
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px'
    }
  }, [msgInput])

  // Scroll to bottom when messages load or change (with image load awareness)
  useEffect(() => {
    if (messages.length === 0) return
    const isInitial = prevLengthRef.current === 0
    prevLengthRef.current = messages.length
    const scrollToBottom = () => {
      bottomRef.current?.scrollIntoView({ behavior: isInitial ? 'instant' as ScrollBehavior : 'smooth' })
    }
    const t1 = setTimeout(scrollToBottom, 0)
    const t2 = setTimeout(() => {
      const container = bottomRef.current?.parentElement
      if (!container) return
      const images = container.querySelectorAll('img')
      let loaded = 0
      const total = images.length
      if (total === 0) return
      const onLoad = () => { loaded++; if (loaded === total) scrollToBottom() }
      images.forEach(img => {
        if (img.complete) loaded++
        else { img.addEventListener('load', onLoad, { once: true }); img.addEventListener('error', onLoad, { once: true }) }
      })
      if (loaded === total) scrollToBottom()
    }, 100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [messages.length])

  return (
    <div className={styles.page}>
      {/* Back button */}
      {onBack && (
        <button onClick={onBack} aria-label={tc('backToAccount')} className={styles.back}>
          <ArrowLeft size={18} />
          <span style={{ fontFamily: FONT_ALT, fontSize: 14, fontWeight: 600 }}>{tc('navAccount')}</span>
        </button>
      )}
      <header className={styles.header}>
        <h1 className={styles.title}>{isCoachManaged ? 'Mon coach' : 'Support'}<span>.</span></h1>
        <p className={styles.subtitle}>{isCoachManaged ? 'Tes échanges avec ton coach.' : 'Tes échanges avec l’équipe MoovX.'}</p>
      </header>

      {!coachId ? (
        <div className={styles.empty}>
          <MessageCircle size={40} color={TEXT_MUTED} />
          <p style={{ color: TEXT_MUTED, fontSize: '0.9rem', margin: 0, fontFamily: FONT_BODY, fontWeight: 300 }}>Aucun coach assigné pour l'instant.</p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className={styles.conversation}>
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
                      <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', flexShrink: 0, fontFamily: FONT_ALT }}>{dateLabel(msg.created_at)}</span>
                      <div style={{ flex: 1, height: 1, background: BORDER }} />
                    </div>
                  )}
                  {/* Bubble */}
                  <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
                    <div style={{
                      maxWidth: '85%', minWidth: 0, overflowWrap: 'anywhere',
                      background: isMine ? GOLD : BG_CARD_2,
                      color: isMine ? '#0D0B08' : TEXT_PRIMARY,
                      borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: msg.image_url ? 4 : '10px 14px',
                      border: isMine ? 'none' : `1px solid ${BORDER}`,
                      overflow: 'hidden',
                    }}>
                      {msg.image_url && <MessageImage supabase={supabase} path={msg.image_url} />}
                      {msg.content && <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', fontFamily: FONT_BODY, fontWeight: 400, padding: msg.image_url ? '4px 10px 0' : 0 }}>{msg.content}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: 4, marginTop: 3, padding: msg.image_url ? '0 10px 4px' : 0 }}>
                        <span style={{ fontSize: 12, opacity: 0.8, fontFamily: FONT_BODY }}>{format(new Date(msg.created_at), 'HH:mm')}</span>
                        {isMine && (msg.read ? <CheckCheck size={12} style={{ opacity: 0.8, color: '#17140c' }} /> : <Check size={12} style={{ opacity: 0.4 }} />)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
            <div ref={msgEndRef} />
          </div>

          {/* Image preview */}
          {previewUrl && (
            <div style={{ padding: '8px 14px 0', background: BG_BASE, borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={previewUrl} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }} />
              <button onClick={clearFile} aria-label="Retirer la photo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 4 }}><X size={16} /></button>
            </div>
          )}

          {/* Input */}
          <div style={{ flexShrink: 0, padding: '12px 14px', background: BG_BASE, borderTop: previewUrl ? 'none' : `1px solid ${BORDER}`, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileSelected} />
            <button onClick={() => fileInputRef.current?.click()} aria-label="Joindre une photo" style={{ width: 44, height: 44, borderRadius: '50%', background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ImageIcon size={16} color={TEXT_MUTED} />
            </button>
            <textarea
              aria-label="Écrire un message"
              ref={inputRef}
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Écrire un message..."
              rows={1}
              style={{ flex: 1, minWidth: 0, minHeight: 44, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '10px 16px', color: TEXT_PRIMARY, fontSize: 16, resize: 'none', maxHeight: 100, lineHeight: 1.4, fontFamily: FONT_BODY, fontWeight: 400 }}
            />
            <button
              onClick={handleSend}
              aria-label="Envoyer le message"
              disabled={!msgInput.trim() && !selectedFile}
              style={{ width: 44, height: 44, borderRadius: '50%', background: (msgInput.trim() || selectedFile) ? GOLD : BORDER, border: 'none', cursor: (msgInput.trim() || selectedFile) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 200ms' }}
            >
              {uploading ? <div style={{ width: 16, height: 16, border: '2px solid #0D0B08', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Send size={16} color={(msgInput.trim() || selectedFile) ? '#0D0B08' : TEXT_MUTED} />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
