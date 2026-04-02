'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Flame, Beef, Wheat, Droplets, Star } from 'lucide-react'
import { ACTIVITY_LEVELS, calcMifflinStJeor, BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, RED, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../lib/design-tokens'

const DIET_OPTIONS = [
  { id: 'omnivore', label: 'Omnivore', emoji: '🥩' },
  { id: 'vegetarian', label: 'Vegetarien', emoji: '🥗' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
] as const

const ALLERGY_OPTIONS = [
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'lactose', label: 'Lactose', emoji: '🥛' },
  { id: 'nuts', label: 'Fruits a coque', emoji: '🥜' },
  { id: 'eggs', label: 'Oeufs', emoji: '🥚' },
  { id: 'soy', label: 'Soja', emoji: '🫘' },
  { id: 'shellfish', label: 'Crustaces', emoji: '🦐' },
] as const

const MEAL_TABS = [
  { id: 'petit_dejeuner', label: 'Matin', emoji: '🌅' },
  { id: 'dejeuner', label: 'Midi', emoji: '☀️' },
  { id: 'collation', label: 'Collation', emoji: '🍎' },
  { id: 'diner', label: 'Diner', emoji: '🌙' },
]

const CATS = [
  { key: 'proteines', label: 'Proteines', icon: '🥩', patterns: ['poulet', 'dinde', 'boeuf', 'bœuf', 'veau', 'porc', 'saumon', 'thon', 'cabillaud', 'crevette', 'oeuf', 'œuf', 'steak', 'filet', 'escalope', 'jambon', 'bacon', 'sardine', 'truite', 'canard', 'agneau', 'poisson', 'viande', 'seitan', 'tofu', 'tempeh'] },
  { key: 'laitiers', label: 'Produits laitiers', icon: '🥛', patterns: ['yaourt', 'fromage', 'skyr', 'cottage', 'mozzarella', 'parmesan', 'lait', 'crème', 'ricotta', 'feta'] },
  { key: 'feculents', label: 'Feculents', icon: '🍚', patterns: ['riz', 'pâtes', 'quinoa', 'patate', 'pomme de terre', 'pain', 'avoine', 'flocon', 'semoule', 'blé', 'sarrasin', 'lentille', 'pois chiche', 'haricot', 'maïs', 'galette', 'wrap', 'toast', 'muesli', 'céréale', 'granola'] },
  { key: 'legumes', label: 'Legumes', icon: '🥦', patterns: ['brocoli', 'épinard', 'courgette', 'tomate', 'concombre', 'salade', 'carotte', 'poivron', 'aubergine', 'chou', 'haricot vert', 'asperge', 'champignon', 'avocat', 'légume', 'betterave'] },
  { key: 'fruits', label: 'Fruits', icon: '🍎', patterns: ['banane', 'pomme', 'fraise', 'myrtille', 'orange', 'kiwi', 'mangue', 'ananas', 'poire', 'raisin', 'datte', 'figue', 'compote'] },
  { key: 'oleagineux', label: 'Oleagineux', icon: '🥜', patterns: ['amande', 'noix', 'cacahuète', 'noisette', 'cajou', 'pistache', 'beurre de', 'graines', 'chia', 'lin'] },
  { key: 'supplements', label: 'Supplements', icon: '💪', patterns: ['whey', 'protéine en', 'caséine', 'barre', 'mass'] },
]

function categorize(name: string) {
  const n = name.toLowerCase()
  for (const cat of CATS) { if (cat.patterns.some(p => n.includes(p))) return cat.key }
  return 'autres'
}

interface NutritionPreferencesProps {
  profile: any
  supabase: any
  userId: string
  onSaved: () => void
}

export default function NutritionPreferences({ profile, supabase, userId, onSaved }: NutritionPreferencesProps) {
  const [dietaryType, setDietaryType] = useState<string>(profile?.dietary_type || 'omnivore')
  const [allergies, setAllergies] = useState<string[]>(profile?.allergies || [])
  const [likedFoods, setLikedFoods] = useState<string[]>(() => {
    const lf = profile?.liked_foods
    return Array.isArray(lf) ? lf : []
  })
  const [mealPrefs, setMealPrefs] = useState<Record<string, string[]>>(() => {
    const mp = profile?.meal_preferences
    if (mp && typeof mp === 'object' && !Array.isArray(mp)) return mp
    return { petit_dejeuner: [], dejeuner: [], collation: [], diner: [] }
  })
  const [activityLevel, setActivityLevel] = useState<string>(profile?.activity_level || 'moderate')
  const [foods, setFoods] = useState<any[]>([])
  const [foodMap, setFoodMap] = useState<Record<string, any>>({})
  const [loadingFoods, setLoadingFoods] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [activeMeal, setActiveMeal] = useState('petit_dejeuner')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat').eq('source', 'fitness').order('name').limit(200).then(({ data }: any) => {
      const mapped = (data || []).map((f: any) => ({
        id: f.id, name: f.name || '',
        kcal: Math.round(f.energy_kcal ?? 0),
        p: Math.round((f.proteins ?? 0) * 10) / 10,
        g: Math.round((f.carbohydrates ?? 0) * 10) / 10,
        l: Math.round((f.fat ?? 0) * 10) / 10,
        cat: categorize(f.name || ''),
      }))
      setFoods(mapped)
      const map: Record<string, any> = {}
      mapped.forEach((f: any) => { map[f.id] = f })
      setFoodMap(map)
      setLoadingFoods(false)
    })
  }, [])

  const tdeeData = useMemo(() => {
    const w = profile?.current_weight
    const h = profile?.height
    const gender = profile?.gender || 'male'
    const birthDate = profile?.birth_date
    if (!w || !h || !birthDate) return null
    const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000)
    if (age <= 0) return null
    const bmr = calcMifflinStJeor(w, h, age, gender)
    const mult = ACTIVITY_LEVELS.find(l => l.id === activityLevel)?.mult || 1.55
    const tdee = Math.round(bmr * mult)
    const objective = profile?.objective || 'maintenance'
    let adjustedKcal = tdee
    if (objective === 'seche' || objective === 'perte_poids' || objective === 'weight_loss') adjustedKcal = tdee - 300
    else if (objective === 'prise_masse' || objective === 'mass') adjustedKcal = tdee + 300
    const proteinG = Math.round(2 * w)
    const fatG = Math.round((adjustedKcal * 0.25) / 9)
    const carbsG = Math.round((adjustedKcal - proteinG * 4 - fatG * 9) / 4)
    return { bmr: Math.round(bmr), tdee, adjustedKcal, proteinG, carbsG, fatG, age }
  }, [profile?.current_weight, profile?.height, profile?.birth_date, profile?.gender, profile?.objective, activityLevel])

  function toggleFood(id: string) {
    setMealPrefs(prev => {
      const meal = prev[activeMeal] || []
      const updated = meal.includes(id) ? meal.filter(f => f !== id) : [...meal, id]
      const next = { ...prev, [activeMeal]: updated }
      const allIds = [...new Set(Object.values(next).flat())]
      setLikedFoods(allIds)
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        supabase.from('profiles').update({ liked_foods: allIds, meal_preferences: next }).eq('id', userId)
        setToast(true)
        setTimeout(() => setToast(false), 1500)
        onSaved()
      }, 800)
      return next
    })
  }

  async function save() {
    setSaving(true)
    const update: Record<string, any> = { dietary_type: dietaryType, allergies, liked_foods: likedFoods, meal_preferences: mealPrefs, activity_level: activityLevel }
    if (tdeeData) {
      update.tdee = tdeeData.adjustedKcal
      update.calorie_goal = tdeeData.adjustedKcal
      update.protein_goal = tdeeData.proteinG
      update.carbs_goal = tdeeData.carbsG
      update.fat_goal = tdeeData.fatG
    }
    await supabase.from('profiles').update(update).eq('id', userId)
    setSaving(false)
    setToast(true)
    onSaved()
    setTimeout(() => setToast(false), 2500)
  }

  const currentMealIds = mealPrefs[activeMeal] || []
  const filtered = searchQ.length >= 1 ? foods.filter(f => f.name.toLowerCase().includes(searchQ.toLowerCase())) : foods
  const grouped = CATS.map(cat => ({ ...cat, foods: filtered.filter(f => f.cat === cat.key) })).filter(g => g.foods.length > 0)
  const autres = filtered.filter(f => f.cat === 'autres')
  if (autres.length > 0) grouped.push({ key: 'autres', label: 'Autres', icon: '🍽️', patterns: [], foods: autres })

  const sectionTitle: React.CSSProperties = { fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Regime */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
        <div style={sectionTitle}>Mon regime</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {DIET_OPTIONS.map(opt => {
            const active = dietaryType === opt.id
            return (
              <button key={opt.id} onClick={() => setDietaryType(opt.id)} style={{ flex: 1, padding: '12px 8px', borderRadius: 0, cursor: 'pointer', background: active ? GOLD_DIM : BG_BASE, border: `2px solid ${active ? GOLD : BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 150ms' }}>
                <span style={{ fontSize: '1.4rem' }}>{opt.emoji}</span>
                <span style={{ fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 800, color: active ? GOLD : TEXT_PRIMARY, letterSpacing: '1px' }}>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Allergies */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
        <div style={sectionTitle}>Allergies & intolerances</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {ALLERGY_OPTIONS.map(opt => {
            const active = allergies.includes(opt.id)
            return (
              <button key={opt.id} onClick={() => setAllergies(prev => prev.includes(opt.id) ? prev.filter(a => a !== opt.id) : [...prev, opt.id])} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 0, cursor: 'pointer', background: active ? `${RED}12` : BG_BASE, border: `1.5px solid ${active ? RED : BORDER}`, transition: 'all 150ms' }}>
                <span style={{ fontSize: '1.1rem' }}>{opt.emoji}</span>
                <span style={{ fontSize: '0.8rem', fontFamily: FONT_BODY, fontWeight: 400, color: active ? RED : TEXT_PRIMARY, flex: 1, textAlign: 'left' }}>{opt.label}</span>
                {active && <Check size={14} color={RED} strokeWidth={3} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Metabolisme */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
        <div style={sectionTitle}>Mon metabolisme</div>
        {profile && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            {[{ label: 'Age', value: tdeeData ? `${tdeeData.age} ans` : '---' }, { label: 'Poids', value: profile.current_weight ? `${profile.current_weight} kg` : '---' }, { label: 'Taille', value: profile.height ? `${profile.height} cm` : '---' }, { label: 'Objectif', value: profile.objective || '---' }].map(({ label, value }) => (
              <div key={label} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 2, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.6rem', fontFamily: FONT_ALT, color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '2px' }}>{label}</div>
                <div style={{ fontSize: '0.85rem', fontFamily: FONT_BODY, color: TEXT_PRIMARY, fontWeight: 400, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: '0.65rem', fontFamily: FONT_ALT, color: TEXT_MUTED, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 8 }}>Niveau d&apos;activite</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {ACTIVITY_LEVELS.map(lvl => {
            const active = activityLevel === lvl.id
            return (
              <button key={lvl.id} onClick={() => setActivityLevel(lvl.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 0, cursor: 'pointer', background: active ? GOLD_DIM : BG_BASE, border: `1.5px solid ${active ? GOLD : BORDER}`, transition: 'all 150ms' }}>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontFamily: FONT_BODY, fontWeight: 400, color: active ? GOLD : TEXT_PRIMARY }}>{lvl.label}</div>
                  <div style={{ fontSize: '0.65rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED }}>{lvl.sub}</div>
                </div>
                <span style={{ fontSize: '0.7rem', fontFamily: FONT_DISPLAY, fontWeight: 700, color: active ? GOLD : TEXT_MUTED }}>x{lvl.mult}</span>
                {active && <Check size={14} color={GOLD} strokeWidth={3} />}
              </button>
            )
          })}
        </div>
        {tdeeData ? (
          <div style={{ background: GOLD_DIM, border: `1.5px solid ${GOLD_RULE}`, borderRadius: 2, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[{ icon: Flame, label: 'Calories/jour', value: `${tdeeData.adjustedKcal}`, unit: 'kcal', color: GOLD }, { icon: Beef, label: 'Proteines', value: `${tdeeData.proteinG}`, unit: 'g', color: GOLD }, { icon: Wheat, label: 'Glucides', value: `${tdeeData.carbsG}`, unit: 'g', color: GOLD }, { icon: Droplets, label: 'Lipides', value: `${tdeeData.fatG}`, unit: 'g', color: GOLD }].map(({ icon: Icon, label, value, unit, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 0, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={color} strokeWidth={2.5} /></div>
                  <div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1 }}>{value}<span style={{ fontSize: '0.7rem', color: TEXT_MUTED, marginLeft: 2 }}>{unit}</span></div>
                    <div style={{ fontSize: '0.6rem', fontFamily: FONT_ALT, color: TEXT_MUTED, letterSpacing: '1px' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.78rem', fontFamily: FONT_BODY, color: TEXT_MUTED, textAlign: 'center', margin: 0 }}>Complete ton profil pour calculer ton metabolisme.</p>
        )}
      </div>

      {/* Aliments par repas */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 16 }}>
        <div style={sectionTitle}>Mes aliments par repas ({likedFoods.length} selectionnes)</div>

        {/* Meal tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {MEAL_TABS.map(t => {
            const active = activeMeal === t.id
            const count = (mealPrefs[t.id] || []).length
            return (
              <button key={t.id} onClick={() => setActiveMeal(t.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 0, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: active ? GOLD : BG_BASE, transition: 'all 150ms' }}>
                <span style={{ fontSize: '1rem' }}>{t.emoji}</span>
                <span style={{ fontFamily: FONT_ALT, fontSize: '0.62rem', fontWeight: 800, color: active ? '#050505' : TEXT_MUTED, letterSpacing: '1px' }}>{t.label}</span>
                {count > 0 && <span style={{ fontSize: '0.52rem', fontFamily: FONT_DISPLAY, color: active ? '#050505' : GOLD, fontWeight: 700 }}>{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Current meal's foods */}
        {(mealPrefs[activeMeal] || []).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(mealPrefs[activeMeal] || []).map((id: string) => {
                const food = foodMap[id]
                if (!food) return <div key={String(id)} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 2, padding: '8px', fontSize: '0.7rem', fontFamily: FONT_BODY, color: TEXT_MUTED }}>{String(id).slice(0, 8)}...</div>
                return <FoodCard key={id} food={food} active onClick={() => toggleFood(id)} />
              })}
            </div>
          </div>
        )}
        {(mealPrefs[activeMeal] || []).length === 0 && !loadingFoods && (
          <p style={{ fontSize: '0.75rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED, textAlign: 'center', padding: '8px 0', marginBottom: 8, fontStyle: 'italic' }}>Aucun aliment pour ce repas. Selectionne ci-dessous.</p>
        )}

        {/* Search + all foods */}
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={`Filtrer ${foods.length} aliments fitness...`}
          style={{ width: '100%', padding: '10px 14px', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, color: TEXT_PRIMARY, fontSize: '0.82rem', fontFamily: FONT_BODY, outline: 'none', marginBottom: 12 }} />

        {loadingFoods ? (
          <p style={{ fontSize: '0.82rem', fontFamily: FONT_BODY, color: TEXT_MUTED, textAlign: 'center', padding: '20px 0' }}>Chargement...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {grouped.map(cat => (
              <div key={cat.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem' }}>{cat.icon}</span>
                  <span style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 800, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '2px' }}>{cat.label} ({cat.foods.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {cat.foods.map((food: any) => <FoodCard key={food.id} food={food} active={currentMealIds.includes(food.id)} onClick={() => toggleFood(food.id)} />)}
                </div>
              </div>
            ))}
            {searchQ.length >= 1 && filtered.length === 0 && (
              <p style={{ fontSize: '0.78rem', fontFamily: FONT_BODY, color: TEXT_MUTED, textAlign: 'center' }}>Aucun resultat</p>
            )}
          </div>
        )}
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 0, border: 'none', cursor: 'pointer', background: GOLD, fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800, color: '#050505', letterSpacing: '1px', textTransform: 'uppercase', opacity: saving ? 0.6 : 1, clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}>
        {saving ? 'Enregistrement...' : 'Enregistrer mes preferences'}
      </button>

      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: GREEN, color: '#050505', padding: '10px 24px', borderRadius: 0, fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 800, zIndex: 999, letterSpacing: '1px' }}>
          Preferences sauvegardees !
        </div>
      )}
    </div>
  )
}

function FoodCard({ food, active, onClick }: { food: any; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: active ? GOLD_DIM : BG_BASE, border: `1.5px solid ${active ? GOLD : BORDER}`, borderRadius: 2, padding: '8px 8px 6px', textAlign: 'left', cursor: 'pointer', transition: 'all 150ms', position: 'relative' }}>
      {active && <span style={{ position: 'absolute', top: 5, right: 6, color: GOLD, fontSize: '0.65rem', fontFamily: FONT_ALT, fontWeight: 800 }}>✓</span>}
      <div style={{ fontSize: '0.72rem', fontFamily: FONT_BODY, fontWeight: 400, color: TEXT_PRIMARY, lineHeight: 1.2, marginBottom: 3, paddingRight: active ? 14 : 0 }}>{food.name}</div>
      <div style={{ display: 'flex', gap: 5, fontSize: '0.55rem', fontFamily: FONT_ALT, fontWeight: 700 }}>
        <span style={{ color: GOLD }}>{food.kcal}</span>
        <span style={{ color: TEXT_MUTED }}>P{food.p}</span>
        <span style={{ color: TEXT_MUTED }}>G{food.g}</span>
        <span style={{ color: TEXT_MUTED }}>L{food.l}</span>
      </div>
    </button>
  )
}
