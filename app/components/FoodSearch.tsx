'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, X, Plus, Minus, Star } from 'lucide-react'
import { normalizeFoodItem } from '../../lib/utils/food'

const GOLD = '#C9A84C'
const BG = '#0A0A0A'
const CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'

const MEAL_OPTIONS = [
  { id: 'petit_dejeuner', label: 'Petit-déjeuner' },
  { id: 'dejeuner', label: 'Déjeuner' },
  { id: 'collation', label: 'Collation' },
  { id: 'diner', label: 'Dîner' },
]

const CATS = [
  { key: 'proteines', label: 'Protéines', icon: '🥩', patterns: ['poulet', 'dinde', 'boeuf', 'bœuf', 'veau', 'porc', 'saumon', 'thon', 'cabillaud', 'crevette', 'oeuf', 'œuf', 'steak', 'filet', 'escalope', 'jambon', 'bacon', 'merlu', 'sardine', 'truite', 'canard', 'agneau', 'poisson', 'viande', 'seitan', 'tofu', 'tempeh'] },
  { key: 'laitiers', label: 'Produits laitiers', icon: '🥛', patterns: ['yaourt', 'fromage', 'skyr', 'cottage', 'mozzarella', 'parmesan', 'emmental', 'gruyère', 'lait', 'crème', 'ricotta', 'feta'] },
  { key: 'feculents', label: 'Féculents & Céréales', icon: '🍚', patterns: ['riz', 'pâtes', 'pasta', 'quinoa', 'patate', 'pomme de terre', 'pain', 'avoine', 'flocon', 'semoule', 'blé', 'sarrasin', 'lentille', 'pois chiche', 'haricot', 'maïs', 'galette', 'wrap', 'toast', 'muesli', 'céréale', 'granola', 'boulgour', 'épeautre'] },
  { key: 'legumes', label: 'Légumes', icon: '🥦', patterns: ['brocoli', 'épinard', 'courgette', 'tomate', 'concombre', 'salade', 'carotte', 'poivron', 'aubergine', 'chou', 'haricot vert', 'asperge', 'champignon', 'oignon', 'ail', 'avocat', 'légume', 'betterave', 'fenouil', 'artichaut', 'céleri', 'radis', 'endive', 'navet'] },
  { key: 'fruits', label: 'Fruits', icon: '🍎', patterns: ['banane', 'pomme', 'fraise', 'myrtille', 'orange', 'kiwi', 'mangue', 'ananas', 'poire', 'raisin', 'pêche', 'abricot', 'melon', 'pastèque', 'fruit', 'baie', 'datte', 'figue', 'cerise', 'framboise', 'citron', 'grenade', 'compote'] },
  { key: 'oleagineux', label: 'Oléagineux & Graines', icon: '🥜', patterns: ['amande', 'noix', 'cacahuète', 'noisette', 'cajou', 'pistache', 'beurre de', 'graines', 'sésame', 'tournesol', 'lin', 'chia', 'courge'] },
  { key: 'huiles', label: 'Huiles & Matières grasses', icon: '🫒', patterns: ['huile', 'beurre', 'margarine', 'ghee', 'coco'] },
  { key: 'boissons', label: 'Boissons', icon: '🥤', patterns: ["lait d'", 'lait de', 'boisson', 'smoothie', 'jus', 'eau de coco'] },
  { key: 'supplements', label: 'Suppléments', icon: '💪', patterns: ['whey', 'protéine en', 'caséine', 'barre', 'créatine', 'bcaa', 'shaker', 'iso', 'mass gainer'] },
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
  onAdded: () => void
  onClose: () => void
}

