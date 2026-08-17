'use client'

import Link from 'next/link'
import { useId, useRef, useState, type FormEvent } from 'react'
import {
  ACTIVITY_MULTIPLIERS,
  calculateAutomaticCalorieMacroTargets,
  type AutomaticCalorieMacroTargets,
  type CalorieMacroObjective,
} from '@/lib/nutrition/calorie-macro-targets'

type NumericField = 'age' | 'height' | 'weight'

const ACTIVITY_OPTIONS: Array<{
  id: keyof typeof ACTIVITY_MULTIPLIERS
  label: string
  description: string
}> = [
  { id: 'sedentary', label: 'Sédentaire', description: 'Bureau, peu ou pas de sport' },
  { id: 'light', label: 'Légèrement actif', description: '1 à 3 séances par semaine' },
  { id: 'moderate', label: 'Modérément actif', description: '3 à 5 séances par semaine' },
  { id: 'active', label: 'Très actif', description: '6 à 7 séances par semaine' },
  { id: 'extreme', label: 'Extrêmement actif', description: 'Athlète ou deux entraînements par jour' },
]

const OBJECTIVE_OPTIONS: Array<{
  id: CalorieMacroObjective
  label: string
  description: string
}> = [
  { id: 'cut', label: 'Perte de poids', description: 'Déficit calorique estimé' },
  { id: 'maintain', label: 'Maintien', description: 'Calories de maintien estimées' },
  { id: 'bulk', label: 'Prise de muscle', description: 'Surplus calorique estimé' },
]

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid #3a3632',
  borderRadius: 10,
  background: '#121110',
  color: '#f0ede8',
  padding: '12px 14px',
  font: 'inherit',
}

const labelStyle = {
  display: 'block',
  marginBottom: 7,
  color: '#e7e1da',
  fontWeight: 700,
}

function validateNumber(
  value: string,
  minimum: number,
  maximum: number,
  message: string,
): string | undefined {
  const parsed = Number(value)
  return !value || !Number.isFinite(parsed) || parsed < minimum || parsed > maximum
    ? message
    : undefined
}

function ResultMetric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div style={{ border: '1px solid rgba(201,168,76,0.24)', background: '#121110', padding: 18, borderRadius: 12 }}>
      <div style={{ color: '#aaa49e', fontSize: 13, lineHeight: 1.4 }}>{label}</div>
      <div style={{ color: '#c9a84c', fontSize: 30, fontWeight: 800, marginTop: 6 }}>
        {value.toLocaleString('fr-CH')} <span style={{ color: '#d2cdc8', fontSize: 14 }}>{unit}</span>
      </div>
    </div>
  )
}

