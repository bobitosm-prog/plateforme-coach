'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { UserPlus, Check, AlertCircle } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function JoinContent() {
  const params = useSearchParams()
  const coachId = params.get('coach')
  const [session, setSession] = useState<any>(null)
  const [linked, setLinked] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !coachId) return
    async function link() {
      setLinkError(null)
      const { error } = await supabase
        .from('coach_clients')
        .upsert(
          { coach_id: coachId, client_id: session.user.id },
          { onConflict: 'coach_id,client_id' }
        )
      if (error) {
        setLinkError(error.message)
      } else {
        setLinked(true)
        // Auto-redirect after 1.5s
        setTimeout(() => { window.location.href = '/' }, 1500)
      }
    }
    link()
  }, [session, coachId])

  if (!mounted) return null

  if (!coachId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <p className="text-zinc-500 text-sm">Lien d'invitation invalide.</p>
      </div>
    )
  }

  if (!session) {
    // Build redirectTo preserving the ?coach= param so OAuth callbacks keep it
    const redirectTo = typeof window !== 'undefined' ? window.location.href : undefined

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="bg-orange-500 p-4 rounded-3xl">
              <UserPlus size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 text-center italic uppercase">Rejoindre</h1>
          <p className="text-zinc-500 text-center text-sm mb-8">
            Crée ton compte pour être suivi par ton coach
          </p>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#f97316', brandAccent: '#ea580c' } } } }}
            theme="dark"
            providers={['google']}
            redirectTo={redirectTo}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 shadow-2xl text-center">

        {linkError ? (
          <>
            <div className="w-16 h-16 rounded-[20px] bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase mb-2">Erreur</h2>
            <p className="text-zinc-500 text-sm mb-6">{linkError}</p>
            <a
              href="/"
              className="block w-full py-4 rounded-2xl bg-zinc-800 text-white font-black uppercase tracking-wider text-sm active:scale-[0.98] transition-all"
            >
              Aller au Dashboard quand même →
            </a>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-[20px] bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
              <Check size={28} className={linked ? 'text-green-500' : 'text-zinc-600 animate-pulse'} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase mb-2">
              {linked ? 'Connecté !' : 'Connexion en cours…'}
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
              {linked
                ? 'Lié à ton coach. Redirection…'
                : 'Enregistrement en cours…'}
            </p>
            {linked && (
              <a
                href="/"
                className="block w-full py-4 rounded-2xl bg-orange-500 text-black font-black uppercase tracking-wider text-sm active:scale-[0.98] transition-all"
              >
                Aller au Dashboard →
              </a>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  )
}
