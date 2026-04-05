'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Send, Bug, Lightbulb, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_RULE, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../lib/design-tokens'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface BugReportProps {
  session: any
  profile: any
}

const TYPES = [
  { id: 'bug', label: 'Bug', icon: Bug, color: RED },
  { id: 'amelioration', label: 'Amelioration', icon: Lightbulb, color: GOLD },
  { id: 'autre', label: 'Autre', icon: HelpCircle, color: TEXT_MUTED },
]

export default function BugReport({ session, profile }: BugReportProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('bug')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!title.trim() || !desc.trim()) return
    setSending(true)
    const { error } = await supabase.from('bug_reports').insert({
      user_id: session.user.id,
      user_email: session.user.email,
      user_role: profile?.role || 'client',
      type,
      title: title.trim().slice(0, 100),
      description: desc.trim().slice(0, 1000),
      page_url: window.location.href,
    })
    setSending(false)
    if (error) { toast.error('Erreur lors de l\'envoi'); return }
    toast.success('Merci ! Ton rapport a ete envoye.')
    setOpen(false); setTitle(''); setDesc(''); setType('bug')
  }

  if (!session) return null

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: 16,
        width: 44, height: 44, borderRadius: 12, background: BG_CARD, border: `1px solid ${GOLD_RULE}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 900, boxShadow: '0 4px 16px rgba(0,0,0,0.4)', transition: 'transform 0.2s',
      }}>
        <span style={{ fontSize: 18 }}>💬</span>
      </button>
      <style>{`@media(min-width:768px){.bug-btn-fix{bottom:24px!important}}`}</style>

      {/* Modal */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '2px 2px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', letterSpacing: '3px', color: TEXT_PRIMARY, margin: 0 }}>SIGNALER</h3>
              <button onClick={() => setOpen(false)} style={{ width: 32, height: 32, background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color={TEXT_MUTED} />
              </button>
            </div>

            {/* Type */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {TYPES.map(t => {
                const active = type === t.id
                const Icon = t.icon
                return (
                  <button key={t.id} onClick={() => setType(t.id)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                    background: active ? `${t.color}15` : BG_BASE,
                    border: `1px solid ${active ? t.color + '40' : BORDER}`,
                    color: active ? t.color : TEXT_MUTED,
                    fontSize: '0.75rem', fontWeight: 800, fontFamily: FONT_ALT,
                    letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s',
                  }}>
                    <Icon size={14} /> {t.label}
                  </button>
                )
              })}
            </div>

            {/* Title */}
            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 100))} placeholder="Titre (obligatoire)"
              style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '13px 16px', color: TEXT_PRIMARY, fontSize: '0.9rem', outline: 'none', marginBottom: 10, transition: 'border-color 0.3s', fontFamily: FONT_BODY }}
              onFocus={e => e.target.style.borderColor = GOLD} onBlur={e => e.target.style.borderColor = BORDER} />
            <div style={{ textAlign: 'right', fontSize: '0.6rem', color: TEXT_DIM, fontFamily: FONT_BODY, marginBottom: 8, marginTop: -6 }}>{title.length}/100</div>

            {/* Description */}
            <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0, 1000))} placeholder="Decris le probleme ou l'idee en detail..."
              rows={5} style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '13px 16px', color: TEXT_PRIMARY, fontSize: '0.85rem', outline: 'none', resize: 'vertical', minHeight: 100, fontFamily: FONT_BODY, transition: 'border-color 0.3s', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = GOLD} onBlur={e => e.target.style.borderColor = BORDER} />
            <div style={{ textAlign: 'right', fontSize: '0.6rem', color: TEXT_DIM, fontFamily: FONT_BODY, marginBottom: 16, marginTop: 4 }}>{desc.length}/1000</div>

            {/* Page captured */}
            <div style={{ fontSize: '0.68rem', color: TEXT_DIM, fontFamily: FONT_BODY, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: TEXT_MUTED }}>Page :</span> {typeof window !== 'undefined' ? window.location.pathname : ''}
            </div>

            {/* Send */}
            <button onClick={handleSend} disabled={!title.trim() || !desc.trim() || sending}
              style={{
                width: '100%', padding: '15px', borderRadius: 12, border: 'none', cursor: (title.trim() && desc.trim() && !sending) ? 'pointer' : 'default',
                background: (title.trim() && desc.trim()) ? GOLD : BG_CARD_2,
                color: (title.trim() && desc.trim()) ? '#0D0B08' : TEXT_MUTED,
                fontFamily: FONT_ALT, fontSize: '0.95rem', fontWeight: 800,
                letterSpacing: '1px', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                clipPath: (title.trim() && desc.trim()) ? 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' : 'none',
                transition: 'all 0.2s',
              }}>
              <Send size={16} /> {sending ? 'Envoi...' : 'Envoyer le rapport'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
