'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, X, Plus, Minus, Star } from 'lucide-react'
import { normalizeFoodItem } from '../../lib/utils/food'
import BarcodeScanner from './BarcodeScanner'
import { BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../lib/design-tokens'

const MEAL_OPTIONS = [
  { id: 'petit_dejeuner', label: 'Petit-dejeuner' },
  { id: 'dejeuner', label: 'Dejeuner' },
  { id: 'collation', label: 'Collation' },
  { id: 'diner', label: 'Diner' },
]

const CATS = [
  { key: 'proteines', label: 'Proteines', icon: '🥩', patterns: ['poulet', 'dinde', 'boeuf', 'bœuf', 'veau', 'porc', 'saumon', 'thon', 'cabillaud', 'crevette', 'oeuf', 'œuf', 'steak', 'filet', 'escalope', 'jambon', 'bacon', 'merlu', 'sardine', 'truite', 'canard', 'agneau', 'poisson', 'viande', 'seitan', 'tofu', 'tempeh'] },
  { key: 'laitiers', label: 'Produits laitiers', icon: '🥛', patterns: ['yaourt', 'fromage', 'skyr', 'cottage', 'mozzarella', 'parmesan', 'emmental', 'gruyère', 'lait', 'crème', 'ricotta', 'feta'] },
  { key: 'feculents', label: 'Feculents & Cereales', icon: '🍚', patterns: ['riz', 'pâtes', 'pasta', 'quinoa', 'patate', 'pomme de terre', 'pain', 'avoine', 'flocon', 'semoule', 'blé', 'sarrasin', 'lentille', 'pois chiche', 'haricot', 'maïs', 'galette', 'wrap', 'toast', 'muesli', 'céréale', 'granola', 'boulgour', 'épeautre'] },
  { key: 'legumes', label: 'Legumes', icon: '🥦', patterns: ['brocoli', 'épinard', 'courgette', 'tomate', 'concombre', 'salade', 'carotte', 'poivron', 'aubergine', 'chou', 'haricot vert', 'asperge', 'champignon', 'oignon', 'ail', 'avocat', 'légume', 'betterave', 'fenouil', 'artichaut', 'céleri', 'radis', 'endive', 'navet'] },
  { key: 'fruits', label: 'Fruits', icon: '🍎', patterns: ['banane', 'pomme', 'fraise', 'myrtille', 'orange', 'kiwi', 'mangue', 'ananas', 'poire', 'raisin', 'pêche', 'abricot', 'melon', 'pastèque', 'fruit', 'baie', 'datte', 'figue', 'cerise', 'framboise', 'citron', 'grenade', 'compote'] },
  { key: 'oleagineux', label: 'Oleagineux & Graines', icon: '🥜', patterns: ['amande', 'noix', 'cacahuète', 'noisette', 'cajou', 'pistache', 'beurre de', 'graines', 'sésame', 'tournesol', 'lin', 'chia', 'courge'] },
  { key: 'huiles', label: 'Huiles & Matieres grasses', icon: '🫒', patterns: ['huile', 'beurre', 'margarine', 'ghee', 'coco'] },
  { key: 'boissons', label: 'Boissons', icon: '🥤', patterns: ["lait d'", 'lait de', 'boisson', 'smoothie', 'jus', 'eau de coco'] },
  { key: 'supplements', label: 'Supplements', icon: '💪', patterns: ['whey', 'protéine en', 'caséine', 'barre', 'créatine', 'bcaa', 'shaker', 'iso', 'mass gainer'] },
  { key: 'sauces', label: 'Sauces & Condiments', icon: '🍽️', patterns: ['sauce', 'ketchup', 'moutarde', 'vinaigre', 'mayonnaise', 'soja', 'miel', 'sirop', 'confiture', 'épice', 'sel', 'poivre'] },
]

function categorize(name: string) {
  const n = name.toLowerCase()
  for (const cat of CATS) { if (cat.patterns.some(p => n.includes(p))) return cat.key }
  return 'autres'
}

interface FoodSearchProps {
  supabase: any
  userId: string
  defaultMealType?: string
  dateOverride?: string
  onAdded: () => void
  onClose: () => void
}

export default function FoodSearch({ supabase, userId, defaultMealType, dateOverride, onAdded, onClose }: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [allFoods, setAllFoods] = useState<any[]>([])
  const [ansesResults, setAnsesResults] = useState<any[]>([])
  const [likedIds, setLikedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [quantityStr, setQuantityStr] = useState('100')
  const quantity = parseFloat(quantityStr) || 0
  const [mealType, setMealType] = useState(defaultMealType || 'dejeuner')
  const [saving, setSaving] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const today = dateOverride || new Date().toISOString().split('T')[0]

  // Load all fitness foods + user favorites once
  useEffect(() => {
    Promise.all([
      supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').eq('source', 'fitness').order('name').limit(200),
      supabase.from('profiles').select('liked_foods').eq('id', userId).single(),
    ]).then(([foodRes, profRes]: any[]) => {
      const foods = (foodRes.data || []).map((f: any) => ({ ...normalizeFoodItem(f), cat: categorize(f.name || '') }))
      setAllFoods(foods)
      const lf = profRes.data?.liked_foods
      setLikedIds(Array.isArray(lf) ? lf : [])
      setLoading(false)
    })
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Live search ANSES/Ciqual when query >= 2 chars
  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (query.length < 2) { setAnsesResults([]); return }
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').eq('source', 'ANSES').ilike('name', `%${query}%`).limit(20)
      setAnsesResults((data || []).map((f: any) => ({ ...normalizeFoodItem(f), cat: categorize(f.name || '') })))
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [query])

  const filtered = query.length >= 1
    ? allFoods.filter(f => f.nom.toLowerCase().includes(query.toLowerCase()))
    : allFoods

  const favorites = filtered.filter(f => likedIds.includes(f.id))
  const grouped = CATS.map(cat => ({
    ...cat,
    foods: filtered.filter(f => f.cat === cat.key && !likedIds.includes(f.id)),
  })).filter(g => g.foods.length > 0)
  const autres = filtered.filter(f => f.cat === 'autres' && !likedIds.includes(f.id))
  if (autres.length > 0) grouped.push({ key: 'autres', label: 'Autres', icon: '🍽️', patterns: [], foods: autres })
  // Add ANSES results as a separate group when searching
  if (query.length >= 2 && ansesResults.length > 0) {
    grouped.push({ key: 'ciqual', label: 'Base Ciqual/ANSES', icon: '📊', patterns: [], foods: ansesResults })
  }

  async function addFood() {
    if (!selected || saving) return
    setSaving(true)
    const cal = Math.round((selected.calories * quantity) / 100)
    const prot = Math.round(((selected.proteines * quantity) / 100) * 10) / 10
    const gluc = Math.round(((selected.glucides * quantity) / 100) * 10) / 10
    const lip = Math.round(((selected.lipides * quantity) / 100) * 10) / 10
    await supabase.from('daily_food_logs').insert({
      user_id: userId, date: today, meal_type: mealType,
      custom_name: selected.nom,
      quantity_g: quantity, calories: cal, protein: prot, carbs: gluc, fat: lip,
    })
    setSaving(false)
    onAdded()
  }

  // Quantity modal for selected food
  if (selected) {
    // All selected.* values are per 100g from normalizeFoodItem
    const cal = Math.round((selected.calories * quantity) / 100)
    const prot = Math.round(((selected.proteines * quantity) / 100) * 10) / 10
    const gluc = Math.round(((selected.glucides * quantity) / 100) * 10) / 10
    const lip = Math.round(((selected.lipides * quantity) / 100) * 10) / 10
    return (
      <>
      <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 400, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '24px 20px', zIndex: 1101, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: FONT_ALT, fontSize: '1.2rem', fontWeight: 800, margin: 0, color: TEXT_PRIMARY, letterSpacing: '1px', textTransform: 'uppercase' }}>{selected.nom}</h3>
            <button onClick={() => setSelected(null)} style={{ width: 32, height: 32, background: BG_CARD_2, borderRadius: 12, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color={TEXT_MUTED} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
            <button onClick={() => setQuantityStr(String(Math.max(0, quantity - 25)))} style={{ width: 44, height: 44, borderRadius: 12, background: BG_BASE, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={18} color={TEXT_PRIMARY} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={quantityStr} onChange={e => setQuantityStr(e.target.value.replace(/[^0-9]/g, ''))} onFocus={e => e.target.select()}
                style={{ width: 80, background: 'transparent', border: 'none', color: GOLD, fontSize: '2.4rem', fontFamily: FONT_DISPLAY, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
              <div style={{ fontSize: '0.72rem', fontFamily: FONT_ALT, fontWeight: 700, color: TEXT_MUTED, marginTop: -4, letterSpacing: '1px', textTransform: 'uppercase' }}>grammes</div>
            </div>
            <button onClick={() => setQuantityStr(String(quantity + 25))} style={{ width: 44, height: 44, borderRadius: 12, background: BG_BASE, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={18} color={TEXT_PRIMARY} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            {[
              { l: 'Kcal', v: cal, c: GOLD },
              { l: 'Prot', v: `${prot}g`, c: GOLD },
              { l: 'Gluc', v: `${gluc}g`, c: GOLD },
              { l: 'Lip', v: `${lip}g`, c: GOLD },
            ].map(m => (
              <div key={m.l} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.1rem', fontWeight: 700, color: m.c }}>{m.v}</div>
                <div style={{ fontSize: '0.55rem', fontFamily: FONT_ALT, color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{m.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {MEAL_OPTIONS.map(m => (
              <button key={m.id} onClick={() => setMealType(m.id)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontFamily: FONT_ALT, fontSize: '0.68rem', fontWeight: 800,
                letterSpacing: '1px', textTransform: 'uppercase',
                background: mealType === m.id ? GOLD : BG_BASE, color: mealType === m.id ? '#0D0B08' : TEXT_MUTED,
              }}>{m.label}</button>
            ))}
          </div>
          <button onClick={addFood} disabled={saving} style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: saving ? 'wait' : 'pointer',
            background: GOLD, color: '#0D0B08',
            fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 800,
            letterSpacing: '1px', textTransform: 'uppercase', opacity: saving ? 0.6 : 1,
            
          }}>{saving ? 'Ajout...' : 'Ajouter au repas'}</button>
      </div>
      </>
    )
  }

  // Main view -- centered popup
  return (
    <>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100 }} />
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 440, maxHeight: '80vh', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 20, zIndex: 1101, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
      <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: 2, color: TEXT_PRIMARY }}>AJOUTER UN ALIMENT</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 22, cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} color={GOLD} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un aliment..." autoFocus
              style={{ width: '100%', padding: '12px 12px 12px 38px', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT_PRIMARY, fontSize: 15, fontFamily: FONT_BODY, outline: 'none' }} />
          </div>
          <button onClick={() => setShowScanner(true)} style={{ width: 42, height: 42, borderRadius: 12, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>📷</button>
        </div>
      </div>

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner supabase={supabase} userId={userId} defaultMealType={mealType}
          onProductAdded={() => { setShowScanner(false); onAdded() }}
          onClose={() => setShowScanner(false)} />
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
        {loading && <p style={{ textAlign: 'center', color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: '0.82rem', padding: '32px 0' }}>Chargement...</p>}

        {/* Favorites section */}
        {favorites.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, position: 'sticky', top: 0, background: BG_CARD, paddingTop: 4, paddingBottom: 4, zIndex: 1 }}>
              <Star size={14} color={GOLD} fill={GOLD} />
              <span style={{ fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 800, color: GOLD, letterSpacing: '2px', textTransform: 'uppercase' }}>Mes favoris</span>
              <span style={{ fontSize: '0.6rem', fontFamily: FONT_BODY, color: TEXT_MUTED }}>({favorites.length})</span>
            </div>
            {favorites.map(food => (
              <FoodRow key={food.id} food={food} isFav onSelect={() => { setSelected(food); setQuantityStr('100') }} />
            ))}
          </div>
        )}

        {/* Foods by category */}
        {grouped.map(cat => (
          <div key={cat.key} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, position: 'sticky', top: 0, background: BG_CARD, paddingTop: 4, paddingBottom: 4, zIndex: 1 }}>
              <span style={{ fontSize: '0.85rem' }}>{cat.icon}</span>
              <span style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 800, color: TEXT_MUTED, letterSpacing: '2px', textTransform: 'uppercase' }}>{cat.label}</span>
              <span style={{ fontSize: '0.6rem', fontFamily: FONT_BODY, color: TEXT_MUTED }}>({cat.foods.length})</span>
            </div>
            {cat.foods.map((food: any) => (
              <FoodRow key={food.id} food={food} onSelect={() => { setSelected(food); setQuantityStr('100') }} />
            ))}
          </div>
        ))}

        {!loading && query.length >= 1 && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: '0.82rem', padding: '32px 0' }}>Aucun resultat pour &quot;{query}&quot;</p>
        )}
      </div>
    </div>
    </>
  )
}

function FoodRow({ food, isFav, onSelect }: { food: any; isFav?: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 0', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.86rem', fontFamily: FONT_BODY, fontWeight: 400, color: TEXT_PRIMARY, display: 'flex', alignItems: 'center', gap: 6 }}>
          {isFav && <Star size={10} color={GOLD} fill={GOLD} style={{ flexShrink: 0 }} />}
          <span>{food.nom}</span>
          {food.source === 'ANSES' && <span style={{ fontFamily: FONT_ALT, fontSize: 7, fontWeight: 700, letterSpacing: 1, padding: '1px 5px', borderRadius: 4, background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD_RULE}`, flexShrink: 0 }}>CIQUAL</span>}
        </div>
        <div style={{ fontSize: '0.65rem', fontFamily: FONT_ALT, fontWeight: 700, color: TEXT_MUTED, marginTop: 2, display: 'flex', gap: 6 }}>
          <span style={{ color: GOLD }}>{food.calories} kcal</span>
          <span>P{food.proteines}</span>
          <span>G{food.glucides}</span>
          <span>L{food.lipides}</span>
        </div>
      </div>
      <Plus size={16} color={GOLD} />
    </button>
  )
}
