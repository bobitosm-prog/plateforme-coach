'use client'
import { useEffect, useMemo, useState } from 'react'
import { Check, Flame, Beef, Wheat, Droplets } from 'lucide-react'
import type { FitnessFood } from '../../lib/types'
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

const CATEGORY_LABELS: Record<string, string> = {
  proteines: 'Protéines',
  glucides: 'Glucides',
  lipides: 'Lipides',
  micronutriments: 'Micronutriments',
}

const CATEGORY_ORDER = ['proteines', 'glucides', 'lipides', 'micronutriments']

interface NutritionPreferencesProps {
  profile: any
  supabase: any
  userId: string
  onSaved: () => void
}

export default function NutritionPreferences({ profile, supabase, userId, onSaved }: NutritionPreferencesProps) {
  const [dietaryType, setDietaryType] = useState<string>(profile?.dietary_type || 'omnivore')
  const [allergies, setAllergies] = useState<string[]>(profile?.allergies || [])
  const [likedFoods, setLikedFoods] = useState<string[]>(profile?.liked_foods || [])
  const [activityLevel, setActivityLevel] = useState<string>(profile?.activity_level || 'moderate')
  const [foods, setFoods] = useState<FitnessFood[]>([])
  const [loadingFoods, setLoadingFoods] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    fetchFoods()
  }, [dietaryType, allergies])

  async function fetchFoods() {
    setLoadingFoods(true)
    let query = supabase.from('fitness_foods').select('*').order('name')
    if (dietaryType === 'vegan') query = query.eq('is_vegan', true)
    else if (dietaryType === 'vegetarian') query = query.eq('is_vegetarian', true)
    const { data } = await query
    let results: FitnessFood[] = data || []
    if (allergies.length > 0) {
      results = results.filter(f => !f.allergens || !f.allergens.some(a => allergies.includes(a)))
    }
    setFoods(results)
    setLoadingFoods(false)
  }

  // TDEE calculation
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
    if (objective === 'seche' || objective === 'perte_poids' || objective === 'weight_loss') {
      adjustedKcal = tdee - 300
    } else if (objective === 'prise_masse' || objective === 'mass') {
      adjustedKcal = tdee + 300
    }

    const proteinG = Math.round(2 * w)
    const fatG = Math.round((adjustedKcal * 0.25) / 9)
    const carbsG = Math.round((adjustedKcal - proteinG * 4 - fatG * 9) / 4)

    return { bmr: Math.round(bmr), tdee, adjustedKcal, proteinG, carbsG, fatG, age }
  }, [profile?.current_weight, profile?.height, profile?.birth_date, profile?.gender, profile?.objective, activityLevel])

  function toggleAllergy(id: string) {
    setAllergies(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  function toggleFood(id: string) {
    setLikedFoods(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  async function save() {
    setSaving(true)
    const update: Record<string, any> = {
      dietary_type: dietaryType,
      allergies,
      liked_foods: likedFoods,
      activity_level: activityLevel,
    }
    if (tdeeData) {
      update.tdee = tdeeData.adjustedKcal
      update.calorie_goal = tdeeData.adjustedKcal
      update.protein_goal = tdeeData.proteinG
      update.carbs_goal = tdeeData.carbsG
      update.fat_goal = tdeeData.fatG
    }
    const { error } = await supabase.from('profiles').update(update).eq('id', userId)
    setSaving(false)
    if (!error) {
      setToast(true)
      onSaved()
      setTimeout(() => setToast(false), 2500)
    }
  }

  const sectionTitle: React.CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: GOLD,
    marginBottom: 12,
  }

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: foods.filter(f => f.category === cat) }))
    .filter(g => g.items.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Section: Régime */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
        <div style={sectionTitle}>Mon régime</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {DIET_OPTIONS.map(opt => {
            const active = dietaryType === opt.id
            return (
              <button key={opt.id} onClick={() => setDietaryType(opt.id)} style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                background: active ? `${GOLD}18` : BG,
                border: `2px solid ${active ? GOLD : BORDER}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 150ms',
              }}>
                <span style={{ fontSize: '1.4rem' }}>{opt.emoji}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: active ? GOLD : TEXT }}>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Section: Allergies */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
        <div style={sectionTitle}>Allergies & intolérances</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {ALLERGY_OPTIONS.map(opt => {
            const active = allergies.includes(opt.id)
            return (
              <button key={opt.id} onClick={() => toggleAllergy(opt.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer',
                background: active ? 'rgba(239,68,68,0.08)' : BG,
                border: `1.5px solid ${active ? '#EF4444' : BORDER}`,
                transition: 'all 150ms',
              }}>
                <span style={{ fontSize: '1.1rem' }}>{opt.emoji}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: active ? '#EF4444' : TEXT, flex: 1, textAlign: 'left' }}>{opt.label}</span>
                {active && <Check size={14} color="#EF4444" strokeWidth={3} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Section: Mon métabolisme */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
        <div style={sectionTitle}>Mon métabolisme</div>

        {/* Read-only profile data */}
        {profile && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Âge', value: tdeeData ? `${tdeeData.age} ans` : '—' },
              { label: 'Poids', value: profile.current_weight ? `${profile.current_weight} kg` : '—' },
              { label: 'Taille', value: profile.height ? `${profile.height} cm` : '—' },
              { label: 'Objectif', value: profile.objective || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: BG, borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.6rem', color: MUTED, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: '0.85rem', color: TEXT, fontWeight: 600, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Activity level selector */}
        <div style={{ fontSize: '0.65rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Niveau d'activité</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {ACTIVITY_LEVELS.map(lvl => {
            const active = activityLevel === lvl.id
            return (
              <button key={lvl.id} onClick={() => setActivityLevel(lvl.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer',
                background: active ? `${GOLD}15` : BG,
                border: `1.5px solid ${active ? GOLD : BORDER}`,
                transition: 'all 150ms',
              }}>
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

        {/* TDEE result card */}
        {tdeeData ? (
          <div style={{ background: `${GOLD}10`, border: `1.5px solid ${GOLD}40`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { icon: Flame, label: 'Calories/jour', value: `${tdeeData.adjustedKcal}`, unit: 'kcal', color: '#EF4444' },
                { icon: Beef, label: 'Protéines', value: `${tdeeData.proteinG}`, unit: 'g', color: '#3B82F6' },
                { icon: Wheat, label: 'Glucides', value: `${tdeeData.carbsG}`, unit: 'g', color: '#F59E0B' },
                { icon: Droplets, label: 'Lipides', value: `${tdeeData.fatG}`, unit: 'g', color: '#22C55E' },
              ].map(({ icon: Icon, label, value, unit, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={color} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT, lineHeight: 1 }}>
                      {value}<span style={{ fontSize: '0.7rem', color: MUTED, marginLeft: 2 }}>{unit}</span>
                    </div>
                    <div style={{ fontSize: '0.6rem', color: MUTED }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.78rem', color: MUTED, textAlign: 'center', margin: 0 }}>
            Complète ton profil (poids, taille, date de naissance) pour calculer ton métabolisme.
          </p>
        )}
      </div>

      {/* Section: Aliments aimés */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
        <div style={sectionTitle}>Aliments que j'aime</div>
        {loadingFoods ? (
          <p style={{ fontSize: '0.82rem', color: MUTED, textAlign: 'center', padding: '20px 0' }}>Chargement des aliments...</p>
        ) : grouped.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: MUTED, textAlign: 'center', padding: '20px 0' }}>Aucun aliment disponible avec ces filtres.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {grouped.map(({ cat, items }) => (
              <div key={cat}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED, marginBottom: 8,
                }}>
                  {CATEGORY_LABELS[cat] || cat}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {items.map(food => {
                    const active = likedFoods.includes(food.id)
                    return (
                      <button key={food.id} onClick={() => toggleFood(food.id)} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                        background: active ? `${GOLD}15` : BG,
                        border: `2px solid ${active ? GOLD : BORDER}`,
                        transition: 'all 150ms',
                        position: 'relative',
                      }}>
                        {active && (
                          <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={10} color="#000" strokeWidth={3} />
                          </div>
                        )}
                        <span style={{ fontSize: '1.3rem' }}>{food.emoji || '🍽️'}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: active ? GOLD : MUTED, textAlign: 'center', lineHeight: 1.2 }}>{food.name}</span>
                        <span style={{ fontSize: '0.55rem', color: active ? `${GOLD}99` : `${MUTED}99`, textAlign: 'center', lineHeight: 1.1 }}>
                          {food.protein_per_100g}g P · {food.carbs_per_100g}g G · {food.fat_per_100g}g L
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <button onClick={save} disabled={saving} style={{
        width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
        background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`,
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700,
        color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase',
        opacity: saving ? 0.6 : 1, transition: 'opacity 150ms',
      }}>
        {saving ? 'Enregistrement...' : 'Enregistrer mes préférences'}
      </button>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: '#22C55E', color: '#000', padding: '10px 24px', borderRadius: 12,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700,
          zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          Préférences sauvegardées !
        </div>
      )}
    </div>
  )
}
