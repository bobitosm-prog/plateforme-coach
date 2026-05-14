'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Send, CheckCircle2 } from 'lucide-react'
import { Modal } from '../../_components/Modal'
import { adminFetch } from '@/lib/admin/api-client'
import { formatDateTime, formatRelative } from '../../_components/formatters'
import type { AdminBugReportRow } from '@/lib/admin/types'

interface Props {
  report: AdminBugReportRow | null
  onClose: () => void
  onUpdated: (id: string, patch: Partial<AdminBugReportRow>) => void
}

const STATUS_OPTIONS = [
  { value: 'nouveau',  label: 'Nouveau' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'resolu',   label: 'Resolu' },
  { value: 'rejete',   label: 'Ignore' },
] as const

const PRIORITY_OPTIONS = [
  { value: '',         label: 'Aucune' },
  { value: 'basse',    label: 'Basse' },
  { value: 'normal',   label: 'Normale' },
  { value: 'haute',    label: 'Haute' },
  { value: 'critique', label: 'Critique' },
] as const

function normalizePriority(p: string | null | undefined): string {
  return p || ''
}

export function FeedbackDetailDialog({ report, onClose, onUpdated }: Props) {
  // Meta editing
  const [status, setStatus] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState<string>('')
  const [savingMeta, setSavingMeta] = useState(false)

  // Reply
  const [replyText, setReplyText] = useState('')
  const [sendEmail, setSendEmailFlag] = useState(true)
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
    if (report) {
      setStatus(report.status || 'nouveau')
      setPriority(normalizePriority(report.priority))
      setAdminNotes(report.admin_notes || '')
      setReplyText('')
    }
  }, [report])

  if (!report) return null

  const handleSaveMeta = async () => {
    setSavingMeta(true)
    try {
      const res = await adminFetch<{ report: AdminBugReportRow }>(
        `/api/admin/bug-reports/${report.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status,
            priority: priority || null,
            admin_notes: adminNotes.trim() || null,
          })
        }
      )
      onUpdated(report.id, {
        status: res.report.status,
        priority: res.report.priority,
        admin_notes: res.report.admin_notes,
        updated_at: res.report.updated_at,
      })
      toast.success('Metadonnees mises a jour')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Echec', { id: 'feedback-save' })
    } finally {
      setSavingMeta(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await adminFetch<{
        report: Partial<AdminBugReportRow>
        email: { method: string; error?: string } | null
      }>(
        `/api/admin/bug-reports/${report.id}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({
            reply: replyText.trim(),
            send_email: sendEmail,
          })
        }
      )

      onUpdated(report.id, {
        admin_reply: replyText.trim(),
        replied_at: new Date().toISOString(),
        replied_by: report.replied_by,
        read_by_user: false,
        status: res.report.status || 'en_cours',
        updated_at: new Date().toISOString(),
      })

      setReplyText('')
      setStatus(res.report.status || 'en_cours')

      if (res.email?.method === 'sent') {
        toast.success(`Reponse envoyee par email a ${report.user_email}`)
      } else if (res.email?.method === 'skipped') {
        toast.warning('Reponse sauvegardee (SMTP non configure, email non envoye)')
      } else if (res.email?.method === 'error') {
        toast.error(`Reponse sauvegardee mais email echoue : ${res.email.error}`)
      } else {
        toast.success('Reponse sauvegardee')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Echec envoi', { id: 'feedback-reply' })
    } finally {
      setSendingReply(false)
    }
  }

  const hasReply = !!report.admin_reply

  return (
    <Modal
      open={!!report}
      onClose={onClose}
      title={report.title}
      description={`${report.type} · ${formatRelative(report.created_at)}`}
      maxWidth="lg"
    >
      <div className="space-y-5 mb-6">
        {/* Auteur */}
        <div className="admin-card-inner" style={{ padding: '14px 16px' }}>
          <div className="admin-label mb-1.5">Auteur</div>
          <div className="text-sm" style={{ color: '#e5e2e1' }}>
            {report.user_email || '—'}
            {report.user_role && (
              <span className="ml-2 text-xs" style={{ color: '#99907e' }}>
                · {report.user_role}
              </span>
            )}
          </div>
          {report.page_url && (
            <div className="mt-2">
              <div className="admin-label mb-1">Page</div>
              <a
                href={report.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs inline-flex items-center gap-1 break-all"
                style={{ color: '#d4a843' }}
              >
                {report.page_url}
                <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>

        {/* Thread original */}
        <div>
          <div className="admin-label mb-2">Message original</div>
          <div
            className="text-sm whitespace-pre-wrap"
            style={{
              color: '#d0c5b2',
              background: '#0e0e0e',
              border: '1px solid rgba(201, 168, 76, 0.1)',
              borderRadius: '12px',
              padding: '14px 16px',
              maxHeight: '220px',
              overflowY: 'auto',
              lineHeight: 1.6,
            }}
          >
            {report.description}
          </div>
          <div className="text-[10px] mt-1.5 text-right" style={{ color: '#5a5246' }}>
            {formatDateTime(report.created_at)}
          </div>
        </div>

        {/* Screenshot */}
        {report.screenshot_url && (
          <div>
            <div className="admin-label mb-2">Capture d'ecran</div>
            <a href={report.screenshot_url} target="_blank" rel="noopener noreferrer">
              <img
                src={report.screenshot_url}
                alt="Screenshot"
                style={{
                  maxWidth: '100%',
                  maxHeight: '220px',
                  borderRadius: '12px',
                  border: '1px solid rgba(201, 168, 76, 0.15)',
                }}
              />
            </a>
          </div>
        )}

        {/* Reply existant */}
        {hasReply && (
          <div>
            <div className="admin-label mb-2 flex items-center gap-2">
              <CheckCircle2 size={11} style={{ color: '#34d399' }} />
              Votre reponse
            </div>
            <div
              className="text-sm whitespace-pre-wrap"
              style={{
                color: '#e5e2e1',
                background: 'rgba(212, 168, 67, 0.04)',
                border: '1px solid rgba(212, 168, 67, 0.25)',
                borderRadius: '12px',
                padding: '14px 16px',
                lineHeight: 1.6,
              }}
            >
              {report.admin_reply}
            </div>
            <div className="text-[10px] mt-1.5 flex items-center justify-between" style={{ color: '#5a5246' }}>
              <span>par {report.replied_by}</span>
              <span>
                {report.replied_at ? formatDateTime(report.replied_at) : ''}
                {report.read_by_user === false && (
                  <span className="ml-2" style={{ color: '#fb7185' }}>· Non lue</span>
                )}
                {report.read_by_user === true && (
                  <span className="ml-2" style={{ color: '#34d399' }}>· Lue</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Form reply */}
        <div>
          <div className="admin-label mb-2">
            {hasReply ? 'Repondre a nouveau' : 'Envoyer une reponse'}
          </div>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Bonjour, merci pour votre retour. Voici notre reponse..."
            rows={5}
            maxLength={5000}
            className="admin-input"
            style={{ resize: 'vertical', minHeight: '110px', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
          />
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#d0c5b2' }}>
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmailFlag(e.target.checked)}
                style={{ accentColor: '#d4a843' }}
              />
              Envoyer aussi par email a {report.user_email}
            </label>
            <div className="text-[10px] tabular-nums" style={{ color: '#5a5246' }}>
              {replyText.length} / 5000
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={handleSendReply}
              disabled={!replyText.trim() || sendingReply}
              className="admin-btn-gold"
              style={{ gap: '8px' }}
            >
              <Send size={13} />
              {sendingReply ? 'Envoi...' : 'Envoyer la reponse'}
            </button>
          </div>
        </div>

        {/* Meta editing */}
        <details>
          <summary className="admin-label cursor-pointer" style={{ marginBottom: '0' }}>
            ▸ Statut & notes internes
          </summary>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="admin-label block mb-1.5">Statut</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="admin-select"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-label block mb-1.5">Priorite</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="admin-select"
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="admin-label block mb-1.5">Notes admin (privees)</label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Notes internes, contexte technique, lien JIRA..."
                rows={3}
                maxLength={2000}
                className="admin-input"
                style={{ resize: 'vertical', minHeight: '70px', fontFamily: 'var(--font-body)' }}
              />
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveMeta}
                disabled={savingMeta}
                className="admin-btn-ghost"
              >
                {savingMeta ? 'Enregistrement...' : 'Enregistrer les metadonnees'}
              </button>
            </div>
          </div>
        </details>
      </div>

      <div className="flex items-center justify-end pt-2 border-t" style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
        <button
          type="button"
          onClick={onClose}
          className="admin-btn-text"
        >
          Fermer
        </button>
      </div>
    </Modal>
  )
}
