'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ADMIN_EMAIL } from '../../lib/constants'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminPage() {
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      if (session.user.email !== ADMIN_EMAIL) { setStatus('denied'); return }
      const { data } = await supabase.from('profiles').select('id, email, full_name, role, subscription_type, subscription_status').order('created_at', { ascending: false })
      setProfiles(data || [])
      setStatus('ok')
    })()
  }, [])

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-[#0D0B08] text-amber-400">Chargement...</div>
  if (status === 'denied') return <div className="min-h-screen flex items-center justify-center bg-[#0D0B08] text-white">Acces refuse. <a href="/" className="text-amber-400 ml-2 underline">Retour</a></div>

  return (
    <div className="min-h-screen bg-[#0D0B08] text-white p-8">
      <h1 className="text-2xl font-bold text-amber-400 mb-6">ADMIN — {profiles.length} comptes</h1>
      <div className="space-y-2">
        {profiles.map(p => (
          <div key={p.id} className="border border-amber-900/30 rounded p-4 flex justify-between">
            <div>
              <div className="font-semibold">{p.full_name || p.email}</div>
              <div className="text-sm text-gray-400">{p.email}</div>
            </div>
            <div className="text-right text-sm">
              <div className="text-amber-400">{p.role}</div>
              <div className="text-gray-400">{p.subscription_type} · {p.subscription_status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
