'use client'
import { useState, useEffect } from 'react'
import { X, Heart, Clock, Sparkles, ChefHat } from 'lucide-react'
import { toast } from 'sonner'
import { BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../lib/design-tokens'

const CATEGORIES = [
  { id: 'all', label: 'Tout' },
  { id: 'petit-dejeuner', label: 'Petit-dej' },
  { id: 'dejeuner', label: 'Dejeuner' },
  { id: 'collation', label: 'Collation' },
  { id: 'diner', label: 'Diner' },
  { id: 'smoothie', label: 'Smoothie' },
]

const TAG_COLORS: Record<string, string> = {
  'high-protein': GOLD, 'low-carb': GOLD, 'quick': GOLD,
  'meal-prep': GOLD, 'bulk': GOLD, 'vegan': GOLD,
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
      .limit(50)
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
      toast.success('Recette generee !')
    } catch (e: any) {
      toast.error(e.message || 'Erreur de generation')
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
    toast.success('Recette supprimee')
  }

  // -- Recipe detail modal --
  if (selected) {
    const ingredients = Array.isArray(selected.ingredients) ? selected.ingredients : []
    const instructions = Array.isArray(selected.instructions) ? selected.instructions : []

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Back button */}
        <button onClick={() => setSelected(null)} style={{ alignSelf: 'flex-start', background: 'none', border: `1px solid ${GOLD_RULE}`, borderRadius: 0, color: TEXT_PRIMARY, cursor: 'pointer', fontSize: '0.82rem', fontFamily: FONT_ALT, fontWeight: 700, padding: '4px 12px', letterSpacing: '0.5px' }}>← Retour aux recettes</button>

        {/* Title + favorite */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '2px' }}>{selected.title}</h2>
            {selected.description && <p style={{ fontSize: '0.82rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED, margin: 0, lineHeight: 1.5 }}>{selected.description}</p>}
          </div>
          <button onClick={() => toggleFavorite(selected)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
            <Heart size={22} color={selected.is_favorite ? RED : TEXT_MUTED} fill={selected.is_favorite ? RED : 'none'} />
          </button>
        </div>

        {/* Macros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { l: 'Kcal', v: selected.calories_per_serving, c: GOLD },
            { l: 'Prot', v: `${selected.proteins_per_serving}g`, c: GOLD },
            { l: 'Gluc', v: `${selected.carbs_per_serving}g`, c: GOLD },
            { l: 'Lip', v: `${selected.fat_per_serving}g`, c: GOLD },
          ].map(m => (
            <div key={m.l} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', fontWeight: 700, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: '0.55rem', fontFamily: FONT_ALT, color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{m.l}</div>
            </div>
          ))}
        </div>

        {/* Time + tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {(selected.prep_time_min || selected.cook_time_min) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontFamily: FONT_BODY, color: TEXT_MUTED }}>
              <Clock size={12} /> {(selected.prep_time_min || 0) + (selected.cook_time_min || 0)} min
            </span>
          )}
          {(selected.tags || []).map((t: string) => (
            <span key={t} style={{ fontSize: '0.6rem', fontWeight: 800, fontFamily: FONT_ALT, color: GOLD, background: GOLD_DIM, borderRadius: 0, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t}</span>
          ))}
        </div>

        {/* Ingredients */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
          <div style={{ fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>Ingredients ({selected.servings || 1} portion{(selected.servings || 1) > 1 ? 's' : ''})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ingredients.map((ing: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, fontWeight: 400, color: TEXT_PRIMARY }}>{ing.name}</span>
                <span style={{ fontSize: '0.78rem', fontFamily: FONT_DISPLAY, color: GOLD, fontWeight: 700 }}>{ing.quantity_g}g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
          <div style={{ fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>Preparation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {instructions.map((step: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 0, border: `1.5px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: GOLD, fontFamily: FONT_DISPLAY, fontWeight: 700, flexShrink: 0 }}>{step.step || i + 1}</div>
                <p style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED, lineHeight: 1.55, margin: 0 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delete */}
        {selected.user_id === userId && (
          <button onClick={() => deleteRecipe(selected.id)} style={{ background: 'none', border: `1px solid ${RED}`, borderRadius: 0, padding: '10px', color: RED, fontSize: '0.78rem', fontFamily: FONT_ALT, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px' }}>Supprimer cette recette</button>
        )}
      </div>
    )
  }

  // -- Generate modal --
  if (showGenerate) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={() => setShowGenerate(false)} style={{ alignSelf: 'flex-start', background: 'none', border: `1px solid ${GOLD_RULE}`, borderRadius: 0, color: TEXT_PRIMARY, cursor: 'pointer', fontSize: '0.82rem', fontFamily: FONT_ALT, fontWeight: 700, padding: '4px 12px', letterSpacing: '0.5px' }}>← Retour</button>

        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Sparkles size={28} color={GOLD} style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0, letterSpacing: '2px' }}>GENERER UNE RECETTE</h3>
          <p style={{ fontSize: '0.78rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED, margin: '4px 0 0' }}>Notre chef cree une recette adaptee a tes macros</p>
        </div>

        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
          <div style={{ fontSize: '0.68rem', fontFamily: FONT_ALT, color: TEXT_MUTED, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 8 }}>Categorie</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.filter(c => c.id !== 'all').map(c => (
              <button key={c.id} onClick={() => setGenCategory(c.id)} style={{ padding: '8px 14px', borderRadius: 0, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, background: genCategory === c.id ? GOLD : BG_BASE, color: genCategory === c.id ? '#050505' : TEXT_MUTED, fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' }}>{c.label}</button>
            ))}
          </div>
        </div>

        <button onClick={generateRecipe} disabled={generating} style={{ width: '100%', padding: '16px', borderRadius: 0, border: 'none', cursor: 'pointer', background: GOLD, color: '#050505', fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', opacity: generating ? 0.6 : 1, clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}>
          {generating ? 'Notre chef prepare ta recette...' : 'Generer la recette'}
        </button>
      </div>
    )
  }

  // -- Main list view --
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY, margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Recettes fitness</h2>
        <button onClick={() => setShowGenerate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 0, border: 'none', cursor: 'pointer', background: GOLD, color: '#050505', fontSize: '0.72rem', fontWeight: 800, fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase', clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}>
          <Sparkles size={13} /> Generer
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} style={{ padding: '6px 12px', borderRadius: 0, border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap', background: filter === c.id ? GOLD : BG_CARD, color: filter === c.id ? '#050505' : TEXT_MUTED, fontFamily: FONT_ALT, letterSpacing: '1px', textTransform: 'uppercase' }}>{c.label}</button>
        ))}
      </div>

      {/* Recipe cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: RADIUS_CARD }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <ChefHat size={32} color={TEXT_MUTED} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, color: TEXT_MUTED }}>Aucune recette. Genere-en une !</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {filtered.map(recipe => (
            <button key={recipe.id} onClick={() => setSelected(recipe)} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: '14px 12px', textAlign: 'left', cursor: 'pointer', transition: 'all 150ms', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.82rem', fontFamily: FONT_BODY, fontWeight: 400, color: TEXT_PRIMARY, lineHeight: 1.2 }}>{recipe.title}</div>
              <div style={{ fontSize: '0.65rem', fontFamily: FONT_ALT, fontWeight: 700, color: TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: GOLD }}>{recipe.calories_per_serving} kcal</span>
                <span>P{recipe.proteins_per_serving}g</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(recipe.tags || []).slice(0, 2).map((t: string) => (
                  <span key={t} style={{ fontSize: '0.52rem', fontWeight: 800, fontFamily: FONT_ALT, color: GOLD, background: GOLD_DIM, borderRadius: 0, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t}</span>
                ))}
                {recipe.prep_time_min && <span style={{ fontSize: '0.52rem', fontFamily: FONT_BODY, color: TEXT_MUTED }}>🕐 {recipe.prep_time_min + (recipe.cook_time_min || 0)}min</span>}
              </div>
              {recipe.is_favorite && <Heart size={10} color={RED} fill={RED} style={{ position: 'absolute', top: 8, right: 8 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
