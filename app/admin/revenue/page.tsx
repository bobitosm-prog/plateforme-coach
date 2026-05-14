import { PageHeader } from '../_components/PageHeader'
import { DollarSign } from 'lucide-react'

export default function AdminRevenuePage() {
  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Revenue"
        description="Détails Stripe et historique des paiements"
      />
      <div className="bg-[#15110B] border border-amber-900/15 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-400/10 ring-1 ring-emerald-400/20 flex items-center justify-center mb-4">
          <DollarSign size={20} className="text-emerald-400" strokeWidth={1.8} />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Page en construction</h3>
        <p className="text-xs text-zinc-500">Détails Stripe, historique des paiements et breakdown revenue arrivent bientôt.</p>
      </div>
    </div>
  )
}
