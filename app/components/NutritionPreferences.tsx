'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Flame, Beef, Wheat, Droplets, Star } from 'lucide-react'
import { ACTIVITY_LEVELS, calcMifflinStJeor } from '../../lib/design-tokens'

const GOLD = '#C9A84C'
const BG = '#0A0A0A'
const CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'

const DIET_OPTIONS = [
  { id: 'omnivore', label: 'Omnivore', emoji: '🥩' },
  { id: 'vegetarian', label: 'Végétarien', emoji: '🥗' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
] as const

const ALLERGY_OPTIONS = [
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'lactose', label: 'Lactose', emoji: '🥛' },
  { id: 'nuts', label: 'Fruits à coque', emoji: '🥜' },
  { id: 'eggs', label: 'Œufs', emoji: '🥚' },
  { id: 'soy', label: 'Soja', emoji: '🫘' },
  { id: 'shellfish', label: 'Crustacés', emoji: '🦐' },
] as const

const MEAL_TABS = [
  { id: 'petit_dejeuner', label: 'Matin', emoji: '🌅' },
  { id: 'dejeuner', label: 'Midi', emoji: '☀️' },
  { id: 'collation', label: 'Collation', emoji: '🍎' },
  { id: 'diner', label: 'Dîner', emoji: '🌙' },
]

