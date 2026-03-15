'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import dynamic from 'next/dynamic'
import { Plus, Camera, Trash2, LogOut, TrendingDown, Scale, Target, Flame } from 'lucide-react'

// Imports Dynamiques pour éviter les erreurs d'hydratation
const CalorieChart = dynamic(() => import('./NutritionDashboard').then(mod => mod.CalorieChart), { ssr: false })
const WeightChart = dynamic(() => import('./NutritionDashboard').then(mod => mod.WeightChart), { ssr: false })

export default function NutritionPage() {
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  
 const [supabase] = useState(() => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
))

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) fetchUserData()
  }, [session])

  async function fetchUserData() {
    // 1. Charger Profil
    const { data: prof } = await supabase.from('profiles').select('*').single()
    if (prof) setProfile(prof)

    // 2. Charger Historique Poids (7 derniers points)
    const { data: weights } = await supabase
      .from('weight_logs')
      .select('date, poids')
      .eq('user_id', session?.user.id)
      .order('date', { ascending: true })
      .limit(10)
    
    // Formater la date pour le graphique
    const formattedWeights = weights?.map(w => ({
      ...w,
      date: new Date(w.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    }))
    setWeightHistory(formattedWeights || [])
  }

  async function handleAddWeight() {
    const p = prompt("Entrez votre poids actuel (kg) :")
    if (p && !isNaN(parseFloat(p))) {
      const val = parseFloat(p)
      const { error } = await supabase.from('weight_logs').insert({ 
        user_id: session.user.id, 
        poids: val 
      })
      if (!error) {
        await supabase.from('profiles').upsert({ id: session.user.id, current_weight: val })
        fetchUserData()
      }
    }
  }

  // Calcul de la progression
  const weightProgress = useMemo(() => {
    if (!profile?.current_weight || weightHistory.length < 2) return 0
    const startWeight = weightHistory[0].poids
    return parseFloat((profile.current_weight - startWeight).toFixed(1))
  }, [profile, weightHistory])

  if (!mounted) return null

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="bg-orange-500 p-4 rounded-3xl rotate-12"><Flame size={32} fill="white" /></div>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 text-center italic uppercase">Coach Platform</h1>
          <p className="text-zinc-500 text-center text-sm mb-8">Connecte-toi pour suivre tes perfs</p>
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
    <div className="min-h-screen bg-black text-white p-6 pb-32">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter">Dashboard</h1>
          <p className="text-orange-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Compte Actif
          </p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 text-zinc-500 active:scale-95 transition-all">
          <LogOut size={20}/>
        </button>
      </div>

      {/* STATS RAPIDES (POIDS) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] p-5">
          <Scale className="text-zinc-500 mb-2" size={18}/>
          <div className="text-2xl font-black">{profile?.current_weight || '--'}<span className="text-xs text-zinc-500 ml-1">kg</span></div>
          <div className="text-[10px] font-bold text-zinc-500 uppercase">Poids Actuel</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] p-5">
          <TrendingDown className="text-orange-500 mb-2" size={18}/>
          <div className="text-2xl font-black text-orange-500">{weightProgress > 0 ? `+${weightProgress}` : weightProgress}<span className="text-xs ml-1">kg</span></div>
          <div className="text-[10px] font-bold text-zinc-500 uppercase">Progression</div>
        </div>
      </div>

      {/* GRAPHIQUE POIDS */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 italic">Analyse 7 derniers logs</h2>
          <button onClick={handleAddWeight} className="bg-white text-black text-[10px] font-black px-4 py-2 rounded-full uppercase active:scale-95 transition-all">
            + Nouveau Log
          </button>
        </div>
        <WeightChart data={weightHistory} />
      </div>

      {/* DASHBOARD CALORIES */}
      <div className="bg-orange-500 rounded-[32px] p-6 mb-8 flex items-center shadow-[0_20px_40px_rgba(249,115,22,0.2)]">
        <CalorieChart 
          data={[{value: 1750}, {value: 750}]} 
          colors={['#fff', 'rgba(255,255,255,0.2)']} 
          calories={1750} 
        />
        <div className="ml-6 flex-1">
            <div className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Objectif Quotidien</div>
            <div className="text-2xl font-black text-white mb-2">2,500 <span className="text-sm font-medium">kcal</span></div>
            <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{width: '70%'}}></div>
            </div>
        </div>
      </div>

      {/* BOUTON ACTION RAPIDE */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 italic ml-2">Repas du jour</h3>
        {['Petit-déjeuner', 'Déjeuner', 'Dîner'].map((meal, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-[28px] flex justify-between items-center active:bg-zinc-800 transition-colors">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-800 rounded-2xl flex items-center justify-center text-orange-500">
                    <Plus size={20} />
                </div>
                <span className="font-bold text-sm">{meal}</span>
            </div>
            <Camera size={18} className="text-zinc-600" />
          </div>
        ))}
      </div>
    </div>
  )
}