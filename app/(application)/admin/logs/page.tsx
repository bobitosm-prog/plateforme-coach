'use client'
import { PageHeader } from '../_components/PageHeader'
import { LogsTable } from './_components/LogsTable'
import { useLogs } from './_hooks/useLogs'
import { WeeklyGenerationMonitor } from './_components/WeeklyGenerationMonitor'

export default function AdminLogsPage() {
  const { logs, loading, error, search, setSearch, levelFilter, setLevelFilter, actionFilter, setActionFilter } = useLogs()

  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Logs"
        description="Journal des actions administrateur (audit trail)"
      />
      <WeeklyGenerationMonitor />
      <LogsTable
        logs={logs}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        levelFilter={levelFilter}
        onLevelFilterChange={setLevelFilter}
        actionFilter={actionFilter}
        onActionFilterChange={setActionFilter}
      />
    </div>
  )
}
