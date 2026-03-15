'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'

export default function ExercicesPage() {
  // REMPLACE LES DEUX LIGNES CI-DESSOUS PAR TES VRAIES CLÉS SUPABASE
const [supabase] = useState(() => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
))

  const [exercices, setExercices] = useState<any[]>([])

  useEffect(() => {
    const fetchExercices = async () => {
      const { data, error } = await supabase.from('exercices').select('*')
      if (error) console.error("Erreur:", error)
      if (data) setExercices(data)
    }
    fetchExercices()
  }, [supabase])

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-orange-500 uppercase italic">
          Entraînements
        </h1>
        <p className="text-zinc-500 text-sm mt-1 italic">Force et discipline, Marco.</p>
      </header>
      
      <div className="grid gap-4">
        {exercices.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-600">
            Aucun exercice trouvé dans ta base.
          </div>
        ) : (
          exercices.map((exo) => (
            <div key={exo.id} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 flex items-center justify-between shadow-xl">
              <div>
                <h2 className="font-bold text-lg text-white">{exo.name}</h2>
                <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest bg-orange-500/10 px-2 py-1 rounded-md">
                  {exo.muscle}
                </span>
              </div>
              <a 
                href={exo.video_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-black text-[10px] font-black px-4 py-2 rounded-full active:scale-95 transition-all uppercase"
              >
                Vidéo
              </a>
            </div>
          ))
        )}
      </div>

      {/* Menu Navigation Mobile */}
      <nav className="fixed bottom-6 left-6 right-6 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 h-16 rounded-2xl flex justify-around items-center shadow-2xl">
        <button onClick={() => window.location.href='/nutrition'} className="text-zinc-500 text-[10px] font-black uppercase">Nutrition</button>
        <button className="text-orange-500 text-[10px] font-black uppercase underline decoration-2 underline-offset-4">Exercices</button>
        <button onClick={() => window.location.href='/'} className="text-zinc-500 text-[10px] font-black uppercase">Accueil</button>
      </nav>
    </div>
  )
}