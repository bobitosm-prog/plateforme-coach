'use client'
import { PageHeader } from '../_components/PageHeader'
import { LogsTable } from './_components/LogsTable'
import { useLogs } from './_hooks/useLogs'

export default function AdminLogsPage() {
  const { logs, loading, error, search, setSearch, actionFilter, setActionFilter } = useLogs()

  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Logs"
        description="Journal des actions administrateur (audit trail)"
      />
      <LogsTable
        logs={logs}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        actionFilter={actionFilter}
        onActionFilterChange={setActionFilter}
      />
    </div>
  )
}
