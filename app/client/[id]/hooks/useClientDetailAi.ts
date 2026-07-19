'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import type { DatabaseClient } from '@/lib/supabase/types'
import { DAYS, type Profile, type WeekProgram } from './client-detail-contract'

export const AI_EQUIPMENT = ['Haltères', 'Barre', 'Machine', 'Poulie', 'Poids du corps', 'Banc']
export const AI_LEVELS = ['Débutant', 'Intermédiaire', 'Avancé']

type AiMealFood = { quantite_g?: number; kcal?: number; proteines?: number; glucides?: number; lipides?: number }
type AiMealDay = { total_kcal?: number; total_protein?: number; total_carbs?: number; total_fat?: number; repas?: Record<string, AiMealFood[]> }
export type AiMealPlan = Record<string, AiMealDay>
type LegacyFoodRow = { id: string; name: string | null; energy_kcal: number | null; proteins: number | null; carbohydrates: number | null; fat: number | null }
type LegacyScannedFoodRow = { name: string; brand: string | null; calories_per_100g: number; proteins_per_100g: number; carbs_per_100g: number; fats_per_100g: number }

type UseClientDetailAiInput = {
  client: DatabaseClient
  coachId: string | null
  profile: Profile | null
  calorieTarget: number
  protTarget: number
  carbTarget: number
  fatTarget: number
  setProgram: Dispatch<SetStateAction<WeekProgram>>
  showToast(message: string): void
  refresh(): void
}

