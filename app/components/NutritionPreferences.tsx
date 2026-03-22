'use client'
import { useState } from 'react'
import { Check } from 'lucide-react'

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

const FOOD_OPTIONS = [
  { id: 'chicken', label: 'Blanc de poulet', emoji: '🍗' },
  { id: 'tuna', label: 'Thon', emoji: '🐟' },
  { id: 'salmon', label: 'Saumon', emoji: '🐠' },
  { id: 'eggs', label: 'Œufs', emoji: '🥚' },
  { id: 'beef', label: 'Bœuf maigre', emoji: '🥩' },
  { id: 'cottage_cheese', label: 'Fromage blanc 0%', emoji: '🫙' },
  { id: 'tofu', label: 'Tofu', emoji: '🧈' },
  { id: 'shrimp', label: 'Crevettes', emoji: '🦐' },
  { id: 'rice', label: 'Riz', emoji: '🍚' },
  { id: 'oats', label: 'Avoine', emoji: '🌾' },
  { id: 'sweet_potato', label: 'Patate douce', emoji: '🍠' },
  { id: 'quinoa', label: 'Quinoa', emoji: '🌿' },
  { id: 'whole_bread', label: 'Pain complet', emoji: '🍞' },
  { id: 'pasta', label: 'Pâtes complètes', emoji: '🍝' },
  { id: 'lentils', label: 'Lentilles', emoji: '🫘' },
  { id: 'peanut_butter', label: 'Beurre de cacahuètes', emoji: '🥜' },
  { id: 'avocado', label: 'Avocat', emoji: '🥑' },
  { id: 'olive_oil', label: 'Huile d\'olive', emoji: '🫒' },
  { id: 'almonds', label: 'Amandes', emoji: '🌰' },
  { id: 'broccoli', label: 'Brocoli', emoji: '🥦' },
  { id: 'spinach', label: 'Épinards', emoji: '🌱' },
  { id: 'greek_yogurt', label: 'Yaourt grec', emoji: '🥛' },
  { id: 'banana', label: 'Banane', emoji: '🍌' },
  { id: 'apple', label: 'Pomme', emoji: '🍎' },
]

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
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(false)

  function toggleAllergy(id: string) {
    setAllergies(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  function toggleFood(id: string) {
    setLikedFoods(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      dietary_type: dietaryType,
      allergies,
      liked_foods: likedFoods,
    }).eq('id', userId)
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

      {/* Section: Aliments aimés */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
        <div style={sectionTitle}>Aliments que j'aime</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {FOOD_OPTIONS.map(opt => {
            const active = likedFoods.includes(opt.id)
            return (
              <button key={opt.id} onClick={() => toggleFood(opt.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
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
                <span style={{ fontSize: '1.3rem' }}>{opt.emoji}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: active ? GOLD : MUTED, textAlign: 'center', lineHeight: 1.2 }}>{opt.label}</span>
              </button>
            )
          })}
        </div>
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