const CATS = [
  { key: 'proteines', label: 'Protéines', icon: '🥩', patterns: ['poulet', 'dinde', 'boeuf', 'bœuf', 'veau', 'porc', 'saumon', 'thon', 'cabillaud', 'crevette', 'oeuf', 'œuf', 'steak', 'filet', 'escalope', 'jambon', 'bacon', 'sardine', 'truite', 'canard', 'agneau', 'poisson', 'viande', 'seitan', 'tofu', 'tempeh'] },
  { key: 'laitiers', label: 'Produits laitiers', icon: '🥛', patterns: ['yaourt', 'fromage', 'skyr', 'cottage', 'mozzarella', 'parmesan', 'lait', 'crème', 'ricotta', 'feta'] },
  { key: 'feculents', label: 'Féculents', icon: '🍚', patterns: ['riz', 'pâtes', 'quinoa', 'patate', 'pomme de terre', 'pain', 'avoine', 'flocon', 'semoule', 'blé', 'sarrasin', 'lentille', 'pois chiche', 'haricot', 'maïs', 'galette', 'wrap', 'toast', 'muesli', 'céréale', 'granola'] },
  { key: 'legumes', label: 'Légumes', icon: '🥦', patterns: ['brocoli', 'épinard', 'courgette', 'tomate', 'concombre', 'salade', 'carotte', 'poivron', 'aubergine', 'chou', 'haricot vert', 'asperge', 'champignon', 'avocat', 'légume', 'betterave'] },
  { key: 'fruits', label: 'Fruits', icon: '🍎', patterns: ['banane', 'pomme', 'fraise', 'myrtille', 'orange', 'kiwi', 'mangue', 'ananas', 'poire', 'raisin', 'datte', 'figue', 'compote'] },
  { key: 'oleagineux', label: 'Oléagineux', icon: '🥜', patterns: ['amande', 'noix', 'cacahuète', 'noisette', 'cajou', 'pistache', 'beurre de', 'graines', 'chia', 'lin'] },
  { key: 'supplements', label: 'Suppléments', icon: '💪', patterns: ['whey', 'protéine en', 'caséine', 'barre', 'mass'] },
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
    // Toggle in current meal and liked_foods
    setMealPrefs(prev => {
      const meal = prev[activeMeal] || []
      const updated = meal.includes(id) ? meal.filter(f => f !== id) : [...meal, id]
      const next = { ...prev, [activeMeal]: updated }
      // Derive liked_foods from all meal prefs
      const allIds = [...new Set(Object.values(next).flat())]
      setLikedFoods(allIds)
      // Auto-save with debounce
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

  const sectionTitle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Régime */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
        <div style={sectionTitle}>Mon régime</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {DIET_OPTIONS.map(opt => {
            const active = dietaryType === opt.id
            return (
              <button key={opt.id} onClick={() => setDietaryType(opt.id)} style={{ flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', background: active ? `${GOLD}18` : BG, border: `2px solid ${active ? GOLD : BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 150ms' }}>
                <span style={{ fontSize: '1.4rem' }}>{opt.emoji}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: active ? GOLD : TEXT }}>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Allergies */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
        <div style={sectionTitle}>Allergies & intolérances</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {ALLERGY_OPTIONS.map(opt => {
            const active = allergies.includes(opt.id)
            return (
              <button key={opt.id} onClick={() => setAllergies(prev => prev.includes(opt.id) ? prev.filter(a => a !== opt.id) : [...prev, opt.id])} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: active ? 'rgba(239,68,68,0.08)' : BG, border: `1.5px solid ${active ? '#EF4444' : BORDER}`, transition: 'all 150ms' }}>
                <span style={{ fontSize: '1.1rem' }}>{opt.emoji}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: active ? '#EF4444' : TEXT, flex: 1, textAlign: 'left' }}>{opt.label}</span>
                {active && <Check size={14} color="#EF4444" strokeWidth={3} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Métabolisme */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
        <div style={sectionTitle}>Mon métabolisme</div>
        {profile && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            {[{ label: 'Âge', value: tdeeData ? `${tdeeData.age} ans` : '—' }, { label: 'Poids', value: profile.current_weight ? `${profile.current_weight} kg` : '—' }, { label: 'Taille', value: profile.height ? `${profile.height} cm` : '—' }, { label: 'Objectif', value: profile.objective || '—' }].map(({ label, value }) => (
              <div key={label} style={{ background: BG, borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.6rem', color: MUTED, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: '0.85rem', color: TEXT, fontWeight: 600, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: '0.65rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Niveau d&apos;activité</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {ACTIVITY_LEVELS.map(lvl => {
            const active = activityLevel === lvl.id
            return (
              <button key={lvl.id} onClick={() => setActivityLevel(lvl.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: active ? `${GOLD}15` : BG, border: `1.5px solid ${active ? GOLD : BORDER}`, transition: 'all 150ms' }}>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: active ? GOLD : TEXT }}>{lvl.label}</div>
                  <div style={{ fontSize: '0.65rem', color: MUTED }}>{lvl.sub}</div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: active ? GOLD : MUTED }}>x{lvl.mult}</span>
                {active && <Check size={14} color={GOLD} strokeWidth={3} />}
              </button>
            )
          })}
        </div>
        {tdeeData ? (
          <div style={{ background: `${GOLD}10`, border: `1.5px solid ${GOLD}40`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[{ icon: Flame, label: 'Calories/jour', value: `${tdeeData.adjustedKcal}`, unit: 'kcal', color: '#EF4444' }, { icon: Beef, label: 'Protéines', value: `${tdeeData.proteinG}`, unit: 'g', color: '#3B82F6' }, { icon: Wheat, label: 'Glucides', value: `${tdeeData.carbsG}`, unit: 'g', color: '#F59E0B' }, { icon: Droplets, label: 'Lipides', value: `${tdeeData.fatG}`, unit: 'g', color: '#22C55E' }].map(({ icon: Icon, label, value, unit, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={color} strokeWidth={2.5} /></div>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT, lineHeight: 1 }}>{value}<span style={{ fontSize: '0.7rem', color: MUTED, marginLeft: 2 }}>{unit}</span></div>
                    <div style={{ fontSize: '0.6rem', color: MUTED }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.78rem', color: MUTED, textAlign: 'center', margin: 0 }}>Complète ton profil pour calculer ton métabolisme.</p>
        )}
      </div>

      {/* Aliments par repas */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
        <div style={sectionTitle}>Mes aliments par repas ({likedFoods.length} sélectionnés)</div>

        {/* Meal tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {MEAL_TABS.map(t => {
            const active = activeMeal === t.id
            const count = (mealPrefs[t.id] || []).length
            return (
              <button key={t.id} onClick={() => setActiveMeal(t.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: active ? `${GOLD}20` : BG, transition: 'all 150ms' }}>
                <span style={{ fontSize: '1rem' }}>{t.emoji}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.62rem', fontWeight: 700, color: active ? GOLD : MUTED }}>{t.label}</span>
                {count > 0 && <span style={{ fontSize: '0.52rem', color: GOLD, fontWeight: 700 }}>{count}</span>}
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
                if (!food) return <div key={String(id)} style={{ background: BG, borderRadius: 10, padding: '8px', fontSize: '0.7rem', color: MUTED }}>{String(id).slice(0, 8)}...</div>
                return <FoodCard key={id} food={food} active onClick={() => toggleFood(id)} />
              })}
            </div>
          </div>
        )}
        {(mealPrefs[activeMeal] || []).length === 0 && !loadingFoods && (
          <p style={{ fontSize: '0.75rem', color: MUTED, textAlign: 'center', padding: '8px 0', marginBottom: 8, fontStyle: 'italic' }}>Aucun aliment pour ce repas. Sélectionne ci-dessous.</p>
        )}

        {/* Search + all foods */}
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={`Filtrer ${foods.length} aliments fitness...`}
          style={{ width: '100%', padding: '10px 14px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: '0.82rem', outline: 'none', marginBottom: 12 }} />

        {loadingFoods ? (
          <p style={{ fontSize: '0.82rem', color: MUTED, textAlign: 'center', padding: '20px 0' }}>Chargement...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* By category */}
            {grouped.map(cat => (
              <div key={cat.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem' }}>{cat.icon}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cat.label} ({cat.foods.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {cat.foods.map((food: any) => <FoodCard key={food.id} food={food} active={currentMealIds.includes(food.id)} onClick={() => toggleFood(food.id)} />)}
                </div>
              </div>
            ))}
            {searchQ.length >= 1 && filtered.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: MUTED, textAlign: 'center' }}>Aucun résultat</p>
            )}
          </div>
        )}
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Enregistrement...' : 'Enregistrer mes préférences'}
      </button>

      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#22C55E', color: '#000', padding: '10px 24px', borderRadius: 12, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          Préférences sauvegardées !
        </div>
      )}
    </div>
  )
}

function FoodCard({ food, active, onClick }: { food: any; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: active ? 'rgba(201,168,76,0.08)' : BG, border: `1.5px solid ${active ? GOLD : BORDER}`, borderRadius: 10, padding: '8px 8px 6px', textAlign: 'left', cursor: 'pointer', transition: 'all 150ms', position: 'relative' }}>
      {active && <span style={{ position: 'absolute', top: 5, right: 6, color: GOLD, fontSize: '0.65rem', fontWeight: 700 }}>✓</span>}
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: TEXT, lineHeight: 1.2, marginBottom: 3, paddingRight: active ? 14 : 0 }}>{food.name}</div>
      <div style={{ display: 'flex', gap: 5, fontSize: '0.55rem', fontWeight: 500 }}>
        <span style={{ color: GOLD }}>{food.kcal}</span>
        <span style={{ color: '#60a5fa' }}>P{food.p}</span>
        <span style={{ color: '#4ade80' }}>G{food.g}</span>
        <span style={{ color: '#f59e0b' }}>L{food.l}</span>
      </div>
    </button>
  )
}
