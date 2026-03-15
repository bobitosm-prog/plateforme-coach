'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { UserPlus, Check } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function JoinContent() {
  const params = useSearchParams()
  const coachId = params.get('coach')
  const [session, setSession] = useState<any>(null)
  const [linked, setLinked] = useState(false)
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
      const { error } = await supabase
        .from('coach_clients')
        .upsert({ coach_id: coachId, client_id: session.user.id }, { onConflict: 'coach_id,client_id' })
      if (!error) setLinked(true)
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
            redirectTo={typeof window !== 'undefined' ? window.location.href : undefined}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-[20px] bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
          <Check size={28} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase mb-2">
          {linked ? 'Connecté !' : 'Connexion en cours…'}
        </h2>
        <p className="text-zinc-500 text-sm mb-6">
          {linked
            ? 'Tu es maintenant lié à ton coach. Tu peux accéder à ton dashboard.'
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
