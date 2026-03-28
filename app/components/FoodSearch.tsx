'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, X, Plus, Minus } from 'lucide-react'
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

interface FoodSearchProps {
  supabase: any
  userId: string
  defaultMealType?: string
  onAdded: () => void
  onClose: () => void
}

export default function FoodSearch({ supabase, userId, defaultMealType, onAdded, onClose }: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [quantity, setQuantity] = useState(100)
  const [mealType, setMealType] = useState(defaultMealType || 'dejeuner')
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('food_items')
        .select('id, name, energy_kcal, proteins, carbohydrates, fat, source')
        .eq('source', 'fitness')
        .ilike('name', `%${query}%`)
        .limit(20)
      setResults((data || []).map(normalizeFoodItem))
      setSearching(false)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function addFood() {
    if (!selected || saving) return
    setSaving(true)
    const cal = Math.round((selected.calories / 100) * quantity)
    const prot = Math.round((selected.proteines / 100) * quantity * 10) / 10
    const gluc = Math.round((selected.glucides / 100) * quantity * 10) / 10
    const lip = Math.round((selected.lipides / 100) * quantity * 10) / 10

    await supabase.from('meal_logs').insert({
      user_id: userId,
      date: today,
      meal_type: mealType,
      food_item_id: selected.id,
      food_name: selected.nom,
      quantity_g: quantity,
      calories: cal,
      proteines: prot,
      glucides: gluc,
      lipides: lip,
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

          {/* Quantity stepper */}
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

          {/* Macros preview */}
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

          {/* Meal type selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {MEAL_OPTIONS.map(m => (
              <button key={m.id} onClick={() => setMealType(m.id)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700,
                background: mealType === m.id ? `${GOLD}20` : BG,
                color: mealType === m.id ? GOLD : MUTED,
              }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Add button */}
          <button onClick={addFood} disabled={saving} style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: saving ? 'wait' : 'pointer',
            background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, color: '#000',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Ajout...' : 'Ajouter au repas'}
          </button>
        </div>
      </div>
    )
  }

  // Search view
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', flexDirection: 'column' }}>
      {/* Search header */}
      <div style={{ padding: '16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color={GOLD} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un aliment fitness..."
            style={{ width: '100%', padding: '12px 12px 12px 38px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT, fontSize: '0.9rem', outline: 'none' }} />
        </div>
        <button onClick={onClose} style={{ padding: '8px 14px', background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Fermer</button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {query.length < 2 && (
          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.82rem', padding: '32px 0' }}>Tape au moins 2 caractères</p>
        )}
        {searching && <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.82rem', padding: '20px 0' }}>Recherche...</p>}
        {!searching && query.length >= 2 && results.length === 0 && (
          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.82rem', padding: '32px 0' }}>Aucun résultat</p>
        )}
        {results.map(food => (
          <button key={food.id} onClick={() => { setSelected(food); setQuantity(100) }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 0', borderBottom: `1px solid ${BORDER}`, background: 'none', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: BORDER, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.88rem', color: TEXT, fontWeight: 600 }}>{food.nom}</div>
              <div style={{ fontSize: '0.68rem', color: MUTED, marginTop: 2 }}>
                {Math.round(food.calories)} kcal · {Math.round(food.proteines)}P · {Math.round(food.glucides)}G · {Math.round(food.lipides)}L
                <span style={{ marginLeft: 6, fontSize: '0.55rem', color: '#4B5563', background: '#1A1A1A', padding: '1px 5px', borderRadius: 4 }}>Fitness</span>
              </div>
            </div>
            <Plus size={16} color={GOLD} />
          </button>
        ))}
      </div>
    </div>
  )
}
