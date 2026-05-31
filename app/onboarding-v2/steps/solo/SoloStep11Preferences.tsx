'use client'

import { useState } from 'react'
import { MEAL_KEYS, MEAL_DEFAULTS, MEAL_EMOJIS, type MealKey } from '@/lib/meal-plan/meal-suggestions'

export interface MealPrefsState {
  breakfast: string[]
  snack: string[]
  lunch: string[]
  dinner: string[]
}

interface SoloStep11PreferencesProps {
  /** Selected liked foods per meal */
  mealPrefs: MealPrefsState
  /** Disliked foods list */
  dislikedFoods: string[]
  /** Toggle a liked food for a given meal */
  onToggleFood: (meal: MealKey, food: string) => void
  /** Add a disliked food */
  onAddDisliked: (food: string) => void
  /** Remove a disliked food */
  onRemoveDisliked: (food: string) => void
}

const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: 'Petit-déjeuner',
  snack: 'Collation',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
}

export default function SoloStep11Preferences({
  mealPrefs,
  dislikedFoods,
  onToggleFood,
  onAddDisliked,
  onRemoveDisliked,
}: SoloStep11PreferencesProps) {
  const [activeMeal, setActiveMeal] = useState<MealKey>('breakfast')
  const [dislikedInput, setDislikedInput] = useState('')

  const GOLD = '#C9A24B'
  const GOLD_DIM = 'rgba(201,162,75,0.15)'
  const BORDER = 'rgba(255,255,255,0.12)'
  const BG = 'rgba(255,255,255,0.03)'
  const TEXT = '#F5F0E6'
  const TEXT_DIM = 'rgba(245,240,230,0.5)'

  function handleAddDisliked() {
    const v = dislikedInput.trim()
    if (v && !dislikedFoods.includes(v)) {
      onAddDisliked(v)
      setDislikedInput('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Liked foods per meal */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7, marginBottom: 12 }}>
          Mes aliments préférés par repas
        </div>

        {/* Meal tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {MEAL_KEYS.map((key) => {
            const active = activeMeal === key
            return (
              <button
                key={key}
                onClick={() => setActiveMeal(key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 4px',
                  background: active ? GOLD_DIM : BG,
                  border: `1.5px solid ${active ? GOLD : BORDER}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                <span style={{ fontSize: 20 }}>{MEAL_EMOJIS[key]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? GOLD : TEXT }}>{MEAL_LABELS[key]}</span>
              </button>
            )
          })}
        </div>

        {/* Food grid for active meal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {MEAL_DEFAULTS[activeMeal].map((food) => {
            const active = (mealPrefs[activeMeal] || []).includes(food)
            return (
              <button
                key={food}
                onClick={() => onToggleFood(activeMeal, food)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: active ? GOLD_DIM : BG,
                  border: `1.5px solid ${active ? GOLD : BORDER}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 8, flexShrink: 0,
                  border: `1.5px solid ${active ? GOLD : TEXT_DIM}`,
                  background: active ? GOLD : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <span style={{ color: '#0D0B08', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: active ? GOLD : TEXT }}>{food}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Disliked foods */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7, marginBottom: 10 }}>
          Aliments que tu n'aimes pas (optionnel)
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={dislikedInput}
            onChange={(e) => setDislikedInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDisliked() } }}
            placeholder="Ex : champignons, fromage de chèvre..."
            style={{
              flex: 1, padding: '10px 14px', background: BG,
              border: `1.5px solid ${BORDER}`, borderRadius: 12,
              color: TEXT, fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={handleAddDisliked}
            style={{
              padding: '10px 18px', background: GOLD_DIM, color: GOLD,
              border: `1.5px solid ${GOLD}`, borderRadius: 12,
              cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}
          >
            Ajouter
          </button>
        </div>
        {dislikedFoods.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {dislikedFoods.map((food) => (
              <button
                key={food}
                onClick={() => onRemoveDisliked(food)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: BG,
                  border: `1.5px solid ${BORDER}`, borderRadius: 20,
                  color: TEXT, fontSize: 13, cursor: 'pointer',
                }}
              >
                {food}
                <span style={{ color: TEXT_DIM, fontSize: 15 }}>×</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
