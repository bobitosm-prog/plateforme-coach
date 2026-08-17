'use client'
import { MessageSquare, Bug, Lightbulb, AlertCircle } from 'lucide-react'
import { PageHeader } from '../_components/PageHeader'
import { KpiCard } from '../_components/KpiCard'
import { FeedbackList } from './_components/FeedbackList'
import { useFeedback } from './_hooks/useFeedback'

export default function AdminFeedbackPage() {
  const {
    reports, stats, loading, error,
    search, setSearch,
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    updateReportLocally,
  } = useFeedback()

  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Feedback"
        description="Rapports et suggestions envoyes par les utilisateurs"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total"
          value={stats ? String(stats.total) : '—'}
          subtext="Tous statuts confondus"
          icon={MessageSquare}
          loading={!stats}
          accent="zinc"
        />
        <KpiCard
          label="A traiter"
          value={stats ? String(stats.unresolved) : '—'}
          subtext="Nouveaux + en cours"
          icon={AlertCircle}
          loading={!stats}
          accent={stats && stats.unresolved > 0 ? 'rose' : 'emerald'}
        />
        <KpiCard
          label="Bugs"
          value={stats ? String(stats.by_type?.bug || 0) : '—'}
          icon={Bug}
          loading={!stats}
          accent="rose"
        />
        <KpiCard
          label="Ameliorations"
          value={stats ? String(stats.by_type?.amelioration || 0) : '—'}
          icon={Lightbulb}
          loading={!stats}
          accent="gold"
        />
      </div>

      <FeedbackList
        reports={reports}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onReportUpdated={updateReportLocally}
      />
    </div>
  )
}
