'use client'
import styles from './SupportPages.module.css'
import { colors, cardStyle } from '@/lib/app-design-tokens'
import { ArrowLeft, MessageSquare, AlertCircle, Lightbulb, MoreHorizontal, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useMyFeedback, type MyFeedbackReport } from '@/app/hooks/useMyFeedback'

interface Props {
  onBack: () => void
}

function typeIcon(type: string) {
  if (type === 'bug') return <AlertCircle size={14} style={{ color: '#fb7185' }} />
  if (type === 'amelioration') return <Lightbulb size={14} style={{ color: '#fbbf24' }} />
  return <MoreHorizontal size={14} style={{ color: colors.textMuted }} />
}

function typeLabel(type: string) {
  if (type === 'bug') return 'Bug'
  if (type === 'amelioration') return 'Suggestion'
  return 'Autre'
}

function statusLabel(status: string | null): string {
  if (!status || status === 'nouveau') return 'Reçu'
  if (status === 'en_cours') return 'En traitement'
  if (status === 'resolu') return 'Résolu'
  if (status === 'rejete') return 'Clos'
  return status
}

function statusColor(status: string | null): string {
  if (!status || status === 'nouveau') return '#fb7185'
  if (status === 'en_cours') return '#fbbf24'
  if (status === 'resolu') return '#34d399'
  return '#71717a'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function ReportCard({ report }: { report: MyFeedbackReport }) {
  const hasReply = !!report.admin_reply
  const isUnread = hasReply && report.read_by_user === false

  return (
    <article className={styles.report}
      style={{
        ...cardStyle,
        background: colors.surfaceCard,
        border: `1px solid ${isUnread ? colors.gold : colors.goldBorder}`,
        borderRadius: 20,
        padding: '16px',
        position: 'relative',
      }}
    >
      {isUnread && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 8, height: 8, borderRadius: '50%',
          background: colors.gold,
          boxShadow: '0 0 12px rgba(212, 168, 67, 0.6)',
        }} />
      )}

      {/* Header */}
      <div className={`flex items-center gap-2 mb-2 text-[13px] ${styles.reportMeta}`} style={{ color: colors.textMuted }}>
        {typeIcon(report.type)}
        <span>{typeLabel(report.type)}</span>
        <span>·</span>
        <span>{formatDate(report.created_at)}</span>
        <span className="ml-auto" style={{ color: statusColor(report.status) }}>
          {statusLabel(report.status)}
        </span>
      </div>

      {/* Titre */}
      <div className="text-base font-semibold mb-2" style={{ color: colors.text }}>
        {report.title}
      </div>

      {/* Message original */}
      <div
        className="text-sm whitespace-pre-wrap mb-3"
        style={{ color: colors.textMuted, lineHeight: 1.55 }}
      >
        {report.description}
      </div>

      {/* Page URL */}
      {report.page_url && (
        <a
          href={report.page_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] inline-flex items-center gap-1 mb-3"
          style={{ color: colors.gold }}
        >
          {report.page_url.replace(/^https?:\/\//, '').slice(0, 50)}
          <ExternalLink size={10} />
        </a>
      )}

      {/* Reponse admin */}
      {hasReply && (
        <div
          style={{
            marginTop: '12px',
            background: 'rgba(212, 168, 67, 0.06)',
            border: '1px solid rgba(212, 168, 67, 0.2)',
            borderRadius: '10px',
            padding: '12px 14px',
          }}
        >
          <div className="flex items-center gap-1.5 mb-2 text-[13px]" style={{ color: colors.gold }}>
            <CheckCircle2 size={12} />
            <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>
              Réponse de l’équipe MoovX
            </span>
          </div>
          <div
            className="text-sm whitespace-pre-wrap"
            style={{ color: colors.text, lineHeight: 1.6 }}
          >
            {report.admin_reply}
          </div>
          {report.replied_at && (
            <div className="text-[13px] mt-2" style={{ color: colors.textMuted }}>
              {formatDate(report.replied_at)}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function FeedbackTab({ onBack }: Props) {
  const { reports, loading, error, refetch } = useMyFeedback(true)

  return (
    <div className={styles.page}>
        <button type="button" onClick={onBack} className={styles.back} aria-label="Retour au compte"><ArrowLeft size={20} /> Compte</button>
        <header className={styles.header}>
          <h1 className={styles.title}>Mes rapports<span>.</span></h1>
          <p className={styles.subtitle}>Suggestions, bugs et réponses de l’équipe.</p>
        </header>

        {/* Body */}
        {loading && (
          <div role="status" className={styles.empty} style={{ color: colors.textMuted }}>
            Chargement...
          </div>
        )}

        {!loading && error && (
          <div role="alert"
            style={{
              background: 'rgba(251, 113, 133, 0.06)',
              border: '1px solid rgba(251, 113, 133, 0.2)',
              borderRadius: 20,
              padding: 18,
              color: '#fb7185',
              fontSize: '14px',
            }}
          >
            {error}
            <button onClick={refetch} className="ml-2 underline">Réessayer</button>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className={styles.empty}>
            <MessageSquare size={32} style={{ color: colors.textMuted, margin: '0 auto 12px' }} />
            <div style={{ color: colors.text, fontSize: '15px', marginBottom: '6px' }}>
              Aucun rapport pour l'instant
            </div>
            <div style={{ color: colors.textMuted, fontSize: '13px' }}>
              Depuis Compte, ouvre « Signaler un problème » pour nous écrire.
            </div>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className={styles.stack}>
            {reports.map(r => <ReportCard key={r.id} report={r} />)}
          </div>
        )}

    </div>
  )
}
