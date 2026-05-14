import { PageHeader } from '../_components/PageHeader'
import { ScrollText } from 'lucide-react'

export default function AdminLogsPage() {
  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Logs"
        description="Journal d'activité admin (app_logs)"
      />
      <div className="bg-[#15110B] border border-amber-900/15 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-400/10 ring-1 ring-zinc-400/20 flex items-center justify-center mb-4">
          <ScrollText size={20} className="text-zinc-300" strokeWidth={1.8} />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Page en construction</h3>
        <p className="text-xs text-zinc-500">Journal d'activité admin avec filtres et recherche arrive bientôt.</p>
      </div>
    </div>
  )
}
