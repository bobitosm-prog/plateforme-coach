'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Users, LogOut, Copy, Check, UserPlus, Mail, Dumbbell, Scale, Crown } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Client {
  id: string
  client_id: string
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
    current_weight: number | null
    calorie_goal: number | null
  } | null
}

export default function CoachPage() {
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setLoading(false); return }
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    setInviteLink(`${base}/join?coach=${session.user.id}`)
    fetchClients(session.user.id)

    // Handle invite link: if this coach just landed via ?coach=xxx, ignore (that's the client flow)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const coachId = params.get('coach')
      if (coachId && coachId !== session.user.id) {
        linkClientToCoach(coachId, session.user.id)
      }
    }
  }, [session])

  async function fetchClients(coachId: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('coach_clients')
      .select('id, client_id, created_at, profiles!coach_clients_client_id_fkey(id, full_name, avatar_url, current_weight, calorie_goal)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
    if (!error && data) setClients(data as Client[])
    setLoading(false)
  }

  async function linkClientToCoach(coachId: string, clientId: string) {
    const { error } = await supabase
      .from('coach_clients')
      .upsert({ coach_id: coachId, client_id: clientId }, { onConflict: 'coach_id,client_id' })
    if (!error) {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!mounted) return null

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="bg-orange-500 p-4 rounded-3xl">
              <Crown size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 text-center italic uppercase">Coach Panel</h1>
          <p className="text-zinc-500 text-center text-sm mb-8">Connecte-toi pour gérer tes clients</p>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#f97316', brandAccent: '#ea580c' } } } }}
            theme="dark"
            providers={['google']}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;900&display=swap');`}</style>

      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-zinc-800 px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center">
              <Crown size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-white">Coach Panel</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 active:scale-95 transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-5">

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[24px] p-5">
            <Users size={18} className="text-orange-500 mb-2" />
            <div className="text-3xl font-black" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{clients.length}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clients actifs</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-[24px] p-5">
            <UserPlus size={18} className="text-zinc-500 mb-2" />
            <div className="text-3xl font-black text-zinc-400" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>∞</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Capacité</div>
          </div>
        </div>

        {/* INVITE CARD */}
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-[28px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={16} className="text-orange-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-orange-500">Inviter un client</h2>
          </div>
          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            Partage ce lien avec ton client. Quand il crée un compte, il sera automatiquement lié à ton profil coach.
          </p>
          <div className="bg-black/40 border border-zinc-700 rounded-2xl px-4 py-3 flex items-center gap-3 mb-3">
            <Mail size={14} className="text-zinc-500 flex-shrink-0" />
            <span className="text-xs text-zinc-400 flex-1 truncate font-mono">{inviteLink || 'Chargement…'}</span>
          </div>
          <button
            onClick={copyInviteLink}
            className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ background: copied ? '#22c55e' : '#f97316', color: '#000' }}
          >
            {copied ? <><Check size={16} /> Copié !</> : <><Copy size={16} /> Copier le lien</>}
          </button>
        </div>

        {/* CLIENT LIST */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">
            Mes clients ({clients.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-[20px] p-4 h-20 animate-pulse" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-[24px] p-10 text-center">
              <Users size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm font-bold">Aucun client pour l'instant</p>
              <p className="text-zinc-700 text-xs mt-1">Partage ton lien d'invitation pour commencer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => {
                const p = c.profiles
                const initials = p?.full_name
                  ? p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  : '?'
                return (
                  <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-[20px] p-4 flex items-center gap-4 active:bg-zinc-800 transition-colors">
                    {/* Avatar */}
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt={p.full_name ?? ''} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-500 font-black text-sm">{initials}</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm text-white truncate">
                        {p?.full_name ?? 'Client sans nom'}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        Depuis le {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {p?.current_weight && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                          <Scale size={10} />
                          {p.current_weight} kg
                        </div>
                      )}
                      {p?.calorie_goal && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                          <Dumbbell size={10} />
                          {p.calorie_goal} kcal
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
