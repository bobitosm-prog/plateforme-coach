'use client'
import { useState, useMemo } from 'react'
import { X, Copy, Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

const GOLD = '#C9A84C'
const BG = '#0A0A0A'
const CARD = '#0d0d0d'
const BORDER = '#1a1a1a'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'

function getAisle(name: string): { aisle: string; order: number } {
  const n = name.toLowerCase()
  if (/poulet|dinde|boeuf|bœuf|steak|filet|bavette|porc|jambon|bacon|viande|escalope|agneau|veau/.test(n)) return { aisle: '🥩 Boucherie', order: 1 }
  if (/saumon|thon|cabillaud|crevette|sardine|maquereau|truite|colin|dorade|bar|poisson/.test(n)) return { aisle: '🐟 Poissonnerie', order: 2 }
  if (/oeuf|œuf/.test(n)) return { aisle: '🥚 Oeufs', order: 3 }
  if (/yaourt|fromage|skyr|cottage|mozzarella|emmental|gruyère|parmesan|ricotta|feta|lait(?!.*amande|.*avoine|.*soja|.*coco)|crème/.test(n)) return { aisle: '🧀 Produits laitiers', order: 4 }
  if (/patate|pomme.*de.*terre|brocoli|épinard|haricot.*vert|courgette|asperge|poivron|tomate|concombre|carotte|chou|champignon|salade|avocat|oignon|ail|aubergine|betterave|laitue|légume/.test(n)) return { aisle: '🥬 Légumes', order: 5 }
  if (/banane|pomme(?!.*terre)|orange|fraise|myrtille|framboise|kiwi|mangue|ananas|poire|raisin|melon|pêche|abricot|citron/.test(n)) return { aisle: '🍎 Fruits', order: 6 }
  if (/riz|pâte|quinoa|boulgour|semoule|pain|flocon|muesli|galette|tortilla|wrap|lentille|pois.*chiche|haricot.*rouge|haricot.*blanc|avoine|céréale|granola/.test(n)) return { aisle: '🌾 Féculents', order: 7 }
  if (/amande|noix|cacahuète|noisette|graine|beurre.*cacahuète|beurre.*amande|chia|lin/.test(n)) return { aisle: '🥜 Fruits secs', order: 8 }
  if (/huile|beurre(?!.*cacahuète|.*amande)|ghee|coco/.test(n)) return { aisle: '🫒 Huiles', order: 9 }
  if (/whey|caséine|protéine|bcaa|créatine|barre.*protéin/.test(n)) return { aisle: '💪 Suppléments', order: 10 }
  if (/sauce|vinaigre|moutarde|miel|sirop|soja/.test(n)) return { aisle: '🍯 Condiments', order: 11 }
  if (/lait.*amande|lait.*avoine|lait.*soja|lait.*coco|jus|eau.*coco/.test(n)) return { aisle: '🥤 Boissons', order: 12 }
  if (/tofu|tempeh|seitan/.test(n)) return { aisle: '🌿 Végétal', order: 14 }
  return { aisle: '🛒 Autres', order: 99 }
}

function roundUp(g: number): string {
  if (g >= 1000) return `${(Math.ceil(g / 100) / 10).toFixed(1)} kg`
  if (g > 500) return `${Math.ceil(g / 50) * 50}g`
  return `${Math.ceil(g / 25) * 25}g`
}

interface ShoppingListProps {
  planData: Record<string, any> // { lundi: { repas: { ... } }, mardi: ... }
  onClose: () => void
}

export default function ShoppingList({ planData, onClose }: ShoppingListProps) {
  const storageKey = `moovx-shopping-${new Date().toISOString().split('T')[0]}`
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}') } catch { return {} }
  })

  // Aggregate all ingredients from 7 days
  const { aisles, totalItems } = useMemo(() => {
    const agg: Record<string, number> = {}

    for (const dayData of Object.values(planData || {})) {
      if (!dayData?.repas) continue
      for (const foods of Object.values(dayData.repas) as any[]) {
        if (!Array.isArray(foods)) continue
        for (const food of foods) {
          const name = (food.aliment || food.name || '').trim()
          if (!name) continue
          const qty = parseFloat(food.quantite_g || food.quantity_g || '0') || 0
          agg[name] = (agg[name] || 0) + qty
        }
      }
    }

    // Group by aisle
    const grouped: Record<string, { items: { name: string; qty: number; display: string }[]; order: number }> = {}
    for (const [name, qty] of Object.entries(agg)) {
      const { aisle, order } = getAisle(name)
      if (!grouped[aisle]) grouped[aisle] = { items: [], order }
      grouped[aisle].items.push({ name, qty, display: roundUp(qty) })
    }

    // Sort aisles by order, items by name
    const sorted = Object.entries(grouped).sort((a, b) => a[1].order - b[1].order)
    sorted.forEach(([, v]) => v.items.sort((a, b) => a.name.localeCompare(b.name)))

    return { aisles: sorted, totalItems: Object.keys(agg).length }
  }, [planData])

  const checkedCount = Object.values(checked).filter(Boolean).length

  function toggle(name: string) {
    const next = { ...checked, [name]: !checked[name] }
    setChecked(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }

  function resetAll() {
    setChecked({})
    try { localStorage.removeItem(storageKey) } catch {}
  }

  function copyToClipboard() {
    const lines = ['🛒 LISTE DE COURSES — MoovX', '']
    for (const [aisle, { items }] of aisles) {
      lines.push(aisle.toUpperCase())
      for (const item of items) {
        lines.push(`☐ ${item.name} — ${item.display}`)
      }
      lines.push('')
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast.success('Liste copiée !')).catch(() => toast.error('Erreur de copie'))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 1050, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT, letterSpacing: '0.04em' }}>LISTE DE COURSES</div>
          <div style={{ fontSize: '0.65rem', color: MUTED }}>{totalItems} articles · {checkedCount}/{totalItems} cochés</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', color: MUTED, fontSize: '0.72rem', fontWeight: 600 }}>
            <Copy size={13} /> Copier
          </button>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={MUTED} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 80px' }}>
        {aisles.length === 0 ? (
          <p style={{ textAlign: 'center', color: MUTED, padding: '40px 0' }}>Aucun plan alimentaire pour générer la liste.</p>
        ) : (
          aisles.map(([aisle, { items }]) => (
            <div key={aisle} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: GOLD, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, position: 'sticky', top: 0, background: BG, paddingTop: 4, paddingBottom: 4, zIndex: 1 }}>
                {aisle}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(item => {
                  const done = !!checked[item.name]
                  return (
                    <button key={item.name} onClick={() => toggle(item.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: 'none', background: done ? 'rgba(34,197,94,0.04)' : CARD, cursor: 'pointer', textAlign: 'left', transition: 'all 150ms', width: '100%' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? '#22C55E' : BORDER}`, background: done ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms' }}>
                        {done && <Check size={13} color="#000" strokeWidth={3} />}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.88rem', color: done ? MUTED : TEXT, fontWeight: 500, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.4 : 1, transition: 'all 150ms' }}>{item.name}</span>
                      <span style={{ fontSize: '0.78rem', color: done ? '#555' : GOLD, fontWeight: 600, flexShrink: 0 }}>{item.display}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {checkedCount > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,10,10,0.95)', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'center' }}>
          <button onClick={resetAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', color: MUTED, fontSize: '0.78rem', fontWeight: 600 }}>
            <RotateCcw size={14} /> Tout décocher
          </button>
        </div>
      )}
    </div>
  )
}
