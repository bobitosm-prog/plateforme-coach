'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { 
  Plus, Trash2, Beef, Wheat, Droplet,
  Utensils, X, ChevronDown, Search, Activity 
} from 'lucide-react'

// --- TYPES ---
type FoodItem = {
  id: number
  nom: string
  calories: any
  proteines: any
  glucides: any
  lipides: any
}

type AddedFood = FoodItem & {
  uniqueId: string
  weight: number
}

type Meal = {
  id: string
  name: string
  foods: AddedFood[]
}

const parseVal = (v: any) => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v.replace(',', '.')) || 0
  return 0
}

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36)

// On importe le graphique de manière dynamique pour éviter le crash Safari/iPhone
const NutritionDashboard = dynamic(() => import('./NutritionDashboard'), { 
  ssr: false,
  loading: () => <div className="w-32 h-32 rounded-full border-4 border-zinc-800 animate-pulse" />
})

export default function NutritionPage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const [supabase] = useState(() => createBrowserClient(
    "https://njlzossopgknanhkzcbk.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbHpvc3NvcGdrbmFuaGt6Y2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDczMDMsImV4cCI6MjA4ODEyMzMwM30.22cQCoBdbIek3IU0GPkRUKlPYj19jiYwac0K8sRJM1w"
  ))

  const [meals, setMeals] = useState<Meal[]>([
    { id: 'breakfast', name: 'Petit-déjeuner', foods: [] },
    { id: 'lunch', name: 'Déjeuner', foods: [] },
    { id: 'snack', name: 'Collation', foods: [] },
    { id: 'dinner', name: 'Dîner', foods: [] },
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetMealId, setTargetMealId] = useState<string>('breakfast')
  const [searchResults, setSearchResults] = useState<FoodItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [weight, setWeight] = useState<string>('100')

  const CALORIE_GOAL = 2500

  useEffect(() => {
    const searchAliments = async () => {
      const term = search.trim()
      if (term.length > 1) {
        setIsSearching(true)
        try {
          const { data, error } = await supabase
            .from('food_items') 
            .select('*')
            .ilike('nom', `%${term}%`)
            .limit(15)
          if (error) throw error
          setSearchResults(data || [])
        } catch (error) {
          console.error("Erreur Supabase:", error)
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }
    const timer = setTimeout(searchAliments, 300)
    return () => clearTimeout(timer)
  }, [search, supabase])

  const openSearchForMeal = (mealId: string) => {
    setTargetMealId(mealId)
    setSelectedFood(null)
    setSearch('')
    setIsModalOpen(true)
  }

  const addFoodToMeal = () => {
    if (!selectedFood) return
    const newFood: AddedFood = {
      ...selectedFood,
      weight: parseFloat(weight) || 100,
      uniqueId: generateId()
    }
    setMeals(prev => prev.map(meal => {
      if (meal.id === targetMealId) return { ...meal, foods: [...meal.foods, newFood] }
      return meal
    }))
    setIsModalOpen(false)
  }

  const removeFood = (mealId: string, foodId: string) => {
    setMeals(prev => prev.map(meal => {
      if (meal.id === mealId) return { ...meal, foods: meal.foods.filter(f => f.uniqueId !== foodId) }
      return meal
    }))
  }

  const dailyTotals = useMemo(() => {
    return meals.reduce((acc, meal) => {
      const mealTotals = meal.foods.reduce((mAcc, food) => {
        const ratio = food.weight / 100
        return {
          calories: mAcc.calories + (parseVal(food.calories) * ratio),
          protein: mAcc.protein + (parseVal(food.proteines) * ratio),
          carbs: mAcc.carbs + (parseVal(food.glucides) * ratio),
          fat: mAcc.fat + (parseVal(food.lipides) * ratio),
        }
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
      
      return {
        calories: acc.calories + mealTotals.calories,
        protein: acc.protein + mealTotals.protein,
        carbs: acc.carbs + mealTotals.carbs,
        fat: acc.fat + mealTotals.fat,
      }
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
  }, [meals])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 font-sans">
      <header className="mb-6">
        <h1 className="text-4xl font-black text-orange-500 italic uppercase tracking-tighter">Nutrition</h1>
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Base de données CoachPlatform</p>
      </header>

      {/* DASHBOARD GLOBAL */}
      <div className="bg-zinc-900/50 rounded-[30px] p-6 border border-zinc-800 mb-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          
          {/* Appel au composant dynamique Recharts */}
          <NutritionDashboard 
            data={[
              { name: 'Consommé', value: dailyTotals.calories },
              { name: 'Restant', value: Math.max(0, CALORIE_GOAL - dailyTotals.calories) }
            ]}
            colors={['#f97316', '#27272a']}
            calories={dailyTotals.calories}
          />

          <div className="flex-1 ml-6 space-y-3">
            <MacroRow label="Protéines" val={dailyTotals.protein} color="bg-blue-500" icon={<Beef size={10}/>} max={180} />
            <MacroRow label="Glucides" val={dailyTotals.carbs} color="bg-yellow-500" icon={<Wheat size={10}/>} max={250} />
            <MacroRow label="Lipides" val={dailyTotals.fat} color="bg-red-500" icon={<Droplet size={10}/>} max={80} />
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-20">
        {meals.map((meal) => (
          <div key={meal.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-5 flex justify-between items-center bg-zinc-900/80 border-b border-zinc-800/50">
              <div className="flex items-center gap-3">
                <Utensils size={16} className="text-orange-500" />
                <h3 className="font-bold text-white text-sm">{meal.name}</h3>
              </div>
              <button 
                type="button"
                onClick={() => openSearchForMeal(meal.id)}
                className="bg-orange-500 p-3 rounded-xl active:scale-95 transition-transform"
              >
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="p-2">
              {meal.foods.length === 0 ? (
                <div className="text-center py-6 text-zinc-700 text-xs italic">Aucun aliment</div>
              ) : (
                meal.foods.map((food) => (
                  <div key={food.uniqueId} className="flex justify-between items-center p-3 hover:bg-zinc-800/30 rounded-2xl transition-colors">
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-200 truncate">{food.nom}</div>
                      <div className="text-[10px] text-zinc-500">{food.weight}g — {Math.round(parseVal(food.calories) * food.weight / 100)} kcal</div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeFood(meal.id, food.uniqueId)}
                      className="text-zinc-600 hover:text-red-500 p-3"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODALE D'AJOUT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black italic uppercase">Ajouter</h2>
            <button type="button" onClick={() => setIsModalOpen(false)} className="bg-zinc-800 p-3 rounded-full"><X size={24}/></button>
          </div>

          {!selectedFood ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-4 text-zinc-500" size={20} />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-orange-500"
                />
              </div>
              <div className="space-y-2">
                {searchResults.map(alim => (
                  <button 
                    type="button"
                    key={alim.id} 
                    onClick={() => setSelectedFood(alim)}
                    className="w-full text-left p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-between items-center"
                  >
                    <span className="font-bold text-sm">{alim.nom}</span>
                    <span className="text-orange-500 text-xs">{alim.calories} kcal</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 py-10">
              <h3 className="text-2xl font-black text-center">{selectedFood.nom}</h3>
              <div className="flex items-end gap-2">
                <input 
                  type="number" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="bg-transparent text-white text-7xl font-black w-40 text-center border-b-2 border-zinc-800 focus:border-orange-500 outline-none"
                />
                <span className="text-zinc-500 font-bold text-xl mb-4">g</span>
              </div>
              <button 
                type="button"
                onClick={addFoodToMeal} 
                className="w-full bg-orange-500 text-white font-black py-5 rounded-3xl uppercase shadow-lg shadow-orange-500/20"
              >
                Confirmer
              </button>
            </div>
          )}
        </div>
      )}

      <nav className="fixed bottom-6 left-6 right-6 bg-zinc-900/95 border-2 border-zinc-800 h-16 rounded-[25px] flex justify-around items-center z-40 px-6 shadow-2xl">
        <Link href="/nutrition" className="text-orange-500 text-[10px] font-black uppercase italic underline decoration-2 underline-offset-4">Nutrition</Link>
        <Link href="/exercices" className="text-zinc-600 text-[10px] font-black uppercase italic">Workouts</Link>
        <Link href="/" className="text-zinc-600 text-[10px] font-black uppercase italic">Profil</Link>
      </nav>
    </div>
  )
}

function MacroRow({ label, val, color, icon, max }: any) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold mb-1 uppercase">
        <span className="flex items-center gap-1 text-zinc-400">{icon} {label}</span>
        <span>{Math.round(val)}g</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min((val / max) * 100, 100)}%` }} />
      </div>
    </div>
  )
}