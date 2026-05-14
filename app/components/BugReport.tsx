'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Send, Bug, Lightbulb, HelpCircle, MessageSquare, CheckCircle2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_RULE, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY } from '../../lib/design-tokens'
import { useMyFeedback, type MyFeedbackReport } from '@/app/hooks/useMyFeedback'
import { useMyFeedbackBadge } from '@/app/hooks/useMyFeedbackBadge'

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

type Mode = 'submit' | 'history'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function statusLabel(status: string | null): string {
  if (!status || status === 'nouveau') return 'Recu'
  if (status === 'en_cours') return 'En traitement'
  if (status === 'resolu') return 'Resolu'
  if (status === 'rejete') return 'Clos'
  return status
}

function statusColor(status: string | null): string {
  if (!status || status === 'nouveau') return '#fb7185'
  if (status === 'en_cours') return '#fbbf24'
  if (status === 'resolu') return '#34d399'
  return '#71717a'
}

function ReportCard({ report }: { report: MyFeedbackReport }) {
  const hasReply = !!report.admin_reply
  const isUnread = hasReply && report.read_by_user === false

  return (
    <div style={{
      background: isUnread ? 'rgba(212, 168, 67, 0.04)' : BG_BASE,
      border: `1px solid ${isUnread ? 'rgba(212, 168, 67, 0.25)' : BORDER}`,
      borderRadius: 14, padding: 14, position: 'relative',
    }}>
      {isUnread && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 8, height: 8, borderRadius: '50%',
          background: GOLD, boxShadow: '0 0 12px rgba(212, 168, 67, 0.6)',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: '0.7rem', color: TEXT_DIM }}>
        {report.type === 'bug' ? <Bug size={12} color="#fb7185" /> : report.type === 'amelioration' ? <Lightbulb size={12} color={GOLD} /> : <HelpCircle size={12} color={TEXT_DIM} />}
        <span>{report.type === 'bug' ? 'Bug' : report.type === 'amelioration' ? 'Suggestion' : 'Autre'}</span>
        <span>·</span>
        <span>{formatDate(report.created_at)}</span>
        <span style={{ marginLeft: 'auto', color: statusColor(report.status) }}>
          {statusLabel(report.status)}
        </span>
      </div>

      {/* Titre */}
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 6, fontFamily: FONT_BODY }}>
        {report.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: '0.8rem', color: TEXT_MUTED, lineHeight: 1.5, marginBottom: hasReply ? 10 : 0, whiteSpace: 'pre-wrap' }}>
        {report.description}
      </div>

      {/* Reponse admin */}
      {hasReply && (
        <div style={{
          background: 'rgba(212, 168, 67, 0.06)',
          border: '1px solid rgba(212, 168, 67, 0.2)',
          borderRadius: 10, padding: '10px 12px', marginTop: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: '0.7rem', color: GOLD, fontWeight: 600 }}>
            <CheckCircle2 size={12} />
            Reponse de l'equipe MoovX
          </div>
          <div style={{ fontSize: '0.8rem', color: TEXT_PRIMARY, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {report.admin_reply}
          </div>
          {report.replied_at && (
            <div style={{ fontSize: '0.6rem', color: TEXT_DIM, marginTop: 6 }}>
              {formatDate(report.replied_at)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryView() {
  const { reports, loading, error } = useMyFeedback(true)

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: TEXT_MUTED, fontSize: 14, fontFamily: FONT_BODY }}>
      Chargement...
    </div>
  )

  if (error) return (
    <div style={{ color: '#fb7185', fontSize: 14, padding: 16, fontFamily: FONT_BODY }}>{error}</div>
  )

  if (reports.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
      <MessageSquare size={28} style={{ color: TEXT_DIM, margin: '0 auto 10px' }} />
      <div style={{ color: TEXT_PRIMARY, fontSize: 14, marginBottom: 4, fontFamily: FONT_BODY }}>
        Aucun rapport pour l'instant
      </div>
      <div style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: FONT_BODY }}>
        Utilisez l'onglet "Nouveau rapport" pour nous ecrire.
      </div>
    </div>
  )

  return (
    <div style={{ maxHeight: '55vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {reports.map(r => <ReportCard key={r.id} report={r} />)}
    </div>
  )
}

export default function BugReport({ session, profile }: BugReportProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('submit')
  const [type, setType] = useState('bug')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [sending, setSending] = useState(false)
  const unreadCount = useMyFeedbackBadge()

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
    setTitle(''); setDesc(''); setType('bug')
  }

  if (!session) return null

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 0', background: 'transparent', border: 'none',
    borderBottom: `2px solid ${active ? GOLD : 'transparent'}`,
    color: active ? GOLD : TEXT_DIM,
    fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase',
    fontWeight: 700, fontFamily: FONT_ALT, cursor: 'pointer',
    transition: 'all 0.2s',
  })

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
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: GOLD, color: '#0D0B08',
            fontSize: '10px', fontWeight: 700, fontFamily: FONT_ALT,
            minWidth: 18, height: 18, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 5px',
            boxShadow: '0 0 12px rgba(212, 168, 67, 0.5)',
          }}>
            {unreadCount}
          </span>
        )}
      </button>
      <style>{`@media(min-width:768px){.bug-btn-fix{bottom:24px!important}}`}</style>

      {/* Modal */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, padding: '0 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: BG_CARD, zIndex: 2, paddingTop: 16 }}>
              <button type="button" onClick={() => setMode('submit')} style={tabStyle(mode === 'submit')}>
                Nouveau rapport
              </button>
              <button type="button" onClick={() => setMode('history')} style={tabStyle(mode === 'history')}>
                Mes rapports
                {unreadCount > 0 && (
                  <span style={{
                    marginLeft: 6, background: GOLD, color: '#0D0B08',
                    fontSize: '0.6rem', padding: '1px 6px', borderRadius: 8, fontWeight: 700,
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0' }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', letterSpacing: '3px', color: TEXT_PRIMARY, margin: 0 }}>
                {mode === 'submit' ? 'SIGNALER' : 'MES RAPPORTS'}
              </h3>
              <button onClick={() => setOpen(false)} style={{ width: 32, height: 32, background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color={TEXT_MUTED} />
              </button>
            </div>

            {/* Submit form */}
            {mode === 'submit' && (
              <>
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
              </>
            )}

            {/* History view */}
            {mode === 'history' && <HistoryView />}
          </div>
        </div>
      )}
    </>
  )
}
