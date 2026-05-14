import { PageHeader } from '../_components/PageHeader'
import { Users } from 'lucide-react'

export default function AdminUsersPage() {
  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Comptes"
        description="Gestion des utilisateurs de la plateforme"
      />
      <div className="bg-[#15110B] border border-amber-900/15 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-400/10 ring-1 ring-amber-400/20 flex items-center justify-center mb-4">
          <Users size={20} className="text-amber-400" strokeWidth={1.8} />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Page en construction</h3>
        <p className="text-xs text-zinc-500">Table utilisateurs, search, filtres et actions arrivent au prochain commit.</p>
      </div>
    </div>
  )
}
