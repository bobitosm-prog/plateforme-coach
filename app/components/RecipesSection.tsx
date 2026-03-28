'use client'
import { useState, useEffect } from 'react'
import { X, Heart, Clock, Sparkles, ChefHat } from 'lucide-react'
import { toast } from 'sonner'

const GOLD = '#C9A84C'
const BG = '#0A0A0A'
const CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'

const CATEGORIES = [
  { id: 'all', label: 'Tout' },
  { id: 'petit-dejeuner', label: 'Petit-déj' },
  { id: 'dejeuner', label: 'Déjeuner' },
  { id: 'collation', label: 'Collation' },
  { id: 'diner', label: 'Dîner' },
  { id: 'smoothie', label: 'Smoothie' },
]

const TAG_COLORS: Record<string, string> = {
  'high-protein': '#3B82F6', 'low-carb': '#22C55E', 'quick': '#F59E0B',
  'meal-prep': '#8B5CF6', 'bulk': '#EF4444', 'vegan': '#10B981',
}

interface RecipesSectionProps {
  supabase: any
  userId: string
  profile: any
}

export default function RecipesSection({ supabase, userId, profile }: RecipesSectionProps) {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genCategory, setGenCategory] = useState('dejeuner')

  useEffect(() => { loadRecipes() }, [])

  async function loadRecipes() {
    setLoading(true)
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? recipes : recipes.filter(r => r.category === filter)

  async function generateRecipe() {
    setGenerating(true)
    try {
      const { data: foods } = await supabase.from('food_items').select('name, energy_kcal, proteins, carbohydrates, fat').eq('source', 'fitness').limit(50)
      const foodsList = (foods || []).map((f: any) => `${f.name} (${Math.round(f.energy_kcal)}kcal P${Math.round(f.proteins)})`).join(', ')

      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: genCategory, profile, foodsList }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Save to DB
      const { data: saved, error } = await supabase.from('recipes').insert({
        user_id: userId, ...data.recipe, source: 'ai',
      }).select().single()

      if (error) throw new Error(error.message)
      setRecipes(prev => [saved, ...prev])
      setSelected(saved)
      setShowGenerate(false)
      toast.success('Recette générée !')
    } catch (e: any) {
      toast.error(e.message || 'Erreur de génération')
    }
    setGenerating(false)
  }

  async function toggleFavorite(recipe: any) {
    const next = !recipe.is_favorite
    await supabase.from('recipes').update({ is_favorite: next }).eq('id', recipe.id)
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favorite: next } : r))
    if (selected?.id === recipe.id) setSelected({ ...selected, is_favorite: next })
  }

  async function deleteRecipe(id: string) {
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    setSelected(null)
    toast.success('Recette supprimée')
  }

  // ── Recipe detail modal ──
  if (selected) {
    const ingredients = Array.isArray(selected.ingredients) ? selected.ingredients : []
    const instructions = Array.isArray(selected.instructions) ? selected.instructions : []

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Back button */}
        <button onClick={() => setSelected(null)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0 }}>← Retour aux recettes</button>

        {/* Title + favorite */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: TEXT, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{selected.title}</h2>
            {selected.description && <p style={{ fontSize: '0.82rem', color: MUTED, margin: 0, lineHeight: 1.5 }}>{selected.description}</p>}
          </div>
          <button onClick={() => toggleFavorite(selected)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
            <Heart size={22} color={selected.is_favorite ? '#EF4444' : MUTED} fill={selected.is_favorite ? '#EF4444' : 'none'} />
          </button>
        </div>

        {/* Macros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { l: 'Kcal', v: selected.calories_per_serving, c: GOLD },
            { l: 'Prot', v: `${selected.proteins_per_serving}g`, c: '#3B82F6' },
            { l: 'Gluc', v: `${selected.carbs_per_serving}g`, c: '#F59E0B' },
            { l: 'Lip', v: `${selected.fat_per_serving}g`, c: '#22C55E' },
          ].map(m => (
            <div key={m.l} style={{ background: CARD, borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: '0.55rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase' }}>{m.l}</div>
            </div>
          ))}
        </div>

        {/* Time + tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {(selected.prep_time_min || selected.cook_time_min) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: MUTED }}>
              <Clock size={12} /> {(selected.prep_time_min || 0) + (selected.cook_time_min || 0)} min
            </span>
          )}
          {(selected.tags || []).map((t: string) => (
            <span key={t} style={{ fontSize: '0.6rem', fontWeight: 700, color: TAG_COLORS[t] || GOLD, background: `${TAG_COLORS[t] || GOLD}15`, borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase' }}>{t}</span>
          ))}
        </div>

        {/* Ingredients */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Ingrédients ({selected.servings || 1} portion{(selected.servings || 1) > 1 ? 's' : ''})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ingredients.map((ing: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: TEXT, fontWeight: 500 }}>{ing.name}</span>
                <span style={{ fontSize: '0.78rem', color: GOLD, fontWeight: 600 }}>{ing.quantity_g}g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Préparation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {instructions.map((step: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: `1.5px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: GOLD, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, flexShrink: 0 }}>{step.step || i + 1}</div>
                <p style={{ fontSize: '0.85rem', color: '#bbb', lineHeight: 1.55, margin: 0 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delete */}
        {selected.user_id === userId && (
          <button onClick={() => deleteRecipe(selected.id)} style={{ background: 'none', border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 12, padding: '10px', color: '#EF4444', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Supprimer cette recette</button>
        )}
      </div>
    )
  }

  // ── Generate modal ──
  if (showGenerate) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={() => setShowGenerate(false)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0 }}>← Retour</button>

        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Sparkles size={28} color={GOLD} style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: TEXT, margin: 0 }}>GÉNÉRER UNE RECETTE</h3>
          <p style={{ fontSize: '0.78rem', color: MUTED, margin: '4px 0 0' }}>Le chef IA crée une recette adaptée à tes macros</p>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: '0.68rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Catégorie</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.filter(c => c.id !== 'all').map(c => (
              <button key={c.id} onClick={() => setGenCategory(c.id)} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: genCategory === c.id ? `${GOLD}20` : BG, color: genCategory === c.id ? GOLD : MUTED, fontFamily: "'Barlow Condensed', sans-serif" }}>{c.label}</button>
            ))}
          </div>
        </div>

        <button onClick={generateRecipe} disabled={generating} style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, color: '#000', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: generating ? 0.6 : 1 }}>
          {generating ? 'Le chef IA prépare ta recette...' : 'Générer la recette'}
        </button>
      </div>
    )
  }

  // ── Main list view ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recettes fitness</h2>
        <button onClick={() => setShowGenerate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `${GOLD}15`, color: GOLD, fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>
          <Sparkles size={13} /> Générer
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap', background: filter === c.id ? `${GOLD}15` : CARD, color: filter === c.id ? GOLD : MUTED, fontFamily: "'Barlow Condensed', sans-serif" }}>{c.label}</button>
        ))}
      </div>

      {/* Recipe cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <ChefHat size={32} color={MUTED} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.85rem', color: MUTED }}>Aucune recette. Génère-en une !</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {filtered.map(recipe => (
            <button key={recipe.id} onClick={() => setSelected(recipe)} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 12px', textAlign: 'left', cursor: 'pointer', transition: 'all 150ms', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>{recipe.title}</div>
              <div style={{ fontSize: '0.65rem', color: MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: GOLD }}>{recipe.calories_per_serving} kcal</span>
                <span>P{recipe.proteins_per_serving}g</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(recipe.tags || []).slice(0, 2).map((t: string) => (
                  <span key={t} style={{ fontSize: '0.52rem', fontWeight: 700, color: TAG_COLORS[t] || MUTED, background: `${TAG_COLORS[t] || MUTED}15`, borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase' }}>{t}</span>
                ))}
                {recipe.prep_time_min && <span style={{ fontSize: '0.52rem', color: MUTED }}>🕐 {recipe.prep_time_min + (recipe.cook_time_min || 0)}min</span>}
              </div>
              {recipe.is_favorite && <Heart size={10} color="#EF4444" fill="#EF4444" style={{ position: 'absolute', top: 8, right: 8 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
