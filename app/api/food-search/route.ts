import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || ''
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')

    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).trim()
    )

    // Search in community_foods by name (ilike for simplicity)
    const { data, error } = await supabase
      .from('community_foods')
      .select('*')
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .order('uses_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[food-search] Error:', error.message)
      return NextResponse.json({ results: [] })
    }

    // Also search in food_items (existing fitness foods)
    const { data: fitnessData } = await supabase
      .from('food_items')
      .select('id, name, energy_kcal, proteins, carbohydrates, fat')
      .ilike('name', `%${q}%`)
      .limit(5)

    const fitnessResults = (fitnessData || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      brand: 'MoovX Fitness',
      calories_per_100g: Math.round(f.energy_kcal || 0),
      protein_per_100g: Math.round((f.proteins || 0) * 10) / 10,
      carbs_per_100g: Math.round((f.carbohydrates || 0) * 10) / 10,
      fat_per_100g: Math.round((f.fat || 0) * 10) / 10,
      serving_size_g: 100,
      serving_name: '100g',
      source: 'fitness',
    }))

    const communityResults = (data || []).map((f: any) => ({ ...f, source: 'community' }))

    return NextResponse.json({ results: [...communityResults, ...fitnessResults].slice(0, limit) })
  } catch (e: any) {
    console.error('[food-search] Error:', e.message)
    return NextResponse.json({ results: [] })
  }
}
