import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const barcode = (req.nextUrl.searchParams.get('code') || '').replace(/\D/g, '').trim()
  if (!barcode || barcode.length < 4) {
    return NextResponse.json({ error: 'Code-barres invalide' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
      headers: { 'User-Agent': 'MoovX/1.0 (contact@moovx.ch)' },
    })
    const data = await res.json()
    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ found: false, error: 'Produit non trouvé' })
    }

    const p = data.product
    const n = p.nutriments || {}

    return NextResponse.json({
      found: true,
      product: {
        name: p.product_name_fr || p.product_name || 'Produit inconnu',
        brand: p.brands || '',
        image_url: p.image_front_small_url || p.image_url || null,
        barcode,
        per_100g: {
          calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
          proteins: Math.round((n.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
          fat: Math.round((n.fat_100g || 0) * 10) / 10,
          fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
          sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
        },
        serving_size: p.serving_size || null,
        nutriscore: p.nutriscore_grade || null,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur de connexion à Open Food Facts' }, { status: 500 })
  }
}
