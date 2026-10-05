import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rate = checkRateLimit(`food-search:${user.id}`, 60)
  if (!rate.allowed) return NextResponse.json({ error: 'Trop de recherches' }, { status: 429 })

  try {
    const q = (req.nextUrl.searchParams.get('q') || '').replace(/[%_,()\\]/g, '').trim().slice(0, 100)
    const limit = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 10))

    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      console.error('[food-search] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ results: [], error: 'config' }, { status: 500 })
    }

    const supabase = createClient(url, key.trim())

    // Search in community_foods
    const { data: communityData, error: communityError } = await supabase
      .from('community_foods')
      .select('id,name,brand,barcode,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,serving_size_g,serving_name')
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .order('uses_count', { ascending: false })
      .limit(limit)

    if (communityError) {
      console.error('[food-search] community_foods error:', communityError.message)
    }

    // Search in food_items (fitness foods)
    const { data: fitnessData, error: fitnessError } = await supabase
      .from('selectable_food_items')
      .select('id, name, energy_kcal, proteins, carbohydrates, fat, source, source_version, source_url, source_license')
      .ilike('name', `%${q}%`)
      .limit(Math.max(5, limit))

    if (fitnessError) {
      console.error('[food-search] food_items error:', fitnessError.message)
    }

    const fitnessResults = (fitnessData || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      brand: f.source === 'ANSES' ? 'ANSES · Ciqual 2025' : f.source === 'fitness' ? 'MoovX Fitness' : 'Coach',
      calories_per_100g: Math.round(f.energy_kcal || 0),
      protein_per_100g: Math.round((f.proteins || 0) * 10) / 10,
      carbs_per_100g: Math.round((f.carbohydrates || 0) * 10) / 10,
      fat_per_100g: Math.round((f.fat || 0) * 10) / 10,
      serving_size_g: 100,
      serving_name: '100g',
      source: f.source,
      source_version: f.source_version, source_url: f.source_url, source_license: f.source_license,
    }))

    const communityResults = (communityData || []).map((f: any) => ({ ...f, source: 'community' }))

    return NextResponse.json({ results: [...communityResults, ...fitnessResults].slice(0, limit) })
  } catch (e: any) {
    console.error('[food-search] Caught error:', e.message)
    return NextResponse.json({ results: [], error: e.message })
  }
}
