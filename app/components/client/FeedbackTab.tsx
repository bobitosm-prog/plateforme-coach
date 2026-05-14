'use client'
import { ArrowLeft, MessageSquare, AlertCircle, Lightbulb, MoreHorizontal, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useMyFeedback, type MyFeedbackReport } from '@/app/hooks/useMyFeedback'

interface Props {
  onBack: () => void
}

function typeIcon(type: string) {
  if (type === 'bug') return <AlertCircle size={14} style={{ color: '#fb7185' }} />
  if (type === 'amelioration') return <Lightbulb size={14} style={{ color: '#fbbf24' }} />
  return <MoreHorizontal size={14} style={{ color: '#99907e' }} />
}

function typeLabel(type: string) {
  if (type === 'bug') return 'Bug'
  if (type === 'amelioration') return 'Suggestion'
  return 'Autre'
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function ReportCard({ report }: { report: MyFeedbackReport }) {
  const hasReply = !!report.admin_reply
  const isUnread = hasReply && report.read_by_user === false

  return (
    <div
      style={{
        background: isUnread ? 'rgba(212, 168, 67, 0.04)' : '#141414',
        border: `1px solid ${isUnread ? 'rgba(212, 168, 67, 0.25)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: '14px',
        padding: '16px',
        position: 'relative',
      }}
    >
      {isUnread && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 8, height: 8, borderRadius: '50%',
          background: '#D4A843',
          boxShadow: '0 0 12px rgba(212, 168, 67, 0.6)',
        }} />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: '#99907e' }}>
        {typeIcon(report.type)}
        <span>{typeLabel(report.type)}</span>
        <span>·</span>
        <span>{formatDate(report.created_at)}</span>
        <span className="ml-auto" style={{ color: statusColor(report.status) }}>
          {statusLabel(report.status)}
        </span>
      </div>

      {/* Titre */}
      <div className="text-base font-semibold mb-2" style={{ color: '#e5e2e1' }}>
        {report.title}
      </div>

      {/* Message original */}
      <div
        className="text-sm whitespace-pre-wrap mb-3"
        style={{ color: '#99907e', lineHeight: 1.55 }}
      >
        {report.description}
      </div>

      {/* Page URL */}
      {report.page_url && (
        <a
          href={report.page_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs inline-flex items-center gap-1 mb-3"
          style={{ color: '#D4A843' }}
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
          <div className="flex items-center gap-1.5 mb-2 text-xs" style={{ color: '#D4A843' }}>
            <CheckCircle2 size={12} />
            <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>
              Reponse de l'equipe MoovX
            </span>
          </div>
          <div
            className="text-sm whitespace-pre-wrap"
            style={{ color: '#e5e2e1', lineHeight: 1.6 }}
          >
            {report.admin_reply}
          </div>
          {report.replied_at && (
            <div className="text-[10px] mt-2" style={{ color: '#5a5246' }}>
              {formatDate(report.replied_at)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FeedbackTab({ onBack }: Props) {
  const { reports, loading, error, refetch } = useMyFeedback(true)

  return (
    <div style={{ minHeight: '100vh', background: '#0D0B08', color: '#e5e2e1' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 16px 100px' }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#e5e2e1',
              cursor: 'pointer',
            }}
            aria-label="Retour"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#e5e2e1' }}>
              Mes rapports
            </h1>
            <div className="text-xs" style={{ color: '#99907e' }}>
              Suggestions, bugs et reponses de l'equipe
            </div>
          </div>
        </div>

        {/* Body */}
        {loading && (
          <div className="text-center text-sm py-12" style={{ color: '#99907e' }}>
            Chargement...
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              background: 'rgba(251, 113, 133, 0.06)',
              border: '1px solid rgba(251, 113, 133, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              color: '#fb7185',
              fontSize: '14px',
            }}
          >
            {error}
            <button onClick={refetch} className="ml-2 underline">Reessayer</button>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '14px',
            }}
          >
            <MessageSquare size={32} style={{ color: '#5a5246', margin: '0 auto 12px' }} />
            <div style={{ color: '#e5e2e1', fontSize: '15px', marginBottom: '6px' }}>
              Aucun rapport pour l'instant
            </div>
            <div style={{ color: '#99907e', fontSize: '13px' }}>
              Utilisez le bouton en bas a droite pour nous ecrire.
            </div>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="space-y-3">
            {reports.map(r => <ReportCard key={r.id} report={r} />)}
          </div>
        )}

      </div>
    </div>
  )
}
