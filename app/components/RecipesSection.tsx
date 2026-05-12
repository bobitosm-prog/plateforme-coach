'use client'
import { useState, useEffect } from 'react'
import { X, Heart, Clock, Sparkles, ChefHat } from 'lucide-react'
import { toast } from 'sonner'
import { colors, fonts } from '../../lib/design-tokens'

const CATEGORIES = [
  { id: 'all', label: 'Tout' },
  { id: 'petit-dejeuner', label: 'Petit-dej' },
  { id: 'dejeuner', label: 'Dejeuner' },
  { id: 'collation', label: 'Collation' },
  { id: 'diner', label: 'Diner' },
  { id: 'smoothie', label: 'Smoothie' },
]

const TAG_COLORS: Record<string, string> = {
  'high-protein': colors.gold, 'low-carb': colors.gold, 'quick': colors.gold,
  'meal-prep': colors.gold, 'bulk': colors.gold, 'vegan': colors.gold,
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
        <button onClick={() => setSelected(null)} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: colors.text, cursor: 'pointer', fontSize: '0.82rem', fontFamily: fonts.alt, fontWeight: 700, padding: '6px 14px', letterSpacing: '0.15em', transition: 'all 0.15s' }}>← Retour aux recettes</button>

        {/* Title + favorite */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: fonts.headline, fontSize: '1.4rem', fontWeight: 700, color: colors.text, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '2px' }}>{selected.title}</h2>
            {selected.description && <p style={{ fontSize: '0.82rem', fontFamily: fonts.body, fontWeight: 300, color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>{selected.description}</p>}
          </div>
          <button onClick={() => toggleFavorite(selected)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
            <Heart size={22} color={selected.is_favorite ? colors.error : colors.textMuted} fill={selected.is_favorite ? colors.error : 'none'} />
          </button>
        </div>

        {/* Macros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { l: 'Kcal', v: selected.calories_per_serving, c: colors.gold },
            { l: 'Prot', v: `${selected.proteins_per_serving}g`, c: colors.gold },
            { l: 'Gluc', v: `${selected.carbs_per_serving}g`, c: colors.gold },
            { l: 'Lip', v: `${selected.fat_per_serving}g`, c: colors.gold },
          ].map(m => (
            <div key={m.l} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontFamily: fonts.headline, fontSize: '1.2rem', fontWeight: 700, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: '0.55rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{m.l}</div>
            </div>
          ))}
        </div>

        {/* Time + tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {(selected.prep_time_min || selected.cook_time_min) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontFamily: fonts.body, color: colors.textMuted }}>
              <Clock size={12} /> {(selected.prep_time_min || 0) + (selected.cook_time_min || 0)} min
            </span>
          )}
          {(selected.tags || []).map((t: string) => (
            <span key={t} style={{ fontSize: '0.6rem', fontWeight: 800, fontFamily: fonts.alt, color: colors.gold, background: colors.goldDim, borderRadius: 12, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t}</span>
          ))}
        </div>

        {/* Ingredients */}
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontFamily: fonts.alt, fontSize: '0.78rem', fontWeight: 800, color: colors.gold, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>Ingredients ({selected.servings || 1} portion{(selected.servings || 1) > 1 ? 's' : ''})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ingredients.map((ing: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontFamily: fonts.body, fontWeight: 400, color: colors.text }}>{ing.name}</span>
                <span style={{ fontSize: '0.78rem', fontFamily: fonts.headline, color: colors.gold, fontWeight: 700 }}>{ing.quantity_g}g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontFamily: fonts.alt, fontSize: '0.78rem', fontWeight: 800, color: colors.gold, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>Preparation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {instructions.map((step: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, border: `1.5px solid ${colors.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: colors.gold, fontFamily: fonts.headline, fontWeight: 700, flexShrink: 0 }}>{step.step || i + 1}</div>
                <p style={{ fontSize: '0.85rem', fontFamily: fonts.body, fontWeight: 300, color: colors.textMuted, lineHeight: 1.55, margin: 0 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delete */}
        {selected.user_id === userId && (
          <button onClick={() => deleteRecipe(selected.id)} style={{ background: 'none', border: `1px solid ${colors.error}`, borderRadius: 12, padding: '10px', color: colors.error, fontSize: '0.78rem', fontFamily: fonts.alt, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px' }}>Supprimer cette recette</button>
        )}
      </div>
    )
  }

  // -- Generate modal --
  if (showGenerate) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={() => setShowGenerate(false)} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: colors.text, cursor: 'pointer', fontSize: '0.82rem', fontFamily: fonts.alt, fontWeight: 700, padding: '6px 14px', letterSpacing: '0.15em', transition: 'all 0.15s' }}>← Retour</button>

        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Sparkles size={28} color={colors.gold} style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontFamily: fonts.headline, fontSize: '1.2rem', fontWeight: 700, color: colors.text, margin: 0, letterSpacing: '2px' }}>GENERER UNE RECETTE</h3>
          <p style={{ fontSize: '0.78rem', fontFamily: fonts.body, fontWeight: 300, color: colors.textMuted, margin: '4px 0 0' }}>Notre chef cree une recette adaptee a tes macros</p>
        </div>

        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: '0.68rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 8 }}>Categorie</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.filter(c => c.id !== 'all').map(c => (
              <button key={c.id} onClick={() => setGenCategory(c.id)} style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                fontSize: 9, fontWeight: 700, fontFamily: fonts.alt, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
                background: genCategory === c.id ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${genCategory === c.id ? colors.gold : 'rgba(255,255,255,0.1)'}`,
                color: genCategory === c.id ? colors.gold : colors.textDim,
              }}>{c.label}</button>
            ))}
          </div>
        </div>

        <button onClick={generateRecipe} disabled={generating} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: colors.gold, color: '#0D0B08', fontFamily: fonts.alt, fontSize: '1rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', opacity: generating ? 0.6 : 1 }}>
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
        <h2 style={{ fontFamily: fonts.headline, fontSize: '1.1rem', fontWeight: 700, color: colors.text, margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Recettes fitness</h2>
        <button onClick={() => setShowGenerate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: colors.gold, color: '#0D0B08', fontSize: '0.72rem', fontWeight: 800, fontFamily: fonts.alt, letterSpacing: '1px', textTransform: 'uppercase' }}>
          <Sparkles size={13} /> Generer
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
            fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: fonts.alt, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
            background: filter === c.id ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${filter === c.id ? colors.gold : 'rgba(255,255,255,0.1)'}`,
            color: filter === c.id ? colors.gold : colors.textDim,
          }}>{c.label}</button>
        ))}
      </div>

      {/* Recipe cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <ChefHat size={32} color={colors.textMuted} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.85rem', fontFamily: fonts.body, color: colors.textMuted }}>Aucune recette. Genere-en une !</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {filtered.map(recipe => (
            <button key={recipe.id} onClick={() => setSelected(recipe)} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: '14px 12px', textAlign: 'left', cursor: 'pointer', transition: 'all 150ms', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
              <div style={{ fontSize: '0.82rem', fontFamily: fonts.body, fontWeight: 400, color: colors.text, lineHeight: 1.2 }}>{recipe.title}</div>
              <div style={{ fontSize: '0.65rem', fontFamily: fonts.alt, fontWeight: 700, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: colors.gold }}>{recipe.calories_per_serving} kcal</span>
                <span>P{recipe.proteins_per_serving}g</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(recipe.tags || []).slice(0, 2).map((t: string) => (
                  <span key={t} style={{ fontSize: '0.52rem', fontWeight: 800, fontFamily: fonts.alt, color: colors.gold, background: colors.goldDim, borderRadius: 12, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t}</span>
                ))}
                {recipe.prep_time_min && <span style={{ fontSize: '0.52rem', fontFamily: fonts.body, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 2 }}><Clock size={8} color={colors.textMuted} /> {recipe.prep_time_min + (recipe.cook_time_min || 0)}min</span>}
              </div>
              {recipe.is_favorite && <Heart size={10} color={colors.error} fill={colors.error} style={{ position: 'absolute', top: 8, right: 8 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