export function useClientDetailAi(input: UseClientDetailAiInput) {
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiLevel, setAiLevel] = useState('Intermédiaire')
  const [aiEquipment, setAiEquipment] = useState<string[]>(['Poids du corps'])
  const [aiTrainingDays, setAiTrainingDays] = useState(4)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPreview, setAiPreview] = useState<WeekProgram | null>(null)
  const [aiMealGenerating, setAiMealGenerating] = useState(false)
  const [aiMealStreamStatus, setAiMealStreamStatus] = useState('')
  const [aiMealPreview, setAiMealPreview] = useState<AiMealPlan | null>(null)
  const [aiMealPreviewDay, setAiMealPreviewDay] = useState('lundi')

  const toggleAiEquipment = (item: string) => setAiEquipment(previous => previous.includes(item) ? previous.filter(value => value !== item) : [...previous, item])

  const generateAiProgram = async () => {
    setAiGenerating(true); setAiPreview(null)
    try {
      const response = await fetch('/api/generate-program', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          objective: input.profile?.objective || 'Amélioration de la condition physique',
          weight: input.profile?.current_weight ?? '?', targetWeight: input.profile?.target_weight ?? '?',
          level: aiLevel, equipment: aiEquipment.length ? aiEquipment : ['Poids du corps'], trainingDays: aiTrainingDays,
        }),
      })
      if (!response.ok) throw new Error('provider_failure')
      const payload = await response.json() as { program?: Record<string, { isRest?: boolean; exercises?: Array<Partial<{ name: string; sets: number; reps: number; rest: string; notes: string }>> }> }
      const mapped: WeekProgram = {}
      for (const day of DAYS) {
        const generated = payload.program?.[day]
        mapped[day] = { repos: generated?.isRest ?? true, exercises: (generated?.exercises ?? []).map(exercise => ({ name: exercise.name ?? '', sets: exercise.sets ?? 3, reps: exercise.reps ?? 10, rest: exercise.rest ?? '60s', notes: exercise.notes ?? '' })) }
      }
      setAiPreview(mapped)
    } catch { input.showToast('Erreur lors de la génération IA') } finally { setAiGenerating(false) }
  }

  const acceptAiPreview = () => {
    if (!aiPreview) return
    input.setProgram(aiPreview); setAiPreview(null); setShowAiModal(false)
    input.showToast('Programme IA appliqué — vérifiez et sauvegardez')
  }

  const generateAiMealPlan = async () => {
    const profile = input.profile
    if (!profile) return
    setAiMealGenerating(true); setAiMealPreview(null); setAiMealStreamStatus('Préparation...')
    try {
      setAiMealStreamStatus('Chargement des aliments...')
      const liked = Array.isArray(profile.liked_foods) ? profile.liked_foods : []
      const likedQuery = liked.length ? await input.client.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat').in('id', liked).limit(200) : { data: [] }
      const availableFoods = ((likedQuery.data ?? []) as unknown as LegacyFoodRow[]).map(food => ({ id: food.id, nom: food.name || '', kcal: Math.round(food.energy_kcal ?? 0), p: Math.round((food.proteins ?? 0) * 10) / 10, g: Math.round((food.carbohydrates ?? 0) * 10) / 10, l: Math.round((food.fat ?? 0) * 10) / 10 }))
      if (availableFoods.length < 10) {
        const { data } = await input.client.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat').eq('source', 'fitness').not('name', 'is', null).order('name').limit(200)
        const seen = new Set(availableFoods.map(food => food.nom))
        availableFoods.push(...((data ?? []) as unknown as LegacyFoodRow[]).filter(food => !seen.has(food.name || '')).map(food => ({ id: food.id, nom: food.name || '', kcal: Math.round(food.energy_kcal ?? 0), p: Math.round((food.proteins ?? 0) * 10) / 10, g: Math.round((food.carbohydrates ?? 0) * 10) / 10, l: Math.round((food.fat ?? 0) * 10) / 10 })))
      }
      const { data: scanned } = await input.client.from('custom_foods').select('name, brand, calories_per_100g, proteins_per_100g, carbs_per_100g, fats_per_100g, scan_count').eq('user_id', profile.id).not('barcode', 'is', null).order('scan_count', { ascending: false }).limit(20)
      const foodNames = new Map(availableFoods.map(food => [food.id, food.nom]))
      const resolve = (ids?: string[]) => (ids ?? []).map(id => foodNames.get(id)).filter((name): name is string => Boolean(name))
      setAiMealStreamStatus("Connexion à l'IA...")
      const response = await fetch('/api/generate-meal-plan', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          calorie_goal: profile.calorie_goal || profile.tdee || input.calorieTarget, protein_goal: profile.protein_goal || input.protTarget,
          carbs_goal: profile.carbs_goal || input.carbTarget, fat_goal: profile.fat_goal || input.fatTarget,
          dietary_type: profile.dietary_type, allergies: profile.allergies, disliked_foods: profile.meal_preferences?.disliked_foods || [], objective: profile.objective,
          available_foods: availableFoods, meal_food_names: { morning: resolve(profile.meal_preferences?.petit_dejeuner), lunch: resolve(profile.meal_preferences?.dejeuner), snack: resolve(profile.meal_preferences?.collation), dinner: resolve(profile.meal_preferences?.diner) },
          scanned_foods: ((scanned ?? []) as unknown as LegacyScannedFoodRow[]).map(food => ({ name: food.name, brand: food.brand || '', calories: food.calories_per_100g, proteins: food.proteins_per_100g, carbs: food.carbs_per_100g, fat: food.fats_per_100g })),
          objective_mode: profile.objective === 'weight_loss' ? 'seche' : profile.objective === 'mass' ? 'bulk' : 'maintien', caloric_adjustment: (profile.calorie_goal || 0) - (profile.tdee || profile.calorie_goal || 0), tdee: profile.tdee, activity_level: profile.activity_level,
        }),
      })
      if (!response.ok || !response.body) throw new Error('provider_failure')
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let plan: AiMealPlan | null = null; let buffer = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try { const event = JSON.parse(line.slice(6)) as { type?: string; index?: number; day?: string; plan?: AiMealPlan }; if (event.type === 'progress') setAiMealStreamStatus(`Génération jour ${event.index}/7 — ${event.day}...`); else if (event.type === 'done' && event.plan) plan = event.plan } catch { /* legacy stream ignores malformed events */ }
        }
      }
      if (!plan) throw new Error('invalid_output')
      for (const day of DAYS) if (!plan[day]) plan[day] = { total_kcal: 0, total_protein: 0, total_carbs: 0, total_fat: 0, repas: {} }
      setAiMealPreview(plan); setAiMealPreviewDay('lundi')
    } catch { input.showToast('Erreur lors de la génération du plan alimentaire') } finally { setAiMealGenerating(false); setAiMealStreamStatus('') }
  }

  const acceptAiMealPlan = async () => {
    if (!aiMealPreview || !input.profile) return
    const rounded = { ...aiMealPreview }
    for (const day of Object.values(rounded)) {
      day.total_kcal = Math.round(day.total_kcal || 0); day.total_protein = Math.round(day.total_protein || 0); day.total_carbs = Math.round(day.total_carbs || 0); day.total_fat = Math.round(day.total_fat || 0)
      for (const foods of Object.values(day.repas ?? {})) for (const food of foods) { food.quantite_g = Math.round(food.quantite_g || 0); food.kcal = Math.round(food.kcal || 0); food.proteines = Math.round(food.proteines || 0); food.glucides = Math.round(food.glucides || 0); food.lipides = Math.round(food.lipides || 0) }
    }
    const monday = rounded.lundi || {}
    const { error } = await input.client.from('meal_plans').insert({ user_id: input.profile.id, created_by: input.coachId, total_calories: Math.round(monday.total_kcal || input.calorieTarget), protein_g: Math.round(monday.total_protein || input.protTarget), carbs_g: Math.round(monday.total_carbs || input.carbTarget), fat_g: Math.round(monday.total_fat || input.fatTarget), objective: input.profile.objective, plan_data: rounded, is_active: true } as never)
    if (error) input.showToast(`Erreur : ${error.message}`); else { setAiMealPreview(null); input.showToast('Plan alimentaire IA envoyé au client'); input.refresh() }
  }

  return { showAiModal, setShowAiModal, aiLevel, setAiLevel, aiEquipment, aiTrainingDays, setAiTrainingDays, aiGenerating, aiPreview, setAiPreview, toggleAiEquipment, generateAiProgram, acceptAiPreview, AI_EQUIPMENT, AI_LEVELS, aiMealGenerating, aiMealStreamStatus, aiMealPreview, aiMealPreviewDay, setAiMealPreviewDay, setAiMealPreview, generateAiMealPlan, acceptAiMealPlan }
}
