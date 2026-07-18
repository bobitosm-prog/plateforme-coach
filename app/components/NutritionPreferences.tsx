'use client'
import { useEffect, useMemo, useState } from 'react'
import { useNutritionGoals } from '../hooks/nutrition'
import { useTranslations, useLocale } from 'next-intl'
import { Check, Flame, Beef, Wheat, Droplets, X, AlertTriangle, Zap, Search, Plus } from 'lucide-react'
import { ACTIVITY_LEVELS, calcMifflinStJeor, colors, fonts } from '../../lib/design-tokens'
import { updateProfile } from '../../lib/profile-service'
import { MEAL_KEYS, MEAL_DEFAULTS, MEAL_EMOJIS } from '../../lib/meal-plan/meal-suggestions'

// ─── Constants ───

const OBJECTIVE_IDS = ['cut', 'maintain', 'bulk'] as const
const OBJECTIVE_EMOJIS: Record<string, string> = { cut: '🔥', maintain: '⚖️', bulk: '💪' }

const DIET_IDS = ['omnivore', 'vegetarian', 'vegan', 'gluten_free', 'lactose_free', 'keto', 'paleo', 'mediterranean', 'halal', 'kosher'] as const

const ALLERGY_IDS = ['gluten', 'lactose', 'eggs', 'tree_nuts', 'peanuts', 'soy', 'fish', 'shellfish', 'sesame'] as const

type MacroMode = 'auto' | 'manual' | 'ratio'
type ObjectiveType = 'cut' | 'maintain' | 'bulk'

// ─── Helpers ───

function normalizeObjective(obj: string | undefined): ObjectiveType {
  if (!obj) return 'maintain'
  if (['cut', 'seche', 'perte_poids', 'weight_loss'].includes(obj)) return 'cut'
  if (['bulk', 'prise_masse', 'mass'].includes(obj)) return 'bulk'
  return 'maintain'
}

function fmtNum(n: number) { return n.toLocaleString() }

// ─── Component ───

interface NutritionPreferencesProps {
  profile: any
  supabase: any
  userId: string
  onSaved: () => void
  onPlanRegenerated?: () => void
}