export default function FoodSearch({ supabase, userId, defaultMealType, onAdded, onClose }: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [allFoods, setAllFoods] = useState<any[]>([])
  const [likedIds, setLikedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [quantity, setQuantity] = useState(100)
  const [mealType, setMealType] = useState(defaultMealType || 'dejeuner')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().split('T')[0]

  // Load all fitness foods + user favorites once
  useEffect(() => {
    Promise.all([
      supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').eq('source', 'fitness').order('name'),
      supabase.from('profiles').select('liked_foods').eq('id', userId).single(),
    ]).then(([foodRes, profRes]: any[]) => {
      const foods = (foodRes.data || []).map((f: any) => ({ ...normalizeFoodItem(f), cat: categorize(f.name || '') }))
      setAllFoods(foods)
      setLikedIds(profRes.data?.liked_foods || [])
      setLoading(false)
    })
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

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

  async function addFood() {
    if (!selected || saving) return
    setSaving(true)
    const cal = Math.round((selected.calories / 100) * quantity)
    const prot = Math.round((selected.proteines / 100) * quantity * 10) / 10
    const gluc = Math.round((selected.glucides / 100) * quantity * 10) / 10
    const lip = Math.round((selected.lipides / 100) * quantity * 10) / 10
    await supabase.from('meal_logs').insert({
      user_id: userId, date: today, meal_type: mealType,
      food_item_id: selected.id, food_name: selected.nom,
      quantity_g: quantity, calories: cal, proteines: prot, glucides: gluc, lipides: lip,
      source: selected.source,
    })
    setSaving(false)
    onAdded()
  }

  // Quantity modal for selected food
  if (selected) {
    const cal = Math.round((selected.calories / 100) * quantity)
    const prot = Math.round((selected.proteines / 100) * quantity * 10) / 10
    const gluc = Math.round((selected.glucides / 100) * quantity * 10) / 10
    const lip = Math.round((selected.lipides / 100) * quantity * 10) / 10
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ background: CARD, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, margin: 0, color: TEXT }}>{selected.nom}</h3>
            <button onClick={() => setSelected(null)} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} color={MUTED} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
            <button onClick={() => setQuantity(q => Math.max(5, q - 25))} style={{ width: 44, height: 44, borderRadius: 12, background: BG, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={18} color={TEXT} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 0))} inputMode="numeric"
                style={{ width: 80, background: 'transparent', border: 'none', color: GOLD, fontSize: '2.4rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textAlign: 'center', outline: 'none' }} />
              <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: -4 }}>grammes</div>
            </div>
            <button onClick={() => setQuantity(q => q + 25)} style={{ width: 44, height: 44, borderRadius: 12, background: BG, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={18} color={TEXT} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            {[
              { l: 'Kcal', v: cal, c: '#EF4444' },
              { l: 'Prot', v: `${prot}g`, c: '#3B82F6' },
              { l: 'Gluc', v: `${gluc}g`, c: '#F59E0B' },
              { l: 'Lip', v: `${lip}g`, c: '#22C55E' },
            ].map(m => (
              <div key={m.l} style={{ background: BG, borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: m.c }}>{m.v}</div>
                <div style={{ fontSize: '0.55rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase' }}>{m.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {MEAL_OPTIONS.map(m => (
              <button key={m.id} onClick={() => setMealType(m.id)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700,
                background: mealType === m.id ? `${GOLD}20` : BG, color: mealType === m.id ? GOLD : MUTED,
              }}>{m.label}</button>
            ))}
          </div>
          <button onClick={addFood} disabled={saving} style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: saving ? 'wait' : 'pointer',
            background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, color: '#000',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Ajout...' : 'Ajouter au repas'}</button>
        </div>
      </div>
    )
  }

  // Main view — all foods by category
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color={GOLD} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder={`Filtrer ${allFoods.length} aliments fitness...`}
            style={{ width: '100%', padding: '12px 12px 12px 38px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT, fontSize: '0.9rem', outline: 'none' }} />
        </div>
        <button onClick={onClose} style={{ padding: '8px 14px', background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Fermer</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
        {loading && <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.82rem', padding: '32px 0' }}>Chargement...</p>}

        {/* Favorites section */}
        {favorites.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, position: 'sticky', top: 0, background: 'rgba(0,0,0,0.9)', paddingTop: 4, paddingBottom: 4, zIndex: 1 }}>
              <Star size={14} color={GOLD} fill={GOLD} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 700, color: GOLD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Mes favoris</span>
              <span style={{ fontSize: '0.6rem', color: MUTED }}>({favorites.length})</span>
            </div>
            {favorites.map(food => (
              <FoodRow key={food.id} food={food} isFav onSelect={() => { setSelected(food); setQuantity(100) }} />
            ))}
          </div>
        )}

        {/* Foods by category */}
        {grouped.map(cat => (
          <div key={cat.key} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, position: 'sticky', top: 0, background: 'rgba(0,0,0,0.9)', paddingTop: 4, paddingBottom: 4, zIndex: 1 }}>
              <span style={{ fontSize: '0.85rem' }}>{cat.icon}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{cat.label}</span>
              <span style={{ fontSize: '0.6rem', color: MUTED }}>({cat.foods.length})</span>
            </div>
            {cat.foods.map((food: any) => (
              <FoodRow key={food.id} food={food} onSelect={() => { setSelected(food); setQuantity(100) }} />
            ))}
          </div>
        ))}

        {!loading && query.length >= 1 && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.82rem', padding: '32px 0' }}>Aucun résultat pour &quot;{query}&quot;</p>
        )}
      </div>
    </div>
  )
}

function FoodRow({ food, isFav, onSelect }: { food: any; isFav?: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 0', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.86rem', color: TEXT, fontWeight: 600 }}>
          {isFav && <Star size={10} color={GOLD} fill={GOLD} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
          {food.nom}
        </div>
        <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: 2, display: 'flex', gap: 6 }}>
          <span style={{ color: GOLD }}>{food.calories} kcal</span>
          <span style={{ color: '#60a5fa' }}>P{food.proteines}</span>
          <span style={{ color: '#4ade80' }}>G{food.glucides}</span>
          <span style={{ color: '#f59e0b' }}>L{food.lipides}</span>
        </div>
      </div>
      <Plus size={16} color={GOLD} />
    </button>
  )
}