export default function CaloriesMacrosCalculator() {
  const reactId = useId()
  const [gender, setGender] = useState('male')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activityLevel, setActivityLevel] = useState<keyof typeof ACTIVITY_MULTIPLIERS>('moderate')
  const [objective, setObjective] = useState<CalorieMacroObjective>('maintain')
  const [errors, setErrors] = useState<Partial<Record<NumericField, string>>>({})
  const [result, setResult] = useState<AutomaticCalorieMacroTargets | null>(null)
  const ageRef = useRef<HTMLInputElement>(null)
  const heightRef = useRef<HTMLInputElement>(null)
  const weightRef = useRef<HTMLInputElement>(null)

  const ids = {
    age: `calculator-age-${reactId}`,
    height: `calculator-height-${reactId}`,
    weight: `calculator-weight-${reactId}`,
    activity: `calculator-activity-${reactId}`,
    result: `calculator-result-${reactId}`,
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Partial<Record<NumericField, string>> = {
      age: validateNumber(age, 18, 100, 'Indiquez un âge entre 18 et 100 ans.'),
      height: validateNumber(height, 120, 230, 'Indiquez une taille entre 120 et 230 cm.'),
      weight: validateNumber(weight, 35, 300, 'Indiquez un poids entre 35 et 300 kg.'),
    }

    for (const key of Object.keys(nextErrors) as NumericField[]) {
      if (!nextErrors[key]) delete nextErrors[key]
    }
    setErrors(nextErrors)

    const firstInvalid = (Object.keys(nextErrors) as NumericField[])[0]
    if (firstInvalid) {
      const refs = { age: ageRef, height: heightRef, weight: weightRef }
      refs[firstInvalid].current?.focus()
      setResult(null)
      return
    }

    setResult(calculateAutomaticCalorieMacroTargets({
      gender,
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      activityLevel,
      objective,
    }))
  }

  return (
    <section aria-labelledby={`calculator-title-${reactId}`} style={{ border: '1px solid rgba(201,168,76,0.3)', background: '#0d0c0b', padding: 'clamp(22px, 5vw, 40px)', borderRadius: 18 }}>
      <h2 id={`calculator-title-${reactId}`} style={{ marginTop: 0, fontSize: 'clamp(1.7rem, 4vw, 2.5rem)' }}>
        Estimez vos besoins
      </h2>
      <p style={{ color: '#aaa49e', lineHeight: 1.7 }}>
        Le calcul est effectué localement dans votre navigateur. Aucune donnée saisie n’est envoyée ou enregistrée.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset style={{ border: 0, padding: 0, margin: '28px 0' }}>
          <legend style={{ ...labelStyle, marginBottom: 12 }}>Sexe utilisé par la formule</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { id: 'male', label: 'Homme' },
              { id: 'female', label: 'Femme' },
            ].map(option => (
              <label key={option.id} style={{ border: `1px solid ${gender === option.id ? '#c9a84c' : '#3a3632'}`, padding: '11px 16px', borderRadius: 10, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={`calculator-gender-${reactId}`}
                  checked={gender === option.id}
                  onChange={() => setGender(option.id)}
                  style={{ marginRight: 8 }}
                />
                {option.label}
              </label>
            ))}
          </div>
          <p style={{ color: '#88817b', fontSize: 12, lineHeight: 1.5 }}>
            Ce choix sélectionne uniquement le coefficient prévu par l’équation Mifflin–St Jeor.
          </p>
        </fieldset>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <label htmlFor={ids.age} style={labelStyle}>Âge</label>
            <input
              ref={ageRef}
              id={ids.age}
              type="number"
              inputMode="numeric"
              min={18}
              max={100}
              value={age}
              onChange={event => setAge(event.target.value)}
              aria-invalid={Boolean(errors.age)}
              aria-describedby={errors.age ? `${ids.age}-error` : undefined}
              style={fieldStyle}
            />
            {errors.age && <p id={`${ids.age}-error`} role="alert" style={{ color: '#ff8b8b', fontSize: 13 }}>{errors.age}</p>}
          </div>
          <div>
            <label htmlFor={ids.height} style={labelStyle}>Taille (cm)</label>
            <input
              ref={heightRef}
              id={ids.height}
              type="number"
              inputMode="decimal"
              min={120}
              max={230}
              value={height}
              onChange={event => setHeight(event.target.value)}
              aria-invalid={Boolean(errors.height)}
              aria-describedby={errors.height ? `${ids.height}-error` : undefined}
              style={fieldStyle}
            />
            {errors.height && <p id={`${ids.height}-error`} role="alert" style={{ color: '#ff8b8b', fontSize: 13 }}>{errors.height}</p>}
          </div>
          <div>
            <label htmlFor={ids.weight} style={labelStyle}>Poids (kg)</label>
            <input
              ref={weightRef}
              id={ids.weight}
              type="number"
              inputMode="decimal"
              min={35}
              max={300}
              step="0.1"
              value={weight}
              onChange={event => setWeight(event.target.value)}
              aria-invalid={Boolean(errors.weight)}
              aria-describedby={errors.weight ? `${ids.weight}-error` : undefined}
              style={fieldStyle}
            />
            {errors.weight && <p id={`${ids.weight}-error`} role="alert" style={{ color: '#ff8b8b', fontSize: 13 }}>{errors.weight}</p>}
          </div>
        </div>

        <div style={{ margin: '24px 0' }}>
          <label htmlFor={ids.activity} style={labelStyle}>Niveau d’activité</label>
          <select
            id={ids.activity}
            value={activityLevel}
            onChange={event => setActivityLevel(event.target.value as keyof typeof ACTIVITY_MULTIPLIERS)}
            style={fieldStyle}
          >
            {ACTIVITY_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>
                {option.label} — {option.description}
              </option>
            ))}
          </select>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: '24px 0' }}>
          <legend style={{ ...labelStyle, marginBottom: 12 }}>Objectif</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            {OBJECTIVE_OPTIONS.map(option => (
              <label key={option.id} style={{ border: `1px solid ${objective === option.id ? '#c9a84c' : '#3a3632'}`, padding: 14, borderRadius: 10, cursor: 'pointer' }}>
                <span style={{ display: 'block', fontWeight: 700 }}>
                  <input
                    type="radio"
                    name={`calculator-objective-${reactId}`}
                    checked={objective === option.id}
                    onChange={() => setObjective(option.id)}
                    style={{ marginRight: 8 }}
                  />
                  {option.label}
                </span>
                <span style={{ display: 'block', color: '#8f8983', fontSize: 12, margin: '6px 0 0 24px' }}>{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" style={{ border: 0, borderRadius: 10, background: '#c9a84c', color: '#050505', fontWeight: 800, fontSize: 16, padding: '14px 22px', cursor: 'pointer' }}>
          Calculer mes besoins estimés
        </button>
      </form>

      <div id={ids.result} role="status" aria-live="polite" aria-atomic="true" style={{ marginTop: 30 }}>
        {result && (
          <div>
            <h3 style={{ fontSize: 24 }}>Votre estimation quotidienne</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              <ResultMetric label="Métabolisme de repos estimé" value={result.bmr} unit="kcal/jour" />
              <ResultMetric label="Calories de maintien estimées" value={result.tdee} unit="kcal/jour" />
              <ResultMetric label="Calories objectif estimées" value={result.calorieTarget} unit="kcal/jour" />
              <ResultMetric label="Protéines" value={result.protein} unit="g/jour" />
              <ResultMetric label="Glucides" value={result.carbs} unit="g/jour" />
              <ResultMetric label="Lipides" value={result.fat} unit="g/jour" />
            </div>
            <p style={{ color: '#aaa49e', lineHeight: 1.7 }}>
              Ces valeurs sont des points de départ estimés. Observez votre énergie, votre récupération et l’évolution de votre poids avant de les ajuster.
            </p>
            <Link href="/register-client" style={{ display: 'inline-block', marginTop: 8, padding: '13px 20px', background: '#c9a84c', color: '#050505', fontWeight: 800, textDecoration: 'none', borderRadius: 10 }}>
              Créer mon plan nutritionnel personnalisé
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
