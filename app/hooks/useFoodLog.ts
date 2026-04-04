'use client'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import type { SupabaseClient } from '@supabase/supabase-js'

interface UseFoodLogParams {
  supabase: SupabaseClient
  userId: string | undefined
  onMutate: () => void // called after adding food to refresh data
}

export default function useFoodLog({ supabase, userId, onMutate }: UseFoodLogParams) {
  const [foodSearch, setFoodSearch] = useState('')
  const [foodResults, setFoodResults] = useState<any[]>([])
  const [selectedFood, setSelectedFood] = useState<any>(null)
  const [foodQty, setFoodQty] = useState('100')
  const [mealType, setMealType] = useState('lunch')
  const [customFoodForm, setCustomFoodForm] = useState({ name: '', brand: '', calories_per_100g: '', proteins_per_100g: '', carbs_per_100g: '', fats_per_100g: '' })
  const [searchTab, setSearchTab] = useState<'fitness' | 'anses' | 'custom'>('fitness')
  const searchRef = useRef<any>(null)

  // Debounced food search
  useEffect(() => {
    clearTimeout(searchRef.current)
    if (foodSearch.length < 2) { setFoodResults([]); return }
    searchRef.current = setTimeout(async () => {
      if (searchTab === 'fitness') {
        const { data } = await supabase.from('food_items').select('*').eq('source', 'fitness').ilike('name', `%${foodSearch}%`).limit(50)
        setFoodResults(data || [])
      } else if (searchTab === 'anses') {
        const { data } = await supabase.from('food_items').select('*').eq('source', 'ANSES').ilike('name', `%${foodSearch}%`).limit(50)
        setFoodResults(data || [])
      } else {
        const { data } = await supabase.from('custom_foods').select('*').eq('user_id', userId).ilike('name', `%${foodSearch}%`).limit(20)
        setFoodResults(data || [])
      }
    }, 300)
  }, [foodSearch, searchTab])

  async function addFoodToMeal() {
    if (!selectedFood || !userId) return
    const qty = parseFloat(foodQty) || 100
    const isCustom = searchTab === 'custom'
    const cals = isCustom ? selectedFood.calories_per_100g : selectedFood.energy_kcal || selectedFood.calories || 0
    const prot = isCustom ? selectedFood.proteins_per_100g : selectedFood.proteins || 0
    const carb = isCustom ? selectedFood.carbs_per_100g : selectedFood.carbohydrates || selectedFood.carbs || 0
    const fat = isCustom ? selectedFood.fats_per_100g : selectedFood.fat || selectedFood.fats || 0
    await supabase.from('daily_food_logs').insert({
      user_id: userId, meal_type: mealType, date: new Date().toISOString().split('T')[0],
      custom_name: `${selectedFood.name}${selectedFood.brand ? ` (${selectedFood.brand})` : ''} ${qty}g`,
      calories: Math.round(cals * qty / 100), protein: Math.round(prot * qty / 100 * 10) / 10,
      carbs: Math.round(carb * qty / 100 * 10) / 10, fat: Math.round(fat * qty / 100 * 10) / 10,
      quantity_g: qty,
    })
    setSelectedFood(null); setFoodSearch(''); setFoodResults([])
    toast.success('Aliment ajouté !')
    onMutate()
  }

  async function addCustomFood() {
    const f = customFoodForm
    if (!f.name || !f.calories_per_100g || !userId) return
    await supabase.from('custom_foods').insert({
      user_id: userId, name: f.name, brand: f.brand,
      calories_per_100g: parseFloat(f.calories_per_100g), proteins_per_100g: parseFloat(f.proteins_per_100g) || 0,
      carbs_per_100g: parseFloat(f.carbs_per_100g) || 0, fats_per_100g: parseFloat(f.fats_per_100g) || 0,
    })
    setCustomFoodForm({ name: '', brand: '', calories_per_100g: '', proteins_per_100g: '', carbs_per_100g: '', fats_per_100g: '' })
    toast.success('Aliment créé !')
    onMutate()
  }

  return {
    foodSearch, setFoodSearch, foodResults, selectedFood, setSelectedFood,
    foodQty, setFoodQty, mealType, setMealType,
    customFoodForm, setCustomFoodForm, searchTab, setSearchTab,
    addFoodToMeal, addCustomFood,
  }
}
