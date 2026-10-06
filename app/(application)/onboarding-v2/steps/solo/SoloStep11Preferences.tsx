'use client'

import { useState } from 'react'
import { MEAL_KEYS, MEAL_DEFAULTS, MEAL_EMOJIS, type MealKey } from '@/lib/meal-plan/meal-suggestions'
import { colors, fonts } from '@/lib/app-design-tokens'

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
  const [foodInput, setFoodInput] = useState('')
  const foodKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr')
  const selectedFoods = mealPrefs[activeMeal] || []
  // Include persisted custom preferences, not just the suggested foods.
  const availableFoods = [...MEAL_DEFAULTS[activeMeal], ...selectedFoods]
    .filter((food, index, foods) => foods.findIndex(item => foodKey(item) === foodKey(food)) === index)

  function handleAddFood() {
    const value = foodInput.trim().replace(/\s+/g, ' ')
    if (!value) return
    const existing = availableFoods.find(food => foodKey(food) === foodKey(value))
    if (!selectedFoods.some(food => foodKey(food) === foodKey(value))) {
      onToggleFood(activeMeal, existing || value)
    }
    setFoodInput('')
  }


  function handleAddDisliked() {
    const v = dislikedInput.trim()
    if (v && !dislikedFoods.includes(v)) {
      onAddDisliked(v)
      setDislikedInput('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: fonts.body }}>
      {/* Liked foods per meal */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted, marginBottom: 12 }}>
          Mes aliments préférés par repas
        </div>

        {/* Meal tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
          {MEAL_KEYS.map((key) => {
            const active = activeMeal === key
            return (
              <button
                key={key}
                aria-pressed={active}
                onClick={() => { setActiveMeal(key); setFoodInput('') }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 4px',
                  background: active ? colors.goldDim : colors.surface,
                  border: `1.5px solid ${active ? colors.gold : colors.goldBorder}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  fontFamily: fonts.body,
                }}
              >
                <span style={{ fontSize: 20 }}>{MEAL_EMOJIS[key]}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: active ? colors.gold : colors.text }}>{MEAL_LABELS[key]}</span>
              </button>
            )
          })}
        </div>

        <label htmlFor="onboarding-meal-food" style={{ display: 'block', color: colors.text, fontSize: 16, marginBottom: 8 }}>
          Ajouter un aliment · {MEAL_LABELS[activeMeal]}
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            id="onboarding-meal-food"
            value={foodInput}
            maxLength={100}
            onChange={event => setFoodInput(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleAddFood() } }}
            placeholder="Ex. : lait, pain, fraises…"
            style={{ flex: 1, minWidth: 0, minHeight: 48, padding: '10px 12px', borderRadius: 12, border: `1px solid ${colors.goldBorder}`, background: colors.surface, color: colors.text, font: 'inherit' }}
          />
          <button type="button" onClick={handleAddFood} disabled={!foodInput.trim()}
            style={{ minHeight: 48, padding: '10px 16px', borderRadius: 12, border: 0, background: colors.gold, color: colors.onGold, font: 'inherit', fontWeight: 700, opacity: foodInput.trim() ? 1 : 0.45 }}>
            Ajouter
          </button>
        </div>

        {/* Food grid for active meal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 8 }}>
          {availableFoods.map((food) => {
            const selectedFood = selectedFoods.find(item => foodKey(item) === foodKey(food))
            const active = selectedFood !== undefined
            return (
              <button
                key={food}
                aria-pressed={active}
                onClick={() => onToggleFood(activeMeal, selectedFood ?? food)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: active ? colors.goldDim : colors.surface,
                  border: `1.5px solid ${active ? colors.gold : colors.goldBorder}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  textAlign: 'left',
                  fontFamily: fonts.body,
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 8, flexShrink: 0,
                  border: `1.5px solid ${active ? colors.gold : colors.textDim}`,
                  background: active ? colors.gold : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <span style={{ color: colors.background, fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 16, lineHeight: 1.45, overflowWrap: 'anywhere', color: active ? colors.gold : colors.text }}>{food}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Disliked foods */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted, marginBottom: 10 }}>
          Aliments que tu n'aimes pas (optionnel)
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            aria-label="Aliments que tu n’aimes pas"
            value={dislikedInput}
            onChange={(e) => setDislikedInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDisliked() } }}
            placeholder="Ex : champignons, fromage de chèvre..."
            style={{
              flex: 1, minWidth: 0, padding: '10px 14px', background: colors.surface,
              border: `1.5px solid ${colors.goldBorder}`, borderRadius: 12,
              color: colors.text, fontSize: 14, outline: 'none', fontFamily: fonts.body,
            }}
          />
          <button
            onClick={handleAddDisliked}
            style={{
              padding: '10px 18px', background: colors.goldDim, color: colors.gold,
              border: `1.5px solid ${colors.gold}`, borderRadius: 12,
              cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: fonts.body,
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
                  padding: '6px 12px', background: colors.surface,
                  border: `1.5px solid ${colors.goldBorder}`, borderRadius: 20,
                  color: colors.text, fontSize: 13, cursor: 'pointer', fontFamily: fonts.body,
                }}
              >
                {food}
                <span style={{ color: colors.textDim, fontSize: 15 }}>×</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