export default function NutritionPreferences({ profile, supabase, userId, onSaved, onPlanRegenerated }: NutritionPreferencesProps) {
  const persistedGoals = useNutritionGoals(profile)
  const t = useTranslations('nutritionPrefs')
  // ─── Body Data ───
  const [weight, setWeight] = useState<number>(profile?.current_weight || 0)
  const [targetWeight, setTargetWeight] = useState<number>(profile?.target_weight || 0)
  const [height, setHeight] = useState<number>(profile?.height || 0)
  const [gender, setGender] = useState<string>(profile?.gender || 'male')

  // ─── Metabolisme ───
  const [activityLevel, setActivityLevel] = useState<string>(profile?.activity_level || 'moderate')
  const [objective, setObjective] = useState<ObjectiveType>(normalizeObjective(profile?.objective))
  const [adjustment, setAdjustment] = useState<number>(() => {
    const obj = normalizeObjective(profile?.objective)
    if (obj === 'cut') return -400
    if (obj === 'bulk') return 300
    return 0
  })

  // ─── Macros ───
  const [macroMode, setMacroMode] = useState<MacroMode>('auto')
  const [manualProtein, setManualProtein] = useState<number>(persistedGoals.values.protein ?? 150)
  const [manualCarbs, setManualCarbs] = useState<number>(persistedGoals.values.carbs ?? 200)
  const [manualFat, setManualFat] = useState<number>(persistedGoals.values.fat ?? 60)
  const [ratioProtein, setRatioProtein] = useState(30)
  const [ratioCarbs, setRatioCarbs] = useState(45)
  const [ratioFat, setRatioFat] = useState(25)

  // ─── Diet ───
  const [dietaryType, setDietaryType] = useState<string>(profile?.dietary_type || 'omnivore')
  const [allergies, setAllergies] = useState<string[]>(profile?.allergies || [])
  const [dislikedFoods, setDislikedFoods] = useState<string[]>(profile?.meal_preferences?.disliked_foods || [])
  const [dislikedInput, setDislikedInput] = useState('')

  // ─── Meal Preferences ───
  const [mealPrefs, setMealPrefs] = useState<Record<string, string[]>>(() => {
    const mp = profile?.meal_preferences
    if (mp && typeof mp === 'object' && !Array.isArray(mp)) return mp
    return { breakfast: [], snack: [], lunch: [], dinner: [] }
  })
  const [mealSearchQuery, setMealSearchQuery] = useState('')
  const [mealSearchResults, setMealSearchResults] = useState<any[]>([])
  const [activeMealTab, setActiveMealTab] = useState<string>('breakfast')

  // ─── UI State ───
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [showRegenCard, setShowRegenCard] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // ─── Age Calculation ───
  const age = useMemo(() => {
    const bd = profile?.birth_date
    if (!bd) return 0
    return Math.floor((Date.now() - new Date(bd).getTime()) / 31557600000)
  }, [profile?.birth_date])

  // ─── BMR & TDEE ───
  const bmr = useMemo(() => {
    if (!weight || !height || !age) return 0
    return Math.round(calcMifflinStJeor(weight, height, age, gender))
  }, [weight, height, age, gender])

  const actMult = ACTIVITY_LEVELS.find(l => l.id === activityLevel)?.mult || 1.55
  const tdee = Math.round(bmr * actMult)

  // ─── Objective Calories ───
  const objectiveKcal = useMemo(() => {
    if (!tdee) return 0
    if (objective === 'maintain') return tdee
    return tdee + adjustment
  }, [tdee, objective, adjustment])

  // ─── Auto Macros ───
  const autoMacros = useMemo(() => {
    if (!objectiveKcal || !weight) return { protein: 0, carbs: 0, fat: 0 }
    let protMultiplier = 2.0
    let fatPct = 0.30
    if (objective === 'cut') { protMultiplier = 2.4; fatPct = 0.25 }
    else if (objective === 'bulk') { protMultiplier = 2.2; fatPct = 0.25 }
    const protein = Math.round(protMultiplier * weight)
    const fat = Math.round((objectiveKcal * fatPct) / 9)
    const carbs = Math.round((objectiveKcal - protein * 4 - fat * 9) / 4)
    return { protein, carbs: Math.max(carbs, 0), fat }
  }, [objectiveKcal, weight, objective])

  // ─── Ratio Macros ───
  const ratioMacros = useMemo(() => {
    const protein = Math.round((objectiveKcal * ratioProtein / 100) / 4)
    const carbs = Math.round((objectiveKcal * ratioCarbs / 100) / 4)
    const fat = Math.round((objectiveKcal * ratioFat / 100) / 9)
    return { protein, carbs, fat }
  }, [objectiveKcal, ratioProtein, ratioCarbs, ratioFat])

  // ─── Final Macros (based on mode) ───
  const finalMacros = macroMode === 'auto' ? autoMacros : macroMode === 'ratio' ? ratioMacros : { protein: manualProtein, carbs: manualCarbs, fat: manualFat }
  const manualTotalKcal = finalMacros.protein * 4 + finalMacros.carbs * 4 + finalMacros.fat * 9
  const kcalDiff = Math.abs(manualTotalKcal - objectiveKcal)

  // ─── Weekly estimate ───
  const weeklyChange = useMemo(() => {
    if (objective === 'maintain') return null
    const dailyDiff = objective === 'cut' ? adjustment : adjustment
    const weeklyKg = Math.round(Math.abs(dailyDiff) * 7 / 7700 * 10) / 10
    return weeklyKg
  }, [objective, adjustment])

  // ─── Handlers ───
  function handleObjectiveChange(obj: ObjectiveType) {
    setObjective(obj)
    if (obj === 'cut') setAdjustment(-400)
    else if (obj === 'bulk') setAdjustment(300)
    else setAdjustment(0)
  }

  function addDislikedFood(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const val = dislikedInput.trim()
    if (!val || dislikedFoods.includes(val)) return
    setDislikedFoods(prev => [...prev, val])
    setDislikedInput('')
  }

  function handleRatioChange(which: 'protein' | 'carbs' | 'fat', val: number) {
    if (which === 'protein') {
      const remaining = 100 - val
      const carbsNew = Math.round(remaining * ratioCarbs / (ratioCarbs + ratioFat) || remaining / 2)
      setRatioProtein(val)
      setRatioCarbs(carbsNew)
      setRatioFat(remaining - carbsNew)
    } else if (which === 'carbs') {
      const remaining = 100 - val
      const protNew = Math.round(remaining * ratioProtein / (ratioProtein + ratioFat) || remaining / 2)
      setRatioCarbs(val)
      setRatioProtein(protNew)
      setRatioFat(remaining - protNew)
    } else {
      const remaining = 100 - val
      const protNew = Math.round(remaining * ratioProtein / (ratioProtein + ratioCarbs) || remaining / 2)
      setRatioFat(val)
      setRatioProtein(protNew)
      setRatioCarbs(remaining - protNew)
    }
  }

  // ─── Meal Prefs Handlers ───
  function toggleMealFood(meal: string, food: string) {
    setMealPrefs(prev => {
      const list = prev[meal] || []
      const updated = list.includes(food) ? list.filter(f => f !== food) : [...list, food]
      return { ...prev, [meal]: updated }
    })
  }

  // Debounced food search — fitness first, then ANSES
  useEffect(() => {
    if (mealSearchQuery.length < 2) { setMealSearchResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const [{ data: fitness }, { data: anses }] = await Promise.all([
          supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').eq('source', 'fitness').ilike('name', `%${mealSearchQuery}%`).limit(10),
          supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').eq('source', 'ANSES').ilike('name', `%${mealSearchQuery}%`).limit(10),
        ])
        const data = [...(fitness || []), ...(anses || [])]
        const results = data.map((f: any) => ({
          id: f.id,
          name: f.name,
          source: f.source,
          calories_per_100g: Math.round(f.energy_kcal || 0),
          protein_per_100g: Math.round((f.proteins || 0) * 10) / 10,
        }))
        setMealSearchResults(results)
      } catch { setMealSearchResults([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [mealSearchQuery])

  function addSearchedFood(name: string) {
    setMealPrefs(prev => {
      const list = prev[activeMealTab] || []
      if (list.includes(name)) return prev
      return { ...prev, [activeMealTab]: [...list, name] }
    })
    setMealSearchQuery('')
    setMealSearchResults([])
  }

  // ─── Save ───
  async function save() {
    setSaving(true)
    const objMap: Record<ObjectiveType, string> = { cut: 'cut', maintain: 'maintain', bulk: 'mass' }
    const { data, error } = await updateProfile(userId, {
      calorie_goal: objectiveKcal,
      protein_goal: finalMacros.protein,
      carbs_goal: finalMacros.carbs,
      fat_goal: finalMacros.fat,
      tdee,
      objective: objMap[objective],
      activity_level: activityLevel,
      dietary_type: dietaryType,
      allergies,
      meal_preferences: { ...mealPrefs, disliked_foods: dislikedFoods },
      current_weight: weight,
      target_weight: targetWeight,
      height,
      gender,
    }, supabase)
    setSaving(false)
    if (error) {
      console.error('Save error:', error)
      setToastMsg('Erreur: ' + error.message)
      setTimeout(() => setToastMsg(''), 3000)
      return
    }
    setToastMsg('Preferences sauvegardees !')
    setTimeout(() => setToastMsg(''), 2500)
    onSaved()
    setShowRegenCard(true)
  }

  // ─── Regenerate Meal Plan ───
  async function regeneratePlan() {
    setRegenerating(true)
    setToastMsg('Generation en cours...')
    try {
      const objMap: Record<ObjectiveType, string> = { cut: 'seche', maintain: 'maintien', bulk: 'bulk' }
      const kcal = objectiveKcal || profile?.calorie_goal || 2200
      const res = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calorie_goal: objectiveKcal || profile?.calorie_goal || 2200,
          protein_goal: finalMacros.protein || profile?.protein_goal || 150,
          carbs_goal: finalMacros.carbs,
          fat_goal: finalMacros.fat,
          dietary_type: dietaryType,
          allergies,
          disliked_foods: dislikedFoods,
          // disliked_foods is sent to the API but not stored as a column in profiles
          objective_mode: objMap[objective],
          caloric_adjustment: objective === 'maintain' ? 0 : adjustment,
          tdee,
          activity_level: activityLevel,
          meal_food_names: {
            morning: mealPrefs.breakfast || [],
            lunch: mealPrefs.lunch || [],
            snack: mealPrefs.snack || [],
            dinner: mealPrefs.dinner || [],
          },
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        console.error('generate-meal-plan HTTP error:', res.status, errText)
        throw new Error(`HTTP ${res.status}`)
      }
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')
      const decoder = new TextDecoder()
      let planData: any = null
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'progress') setToastMsg(`Generation ${parsed.day}... (${parsed.index}/7)`)
            if (parsed.type === 'error') { console.error('SSE error:', parsed.error); throw new Error(parsed.error) }
            if (parsed.type === 'done') planData = parsed.plan
          } catch (e) { if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e }
        }
      }
      if (!planData) {
        setToastMsg('Generation echouee — aucun plan recu')
        setTimeout(() => setToastMsg(''), 3000)
      } else {
        // Deactivate old plans first
        await supabase.from('meal_plans').update({ is_active: false }).eq('user_id', userId).eq('is_active', true)
        // Insert new plan
        const { error: insertErr } = await supabase.from('meal_plans').insert({
          user_id: userId,
          plan_data: planData,
          is_active: true,
        })
        if (insertErr) {
          console.error('Insert meal_plans error:', insertErr)
          setToastMsg('Erreur: ' + insertErr.message)
          setTimeout(() => setToastMsg(''), 3000)
        } else {
          setToastMsg('Plan regenere !')
          setTimeout(() => setToastMsg(''), 2500)
          onSaved()
          onPlanRegenerated?.()
        }
      }
    } catch (err) {
      console.error('Regen error:', err)
      setToastMsg('Erreur lors de la generation')
      setTimeout(() => setToastMsg(''), 3000)
    }
    setRegenerating(false)
    setShowRegenCard(false)
  }

  // ─── Styles ───
  const sectionTitle: React.CSSProperties = { fontFamily: fonts.alt, fontSize: '0.78rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: colors.gold, marginBottom: 14 }
  const cardStyle: React.CSSProperties = { background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 16, marginBottom: 16 }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: colors.background, border: `1px solid ${colors.divider}`, borderRadius: 12, color: colors.text, fontSize: '0.88rem', fontFamily: fonts.body, outline: 'none' }
  const sliderThumbGold = `
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: ${colors.gold}; cursor: pointer; border: 2px solid #080808; }
    input[type=range]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: ${colors.gold}; cursor: pointer; border: 2px solid #080808; }
    input[type=range] { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.05); outline: none; }
    input[type=range]::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; }
  `

  const canCalc = weight > 0 && height > 0 && age > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{sliderThumbGold}</style>

      {/* ═══ SECTION 1 — METABOLISME & OBJECTIF ═══ */}
      <div style={cardStyle}>
        <div style={sectionTitle}>{t('sections.metabolism')}</div>

        {canCalc ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: colors.background, border: `1px solid ${colors.divider}`, padding: 14 }}>
              <div style={{ fontSize: '0.6rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>{t('sections.bmr')}</div>
              <div style={{ fontFamily: fonts.headline, fontSize: '1.5rem', color: colors.text, lineHeight: 1 }}>{fmtNum(bmr)} <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>kcal/jour</span></div>
            </div>
            <div style={{ background: colors.goldDim, border: `1.5px solid ${colors.goldRule}`, padding: 14 }}>
              <div style={{ fontSize: '0.6rem', fontFamily: fonts.alt, color: colors.gold, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>{t('sections.tdee')}</div>
              <div style={{ fontFamily: fonts.headline, fontSize: '1.5rem', color: colors.text, lineHeight: 1 }}>{fmtNum(tdee)} <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>kcal/jour</span></div>
              <div style={{ fontSize: '0.62rem', fontFamily: fonts.body, color: colors.textMuted, marginTop: 4 }}>{t('sections.basedOn', { activity: ACTIVITY_LEVELS.find(l => l.id === activityLevel)?.label || '' })}</div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.82rem', fontFamily: fonts.body, color: colors.textMuted, textAlign: 'center', marginBottom: 16 }}>{t('sections.fillData')}</p>
        )}

        {/* Objective Cards */}
        <div style={{ fontSize: '0.65rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>{t('sections.objective')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {OBJECTIVE_IDS.map(objId => {
            const active = objective === objId
            return (
              <button key={objId} onClick={() => handleObjectiveChange(objId)} style={{ padding: '14px 8px', background: active ? colors.goldDim : colors.background, border: `2px solid ${active ? colors.gold : colors.divider}`, borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 150ms' }}>
                <span style={{ fontSize: '1.6rem' }}>{OBJECTIVE_EMOJIS[objId]}</span>
                <span style={{ fontFamily: fonts.alt, fontSize: '0.82rem', fontWeight: 800, color: active ? colors.gold : colors.text, letterSpacing: '1px' }}>{t(`objectives.${objId}.label`)}</span>
                <span style={{ fontSize: '0.65rem', fontFamily: fonts.body, color: colors.textMuted, textAlign: 'center', lineHeight: 1.2 }}>{t(`objectives.${objId}.desc`)}</span>
                <span style={{ fontSize: '0.6rem', fontFamily: fonts.alt, color: active ? colors.gold : colors.textDim, fontWeight: 700, letterSpacing: '0.5px' }}>{t(`objectives.${objId}.sub`)}</span>
              </button>
            )
          })}
        </div>

        {/* Adjustment Slider */}
        {objective === 'cut' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.68rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 700, letterSpacing: '1px' }}>{t('labels.deficit')}</span>
              <span style={{ fontSize: '0.8rem', fontFamily: fonts.headline, color: colors.gold }}>{adjustment} kcal</span>
            </div>
            <input type="range" min={-700} max={-200} step={50} value={adjustment} onChange={e => setAdjustment(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: '0.58rem', fontFamily: fonts.body, color: colors.textDim }}>Seche douce (-200)</span>
              <span style={{ fontSize: '0.58rem', fontFamily: fonts.body, color: colors.textDim }}>Agressive (-700)</span>
            </div>
            {adjustment < -500 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 10px', background: `${colors.error}12`, border: `1px solid ${colors.error}30` }}>
                <AlertTriangle size={14} color={colors.error} />
                <span style={{ fontSize: '0.72rem', fontFamily: fonts.body, color: colors.error }}>{t('labels.muscleLossRisk')}</span>
              </div>
            )}
          </div>
        )}

        {objective === 'bulk' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.68rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 700, letterSpacing: '1px' }}>{t('labels.surplus')}</span>
              <span style={{ fontSize: '0.8rem', fontFamily: fonts.headline, color: colors.gold }}>+{adjustment} kcal</span>
            </div>
            <input type="range" min={150} max={500} step={50} value={adjustment} onChange={e => setAdjustment(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: '0.58rem', fontFamily: fonts.body, color: colors.textDim }}>Lean bulk (+150)</span>
              <span style={{ fontSize: '0.58rem', fontFamily: fonts.body, color: colors.textDim }}>Agressif (+500)</span>
            </div>
            {adjustment > 400 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 10px', background: `${colors.error}12`, border: `1px solid ${colors.error}30` }}>
                <AlertTriangle size={14} color={colors.error} />
                <span style={{ fontSize: '0.72rem', fontFamily: fonts.body, color: colors.error }}>{t('labels.fatGainRisk')}</span>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {canCalc && objectiveKcal > 0 && (
          <div style={{ background: colors.goldDim, border: `1.5px solid ${colors.goldRule}`, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Zap size={16} color={colors.gold} />
              <span style={{ fontFamily: fonts.alt, fontSize: '0.75rem', fontWeight: 800, color: colors.gold, letterSpacing: '1px', textTransform: 'uppercase' }}>{t('labels.calorieGoal')}</span>
            </div>
            <div style={{ fontFamily: fonts.headline, fontSize: '1.8rem', color: colors.text, lineHeight: 1 }}>{fmtNum(objectiveKcal)} <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>kcal/jour</span></div>
            {objective !== 'maintain' && weeklyChange !== null && (
              <div style={{ fontSize: '0.72rem', fontFamily: fonts.body, color: colors.textMuted, marginTop: 6 }}>
                {objective === 'cut' ? `Deficit : ${adjustment} kcal/jour` : `Surplus : +${adjustment} kcal/jour`} &middot; {objective === 'cut' ? 'Perte' : 'Prise'} estimee : ~{weeklyChange} kg/semaine
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ SECTION 2 — REPARTITION DES MACROS ═══ */}
      <div style={cardStyle}>
        <div style={sectionTitle}>{t('sections.macros')}</div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: `1px solid ${colors.divider}` }}>
          {([['auto', t('labels.auto')], ['manual', t('labels.manual')], ['ratio', t('labels.ratio')]] as [string, string][]).map(([id, label]) => {
            const active = macroMode === id
            return (
              <button key={id} onClick={() => setMacroMode(id as MacroMode)} style={{ flex: 1, padding: '10px 8px', background: active ? colors.gold : colors.background, border: 'none', cursor: 'pointer', fontFamily: fonts.alt, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1px', color: active ? colors.onGold : colors.textMuted, transition: 'all 150ms' }}>
                {label}
              </button>
            )
          })}
        </div>

        {/* AUTO Mode */}
        {macroMode === 'auto' && (
          <div>
            <p style={{ fontSize: '0.72rem', fontFamily: fonts.body, color: colors.textMuted, margin: '0 0 14px', lineHeight: 1.4 }}>
              {t('labels.autoCalc', { mode: t(`objectives.${objective}.label`) })}
            </p>
            <MacroDisplay protein={autoMacros.protein} carbs={autoMacros.carbs} fat={autoMacros.fat} targetKcal={objectiveKcal} />
          </div>
        )}

        {/* MANUAL Mode */}
        {macroMode === 'manual' && (
          <div>
            <MacroSlider label="Proteines" value={manualProtein} min={80} max={300} unit="g" color={colors.gold} onChange={setManualProtein} />
            <MacroSlider label="Glucides" value={manualCarbs} min={50} max={500} unit="g" color={colors.blue} onChange={setManualCarbs} />
            <MacroSlider label="Lipides" value={manualFat} min={30} max={150} unit="g" color={colors.orange} onChange={setManualFat} />
            <div style={{ marginTop: 12 }}>
              <MacroDisplay protein={manualProtein} carbs={manualCarbs} fat={manualFat} targetKcal={objectiveKcal} />
            </div>
            {macroMode === 'manual' && kcalDiff > 50 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 10px', background: `rgba(249,115,22,0.1)`, border: `1px solid rgba(249,115,22,0.3)` }}>
                <AlertTriangle size={14} color={colors.orange} />
                <span style={{ fontSize: '0.72rem', fontFamily: fonts.body, color: colors.orange }}>
                  Total macros : {fmtNum(manualTotalKcal)} kcal ({manualTotalKcal > objectiveKcal ? '+' : ''}{manualTotalKcal - objectiveKcal} vs objectif)
                </span>
              </div>
            )}
          </div>
        )}

        {/* RATIO Mode */}
        {macroMode === 'ratio' && (
          <div>
            <MacroSlider label="Proteines" value={ratioProtein} min={15} max={45} unit="%" color={colors.gold} onChange={v => handleRatioChange('protein', v)} />
            <MacroSlider label="Glucides" value={ratioCarbs} min={20} max={60} unit="%" color={colors.blue} onChange={v => handleRatioChange('carbs', v)} />
            <MacroSlider label="Lipides" value={ratioFat} min={15} max={40} unit="%" color={colors.orange} onChange={v => handleRatioChange('fat', v)} />
            <div style={{ textAlign: 'center', fontSize: '0.68rem', fontFamily: fonts.alt, fontWeight: 800, letterSpacing: '1px', color: ratioProtein + ratioCarbs + ratioFat === 100 ? colors.success : colors.error, marginTop: 4, marginBottom: 12 }}>
              TOTAL : {ratioProtein + ratioCarbs + ratioFat}%
            </div>
            <MacroDisplay protein={ratioMacros.protein} carbs={ratioMacros.carbs} fat={ratioMacros.fat} targetKcal={objectiveKcal} />
          </div>
        )}
      </div>

      {/* ═══ SECTION 3 — REGIME ALIMENTAIRE ═══ */}
      <div style={cardStyle}>
        <div style={sectionTitle}>{t('sections.diet')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DIET_IDS.map(dietId => {
            const opt = { id: dietId }
            const active = dietaryType === opt.id
            return (
              <button key={opt.id} onClick={() => setDietaryType(opt.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: active ? colors.goldDim : colors.background, border: `1.5px solid ${active ? colors.gold : colors.divider}`, borderRadius: 12, cursor: 'pointer', transition: 'all 150ms' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? colors.gold : colors.textDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {active && <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.gold }} />}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{ fontSize: '0.82rem', fontFamily: fonts.body, fontWeight: 500, color: active ? colors.gold : colors.text }}>{t(`diets.${opt.id}.label`)}</span>
                  {(['omnivore', 'vegetarian', 'vegan', 'keto'] as string[]).includes(opt.id) && <span style={{ fontSize: '0.68rem', fontFamily: fonts.body, color: colors.textMuted, marginLeft: 8 }}>{t(`diets.${opt.id}.desc`)}</span>}
                </div>
                {active && <Check size={14} color={colors.gold} strokeWidth={3} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ SECTION 4 — ALLERGIES & EXCLUSIONS ═══ */}
      <div style={cardStyle}>
        <div style={sectionTitle}>{t('sections.diet')}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>
          {ALLERGY_IDS.map(allergyId => {
            const active = allergies.includes(allergyId)
            return (
              <button key={allergyId} onClick={() => setAllergies(prev => prev.includes(allergyId) ? prev.filter(a => a !== allergyId) : [...prev, allergyId])} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: active ? `${colors.error}15` : colors.background, border: `1.5px solid ${active ? colors.error : colors.divider}`, borderRadius: 12, cursor: 'pointer', transition: 'all 150ms' }}>
                <div style={{ width: 14, height: 14, border: `1.5px solid ${active ? colors.error : colors.textDim}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: active ? colors.error : 'transparent' }}>
                  {active && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: '0.7rem', fontFamily: fonts.body, fontWeight: 400, color: active ? colors.error : colors.text }}>{t(`allergies.${allergyId}`)}</span>
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: '0.65rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Aliments que tu n&apos;aimes pas</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {dislikedFoods.map(food => (
            <span key={food} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: colors.surfaceHigh, border: `1px solid ${colors.divider}`, fontSize: '0.75rem', fontFamily: fonts.body, color: colors.text }}>
              {food}
              <button onClick={() => setDislikedFoods(prev => prev.filter(f => f !== food))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><X size={12} color={colors.textMuted} /></button>
            </span>
          ))}
        </div>
        <input
          value={dislikedInput}
          onChange={e => setDislikedInput(e.target.value)}
          onKeyDown={addDislikedFood}
          placeholder={t('labels.dislikedPlaceholder')}
          style={inputStyle}
        />
      </div>

      {/* ═══ SECTION 5 — ACTIVITE PHYSIQUE ═══ */}
      <div style={cardStyle}>
        <div style={sectionTitle}>{t('sections.activity')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ACTIVITY_LEVELS.map(lvl => {
            const active = activityLevel === lvl.id
            return (
              <button key={lvl.id} onClick={() => setActivityLevel(lvl.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: active ? colors.goldDim : colors.background, border: `1.5px solid ${active ? colors.gold : colors.divider}`, borderRadius: 12, cursor: 'pointer', transition: 'all 150ms' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? colors.gold : colors.textDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {active && <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.gold }} />}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '0.82rem', fontFamily: fonts.body, fontWeight: 500, color: active ? colors.gold : colors.text }}>{lvl.label}</div>
                  <div style={{ fontSize: '0.68rem', fontFamily: fonts.body, color: colors.textMuted }}>{lvl.sub}</div>
                </div>
                <span style={{ fontSize: '0.72rem', fontFamily: fonts.headline, fontWeight: 700, color: active ? colors.gold : colors.textMuted }}>x{lvl.mult}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ SECTION 6 — DONNEES CORPORELLES ═══ */}
      <div style={cardStyle}>
        <div style={sectionTitle}>{t('sections.myData')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: '0.62rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{t('labels.currentWeight')}</label>
            <input type="number" value={weight || ''} onChange={e => setWeight(Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.62rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{t('labels.targetWeight')}</label>
            <input type="number" value={targetWeight || ''} onChange={e => setTargetWeight(Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.62rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{t('labels.height')}</label>
            <input type="number" value={height || ''} onChange={e => setHeight(Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.62rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{t('labels.age')}</label>
            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: colors.textMuted }}>{age > 0 ? `${age} ans` : '---'}</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: '0.62rem', fontFamily: fonts.alt, color: colors.textMuted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{t('labels.gender')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ id: 'male', label: t('labels.male') }, { id: 'female', label: t('labels.female') }].map(g => {
              const active = gender === g.id
              return (
                <button key={g.id} onClick={() => setGender(g.id)} style={{ flex: 1, padding: '10px', background: active ? colors.goldDim : colors.background, border: `2px solid ${active ? colors.gold : colors.divider}`, borderRadius: 12, cursor: 'pointer', fontFamily: fonts.alt, fontSize: '0.82rem', fontWeight: 800, color: active ? colors.gold : colors.text, letterSpacing: '1px', transition: 'all 150ms' }}>
                  {g.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══ SECTION 7 — ALIMENTS PAR REPAS ═══ */}
      <div style={cardStyle}>
        <div style={sectionTitle}>{t('sections.favFoods')}</div>

        {/* Meal tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 14, border: `1px solid ${colors.divider}` }}>
          {MEAL_KEYS.map(key => {
            const mEmoji = MEAL_EMOJIS[key]
            const active = activeMealTab === key
            const count = (mealPrefs[key] || []).length
            return (
              <button key={key} onClick={() => { setActiveMealTab(key); setMealSearchQuery(''); setMealSearchResults([]) }} style={{ flex: 1, padding: '8px 4px', background: active ? colors.gold : colors.background, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 150ms' }}>
                <span style={{ fontSize: '1rem' }}>{mEmoji}</span>
                <span style={{ fontFamily: fonts.alt, fontSize: '0.58rem', fontWeight: 800, color: active ? colors.onGold : colors.textMuted, letterSpacing: '0.5px' }}>{t(`meals.${key}`)}</span>
                {count > 0 && <span style={{ fontSize: '0.52rem', fontFamily: fonts.headline, color: active ? colors.onGold : colors.gold, fontWeight: 700 }}>{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Selected foods for active meal */}
        {(mealPrefs[activeMealTab] || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {(mealPrefs[activeMealTab] || []).filter(f => !MEAL_DEFAULTS[activeMealTab].includes(f)).map(food => (
              <span key={food} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: colors.goldDim, border: `1px solid ${colors.goldRule}`, fontSize: '0.72rem', fontFamily: fonts.body, color: colors.gold }}>
                {food}
                <button onClick={() => toggleMealFood(activeMealTab, food)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><X size={11} color={colors.gold} /></button>
              </span>
            ))}
          </div>
        )}

        {/* Preset checkboxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          {MEAL_DEFAULTS[activeMealTab].map(food => {
            const active = (mealPrefs[activeMealTab] || []).includes(food)
            return (
              <button key={food} onClick={() => toggleMealFood(activeMealTab, food)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: active ? colors.goldDim : colors.background, border: `1.5px solid ${active ? colors.gold : colors.divider}`, borderRadius: 12, cursor: 'pointer', transition: 'all 150ms' }}>
                <div style={{ width: 14, height: 14, border: `1.5px solid ${active ? colors.gold : colors.textDim}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: active ? colors.gold : 'transparent' }}>
                  {active && <Check size={10} color={colors.onGold} strokeWidth={3} />}
                </div>
                <span style={{ fontSize: '0.72rem', fontFamily: fonts.body, fontWeight: 400, color: active ? colors.gold : colors.text, textAlign: 'left' }}>{food}</span>
              </button>
            )
          })}
        </div>

        {/* Search community foods */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...inputStyle, padding: 0 }}>
            <Search size={14} color={colors.textMuted} style={{ marginLeft: 12 }} />
            <input
              value={mealSearchQuery}
              onChange={e => setMealSearchQuery(e.target.value)}
              placeholder={t('labels.addFoodPlaceholder')}
              style={{ flex: 1, padding: '10px 14px 10px 0', background: 'transparent', border: 'none', color: colors.text, fontSize: '0.82rem', fontFamily: fonts.body, outline: 'none' }}
            />
          </div>
          {mealSearchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: colors.surface2, border: `1px solid ${colors.divider}`, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
              {mealSearchResults.map((r: any) => (
                <button key={r.id} onClick={() => addSearchedFood(r.name)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.divider}`, cursor: 'pointer', textAlign: 'left' }}>
                  <Plus size={12} color={colors.gold} />
                  <span style={{ fontSize: '0.78rem', fontFamily: fonts.body, color: colors.text }}>{r.name}</span>
                  {r.source === 'fitness' && <span style={{ fontFamily: fonts.alt, fontSize: 7, fontWeight: 700, letterSpacing: 1, padding: '1px 5px', borderRadius: 4, background: 'rgba(74,222,128,0.12)', color: colors.success, border: '1px solid rgba(74,222,128,0.25)', flexShrink: 0 }}>FITNESS</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ SAVE BUTTON ═══ */}
      <button onClick={save} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: colors.gold, fontFamily: fonts.alt, fontSize: '1rem', fontWeight: 800, color: colors.onGold, letterSpacing: '2px', textTransform: 'uppercase', opacity: saving ? 0.6 : 1, marginBottom: 8 }}>
        {saving ? t('save.saving') : t('save.saveButton')}
      </button>

      {/* ═══ REGEN CARD ═══ */}
      {showRegenCard && (
        <div style={{ background: colors.surface2, border: `1.5px solid ${colors.goldRule}`, padding: 16, marginTop: 8 }}>
          <p style={{ fontFamily: fonts.body, fontSize: '0.82rem', color: colors.text, margin: '0 0 14px', lineHeight: 1.5 }}>
            {t('save.regenPrompt')}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowRegenCard(false)} style={{ flex: 1, padding: '12px', background: colors.background, border: `1px solid ${colors.divider}`, borderRadius: 12, cursor: 'pointer', fontFamily: fonts.alt, fontSize: '0.82rem', fontWeight: 700, color: colors.textMuted, letterSpacing: '1px' }}>
              {t('save.noThanks')}
            </button>
            <button onClick={regeneratePlan} disabled={regenerating} style={{ flex: 1, padding: '12px', background: colors.gold, border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: fonts.alt, fontSize: '0.82rem', fontWeight: 800, color: colors.onGold, letterSpacing: '1px', opacity: regenerating ? 0.6 : 1 }}>
              {regenerating ? t('save.regenerating') : t('save.regenerate')}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: colors.success, color: colors.onGold, padding: '10px 24px', borderRadius: 12, fontFamily: fonts.alt, fontSize: '0.9rem', fontWeight: 800, zIndex: 999, letterSpacing: '1px' }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}

// ─── Macro Display Card ───
function MacroDisplay({ protein, carbs, fat, targetKcal }: { protein: number; carbs: number; fat: number; targetKcal: number }) {
  const t = useTranslations('nutritionPrefs')
  const total = protein * 4 + carbs * 4 + fat * 9
  const pPct = total > 0 ? Math.round(protein * 4 / total * 100) : 0
  const cPct = total > 0 ? Math.round(carbs * 4 / total * 100) : 0
  const fPct = total > 0 ? Math.round(fat * 9 / total * 100) : 0

  return (
    <div style={{ background: colors.background, border: `1px solid ${colors.divider}`, padding: 14 }}>
      {/* Macro bar */}
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: `${pPct}%`, background: colors.gold, transition: 'width 300ms' }} />
        <div style={{ width: `${cPct}%`, background: colors.blue, transition: 'width 300ms' }} />
        <div style={{ width: `${fPct}%`, background: colors.orange, transition: 'width 300ms' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <MacroItem icon={Beef} label={t('labels.protein')} grams={protein} pct={pPct} color={colors.gold} />
        <MacroItem icon={Wheat} label={t('labels.carbs')} grams={carbs} pct={cPct} color={colors.blue} />
        <MacroItem icon={Droplets} label={t('labels.fat')} grams={fat} pct={fPct} color={colors.orange} />
      </div>

      <div style={{ textAlign: 'center', marginTop: 10, fontFamily: fonts.body, fontSize: '0.68rem', color: colors.textMuted }}>
        {fmtNum(total)} kcal
        {targetKcal > 0 && Math.abs(total - targetKcal) <= 50 && <span style={{ color: colors.success, marginLeft: 6 }}>✓</span>}
      </div>
    </div>
  )
}

function MacroItem({ icon: Icon, label, grams, pct, color }: { icon: any; label: string; grams: number; pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={14} color={color} strokeWidth={2.5} />
      </div>
      <div style={{ fontFamily: fonts.headline, fontSize: '1.1rem', color: colors.text, lineHeight: 1 }}>{grams}<span style={{ fontSize: '0.65rem', color: colors.textMuted }}>g</span></div>
      <div style={{ fontSize: '0.58rem', fontFamily: fonts.alt, color: colors.textMuted, letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '0.58rem', fontFamily: fonts.body, color, fontWeight: 600 }}>{pct}%</div>
    </div>
  )
}

// ─── Macro Slider ───
function MacroSlider({ label, value, min, max, unit, color, onChange }: { label: string; value: number; min: number; max: number; unit: string; color: string; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', fontFamily: fonts.alt, color, fontWeight: 700, letterSpacing: '1px' }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontFamily: fonts.headline, color: colors.text }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  )
}
