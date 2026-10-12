'use client'
import { AiConsentDeclinedError } from '@/lib/ai/consent-policy'
import { aiFetch } from '@/lib/ai/consent-client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Heart, Clock, Sparkles, ChefHat } from 'lucide-react'
import { toast } from 'sonner'
import { colors, fonts } from '../../lib/app-design-tokens'

import styles from './NutritionLibrary.module.css'

const CATEGORY_IDS = ['all', 'petit-dejeuner', 'dejeuner', 'collation', 'diner', 'smoothie'] as const


interface RecipesSectionProps {
  supabase: any
  userId: string
  aiAllowed: boolean
}

export default function RecipesSection({ supabase, userId, aiAllowed }: RecipesSectionProps) {
  const t = useTranslations('recipesSection')
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genCategory, setGenCategory] = useState('dejeuner')

  useEffect(() => { loadRecipes() }, [])

  async function loadRecipes() {
    setLoading(true)
    setLoadError(false)
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      setRecipes([])
      setLoadError(true)
    } else {
      setRecipes(data || [])
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? recipes : recipes.filter(r => r.category === filter)

  async function generateRecipe() {
    setGenerating(true)
    try {
      const res = await aiFetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: genCategory }),
      }, userId)
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
      toast.success(t('generated'))
    } catch (error) {
      if (!(error instanceof AiConsentDeclinedError)) toast.error(t('genError'))
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
    toast.success(t('deleted'))
  }

  // -- Recipe detail modal --
  if (selected) {
    const ingredients = Array.isArray(selected.ingredients) ? selected.ingredients : []
    const instructions = Array.isArray(selected.instructions) ? selected.instructions : []

    return (
      <div className={styles.library} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Back button */}
        <button onClick={() => setSelected(null)} style={{ alignSelf: 'flex-start', background: colors.surface2, backdropFilter: 'blur(8px)', border: `1px solid ${colors.divider}`, borderRadius: 10, color: colors.text, cursor: 'pointer', fontSize: 14, fontFamily: fonts.alt, fontWeight: 700, padding: '6px 14px', letterSpacing: 'normal', transition: 'all 0.15s' }}>{t('backToRecipes')}</button>

        {/* Title + favorite */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: fonts.headline, fontSize: 28, fontWeight: 700, color: colors.text, margin: '0 0 4px', textTransform: 'none', letterSpacing: 'normal' }}>{selected.title}</h2>
            {selected.description && <p style={{ fontSize: 14, fontFamily: fonts.body, fontWeight: 400, color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>{selected.description}</p>}
          </div>
          <button aria-label={t('favorite')} aria-pressed={!!selected.is_favorite} onClick={() => toggleFavorite(selected)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
            <Heart size={22} color={selected.is_favorite ? colors.error : colors.textMuted} fill={selected.is_favorite ? colors.error : 'none'} />
          </button>
        </div>

        {/* Macros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {[
            { l: 'Kcal', v: selected.calories_per_serving, c: colors.gold },
            { l: 'Prot', v: `${selected.proteins_per_serving}g`, c: colors.gold },
            { l: 'Gluc', v: `${selected.carbs_per_serving}g`, c: colors.gold },
            { l: 'Lip', v: `${selected.fat_per_serving}g`, c: colors.gold },
          ].map(m => (
            <div key={m.l} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 700, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: 14, fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 700, textTransform: 'none', letterSpacing: 'normal' }}>{m.l}</div>
            </div>
          ))}
        </div>

        {/* Time + tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {(selected.prep_time_min || selected.cook_time_min) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontFamily: fonts.body, color: colors.textMuted }}>
              <Clock size={12} /> {(selected.prep_time_min || 0) + (selected.cook_time_min || 0)} min
            </span>
          )}
          {(selected.tags || []).map((t: string) => (
            <span key={t} style={{ fontSize: 14, fontWeight: 800, fontFamily: fonts.alt, color: colors.gold, background: colors.goldDim, borderRadius: 12, padding: '2px 8px', textTransform: 'none', letterSpacing: 'normal' }}>{t}</span>
          ))}
        </div>

        {/* Ingredients */}
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 16 }}>
          <div style={{ fontFamily: fonts.alt, fontSize: 14, fontWeight: 800, color: colors.gold, textTransform: 'none', letterSpacing: 'normal', marginBottom: 12 }}>{t('ingredients', { count: selected.servings || 1 })}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ingredients.map((ing: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontFamily: fonts.body, fontWeight: 400, color: colors.text }}>{ing.name}</span>
                <span style={{ fontSize: 14, fontFamily: fonts.headline, color: colors.gold, fontWeight: 700 }}>{ing.quantity_g}g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 16 }}>
          <div style={{ fontFamily: fonts.alt, fontSize: 14, fontWeight: 800, color: colors.gold, textTransform: 'none', letterSpacing: 'normal', marginBottom: 12 }}>{t('preparation')}</div>
          <div className={styles.library} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {instructions.map((step: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, border: `1.5px solid ${colors.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: colors.gold, fontFamily: fonts.headline, fontWeight: 700, flexShrink: 0 }}>{step.step || i + 1}</div>
                <p style={{ fontSize: 14, fontFamily: fonts.body, fontWeight: 400, color: colors.textMuted, lineHeight: 1.55, margin: 0 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delete */}
        {selected.user_id === userId && (
          <button onClick={() => deleteRecipe(selected.id)} style={{ background: 'none', border: `1px solid ${colors.error}`, borderRadius: 12, padding: '10px', color: colors.error, fontSize: 14, fontFamily: fonts.alt, fontWeight: 700, cursor: 'pointer', letterSpacing: 'normal' }}>{t('deleteRecipe')}</button>
        )}
      </div>
    )
  }

  // -- Generate modal --
  if (showGenerate) {
    return (
      <div className={styles.library} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <button onClick={() => setShowGenerate(false)} style={{ alignSelf: 'flex-start', background: colors.surface2, backdropFilter: 'blur(8px)', border: `1px solid ${colors.divider}`, borderRadius: 10, color: colors.text, cursor: 'pointer', fontSize: 14, fontFamily: fonts.alt, fontWeight: 700, padding: '6px 14px', letterSpacing: 'normal', transition: 'all 0.15s' }}>{t('back')}</button>

        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Sparkles size={28} color={colors.gold} style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 700, color: colors.text, margin: 0, letterSpacing: 'normal' }}>{t('generateTitle')}</h3>
          <p style={{ fontSize: 14, fontFamily: fonts.body, fontWeight: 400, color: colors.textMuted, margin: '4px 0 0' }}>{t('generateDesc')}</p>
        </div>

        <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 16 }}>
          <div style={{ fontSize: 14, fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, textTransform: 'none', letterSpacing: 'normal', marginBottom: 8 }}>{t('category')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORY_IDS.filter(id => id !== 'all').map(catId => (
              <button key={catId} aria-pressed={genCategory === catId} onClick={() => setGenCategory(catId)} style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                fontSize: 14, fontWeight: 700, fontFamily: fonts.alt, letterSpacing: 'normal', textTransform: 'none' as const,
                background: genCategory === catId ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${genCategory === catId ? colors.gold : 'rgba(255,255,255,0.1)'}`,
                color: genCategory === catId ? colors.gold : colors.textDim,
              }}>{t(`categories.${catId}`)}</button>
            ))}
          </div>
        </div>

        <button onClick={generateRecipe} disabled={generating} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: colors.gold, color: colors.onGold, fontFamily: fonts.alt, fontSize: '1rem', fontWeight: 800, letterSpacing: 'normal', textTransform: 'none', opacity: generating ? 0.6 : 1 }}>
          {generating ? t('generating') : t('generate')}
        </button>
      </div>
    )
  }

  // -- Main list view --
  return (
    <div className={styles.library} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontFamily: fonts.headline, fontSize: 24, fontWeight: 700, color: colors.text, margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>{t('title')}</h2>
        {aiAllowed && <button onClick={() => setShowGenerate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: colors.gold, color: colors.onGold, fontSize: 14, fontWeight: 800, fontFamily: fonts.alt, letterSpacing: 'normal', textTransform: 'none' }}>
          <Sparkles size={13} /> {t('generateBtn')}
        </button>}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {CATEGORY_IDS.map(catId => (
          <button key={catId} aria-pressed={filter === catId} onClick={() => setFilter(catId)} style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
            fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: fonts.alt, letterSpacing: 'normal', textTransform: 'none' as const,
            background: filter === catId ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${filter === catId ? colors.gold : 'rgba(255,255,255,0.1)'}`,
            color: filter === catId ? colors.gold : colors.textDim,
          }}>{t(`categories.${catId}`)}</button>
        ))}
      </div>

      {/* Recipe cards */}
      {loading ? (
        <div className={styles.recipeGrid}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 20 }} />)}
        </div>
      ) : loadError ? (
        <div role="status" style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 14, fontFamily: fonts.body, color: colors.textMuted }}>{t('loadError')}</p>
          <button type="button" onClick={() => void loadRecipes()} style={{ minHeight: 44, padding: '8px 14px', borderRadius: 10, border: `1px solid ${colors.goldBorder}`, color: colors.gold, background: 'transparent', cursor: 'pointer' }}>{t('retry')}</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <ChefHat size={32} color={colors.textMuted} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 14, fontFamily: fonts.body, color: colors.textMuted }}>{t('empty')}</p>
        </div>
      ) : (
        <div className={styles.recipeGrid}>
          {filtered.map(recipe => (
            <button key={recipe.id} onClick={() => setSelected(recipe)} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 20, padding: 20, textAlign: 'left', cursor: 'pointer', transition: 'all 150ms', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
              <div style={{ fontSize: 16, fontFamily: fonts.body, fontWeight: 700, color: colors.text, lineHeight: 1.4 }}>{recipe.title}</div>
              <div style={{ fontSize: 14, fontFamily: fonts.alt, fontWeight: 700, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: colors.gold }}>{recipe.calories_per_serving} kcal</span>
                <span>P{recipe.proteins_per_serving}g</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(recipe.tags || []).slice(0, 2).map((t: string) => (
                  <span key={t} style={{ fontSize: 14, fontWeight: 800, fontFamily: fonts.alt, color: colors.gold, background: colors.goldDim, borderRadius: 12, padding: '1px 5px', textTransform: 'none', letterSpacing: 'normal' }}>{t}</span>
                ))}
                {recipe.prep_time_min && <span style={{ fontSize: 14, fontFamily: fonts.body, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 2 }}><Clock size={8} color={colors.textMuted} /> {recipe.prep_time_min + (recipe.cook_time_min || 0)}min</span>}
              </div>
              {recipe.is_favorite && <Heart size={10} color={colors.error} fill={colors.error} style={{ position: 'absolute', top: 8, right: 8 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
