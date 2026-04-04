import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || ''
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')

    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      console.error('[food-search] Missing SUPABASE_URL or key')
      return NextResponse.json({ results: [], error: 'config' })
    }

    const supabase = createClient(url, key.trim())

    // Search in community_foods
    const { data: communityData, error: communityError } = await supabase
      .from('community_foods')
      .select('*')
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .order('uses_count', { ascending: false })
      .limit(limit)

    if (communityError) {
      console.error('[food-search] community_foods error:', communityError.message)
    }

    // Search in food_items (fitness foods)
    const { data: fitnessData, error: fitnessError } = await supabase
      .from('food_items')
      .select('id, name, energy_kcal, proteins, carbohydrates, fat')
      .ilike('name', `%${q}%`)
      .limit(Math.max(5, limit))

    if (fitnessError) {
      console.error('[food-search] food_items error:', fitnessError.message)
    }

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

    const communityResults = (communityData || []).map((f: any) => ({ ...f, source: 'community' }))

    return NextResponse.json({ results: [...communityResults, ...fitnessResults].slice(0, limit) })
  } catch (e: any) {
    console.error('[food-search] Caught error:', e.message)
    return NextResponse.json({ results: [], error: e.message })
  }
}
