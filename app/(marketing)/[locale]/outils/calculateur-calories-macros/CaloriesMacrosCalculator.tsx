'use client'

import { useState, type FormEvent } from 'react'
import {
  calculateAutomaticCalorieMacroTargets,
  type AutomaticNutritionObjective,
  type CalorieMacroTargets,
} from '@/lib/nutrition/calorie-macro-targets'

const OBJECTIVE_ADJUSTMENTS: Record<AutomaticNutritionObjective, number> = {
  cut: -400,
  maintain: 0,
  bulk: 300,
}

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid rgba(201,168,76,0.35)',
  borderRadius: 8,
  background: '#080808',
  color: '#f0ede8',
  padding: '12px 14px',
  font: 'inherit',
}

const labelStyle = {
  display: 'grid',
  gap: 8,
  color: 'rgba(255,255,255,0.78)',
  fontWeight: 600,
}

export default function CaloriesMacrosCalculator() {
  const [gender, setGender] = useState('male')
  const [age, setAge] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [objective, setObjective] = useState<AutomaticNutritionObjective>('maintain')
  const [error, setError] = useState('')
  const [result, setResult] = useState<CalorieMacroTargets | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedAge = Number(age)
    const parsedHeight = Number(heightCm)
    const parsedWeight = Number(weightKg)
    if (
      !Number.isFinite(parsedAge) || parsedAge <= 0 ||
      !Number.isFinite(parsedHeight) || parsedHeight <= 0 ||
      !Number.isFinite(parsedWeight) || parsedWeight <= 0
    ) {
      setResult(null)
      setError('Renseignez un âge, une taille et un poids valides pour obtenir une estimation.')
      return
    }

    setError('')
    setResult(calculateAutomaticCalorieMacroTargets({
      gender,
      age: parsedAge,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      activityLevel,
      objective,
      calorieAdjustment: OBJECTIVE_ADJUSTMENTS[objective],
    }))
  }

  return (
    <section aria-labelledby="calculator-title" style={{ background: '#0d0c0b', border: '1px solid rgba(201,168,76,0.3)', padding: 'clamp(20px, 5vw, 36px)' }}>
      <h2 id="calculator-title" style={{ color: '#c9a84c', marginTop: 0, fontSize: 'clamp(1.7rem, 5vw, 2.5rem)' }}>
        Estimer mes calories et mes macros
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>
        Les résultats sont estimés à partir des informations saisies et constituent un point de départ à ajuster selon votre évolution.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18, margin: '28px 0' }}>
          <label style={labelStyle}>
            Sexe utilisé pour l’estimation
            <select aria-label="Sexe utilisé pour l’estimation" value={gender} onChange={event => setGender(event.target.value)} style={fieldStyle}>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </label>

          <label style={labelStyle}>
            Âge
            <input aria-label="Âge" type="number" inputMode="numeric" min="1" step="1" value={age} onChange={event => setAge(event.target.value)} style={fieldStyle} />
          </label>

          <label style={labelStyle}>
            Taille en centimètres
            <input aria-label="Taille en centimètres" type="number" inputMode="decimal" min="1" step="0.1" value={heightCm} onChange={event => setHeightCm(event.target.value)} style={fieldStyle} />
          </label>

          <label style={labelStyle}>
            Poids en kilogrammes
            <input aria-label="Poids en kilogrammes" type="number" inputMode="decimal" min="1" step="0.1" value={weightKg} onChange={event => setWeightKg(event.target.value)} style={fieldStyle} />
          </label>

          <label style={labelStyle}>
            Niveau d’activité
            <select aria-label="Niveau d’activité" value={activityLevel} onChange={event => setActivityLevel(event.target.value)} style={fieldStyle}>
              <option value="sedentary">Sédentaire</option>
              <option value="light">Légèrement actif</option>
              <option value="moderate">Modérément actif</option>
              <option value="active">Très actif</option>
              <option value="extreme">Extrêmement actif</option>
            </select>
          </label>

          <label style={labelStyle}>
            Objectif
            <select aria-label="Objectif" value={objective} onChange={event => setObjective(event.target.value as AutomaticNutritionObjective)} style={fieldStyle}>
              <option value="cut">Perte de poids</option>
              <option value="maintain">Maintien</option>
              <option value="bulk">Prise de muscle</option>
            </select>
          </label>
        </div>

        <button type="submit" style={{ border: 0, borderRadius: 8, background: '#c9a84c', color: '#080808', padding: '14px 22px', font: 'inherit', fontWeight: 800, cursor: 'pointer' }}>
          Calculer mon estimation
        </button>

        {error && <p role="alert" style={{ color: '#fca5a5', marginTop: 18 }}>{error}</p>}
      </form>

      <div aria-live="polite" aria-atomic="true" style={{ marginTop: 30 }}>
        {result && (
          <div>
            <h3 style={{ color: '#f0ede8' }}>Votre estimation quotidienne</h3>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: 0 }}>
              {[
                ['Métabolisme de repos (BMR) estimé', result.bmr, 'kcal'],
                ['Calories de maintien estimées', result.tdee, 'kcal'],
                ['Calories objectif estimées', result.targetCalories, 'kcal'],
                ['Protéines estimées', result.proteinGrams, 'g/jour'],
                ['Glucides estimés', result.carbsGrams, 'g/jour'],
                ['Lipides estimés', result.fatGrams, 'g/jour'],
              ].map(([label, value, unit]) => (
                <div key={label} style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.1)', padding: 16 }}>
                  <dt style={{ color: 'rgba(255,255,255,0.62)', fontSize: 14 }}>{label}</dt>
                  <dd style={{ margin: '8px 0 0', color: '#c9a84c', fontSize: 24, fontWeight: 800 }}>{value} {unit}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}
