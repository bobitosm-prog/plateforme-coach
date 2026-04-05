'use client'
import { useState, useMemo } from 'react'
import { X, Copy, Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_RULE, GREEN, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD } from '../../lib/design-tokens'

function getAisle(name: string): { aisle: string; order: number } {
  const n = name.toLowerCase()
  if (/poulet|dinde|boeuf|bœuf|steak|filet|bavette|porc|jambon|bacon|viande|escalope|agneau|veau/.test(n)) return { aisle: '🥩 Boucherie', order: 1 }
  if (/saumon|thon|cabillaud|crevette|sardine|maquereau|truite|colin|dorade|bar|poisson/.test(n)) return { aisle: '🐟 Poissonnerie', order: 2 }
  if (/oeuf|œuf/.test(n)) return { aisle: '🥚 Oeufs', order: 3 }
  if (/yaourt|fromage|skyr|cottage|mozzarella|emmental|gruyère|parmesan|ricotta|feta|lait(?!.*amande|.*avoine|.*soja|.*coco)|crème/.test(n)) return { aisle: '🧀 Produits laitiers', order: 4 }
  if (/patate|pomme.*de.*terre|brocoli|épinard|haricot.*vert|courgette|asperge|poivron|tomate|concombre|carotte|chou|champignon|salade|avocat|oignon|ail|aubergine|betterave|laitue|légume/.test(n)) return { aisle: '🥬 Legumes', order: 5 }
  if (/banane|pomme(?!.*terre)|orange|fraise|myrtille|framboise|kiwi|mangue|ananas|poire|raisin|melon|pêche|abricot|citron/.test(n)) return { aisle: '🍎 Fruits', order: 6 }
  if (/riz|pâte|quinoa|boulgour|semoule|pain|flocon|muesli|galette|tortilla|wrap|lentille|pois.*chiche|haricot.*rouge|haricot.*blanc|avoine|céréale|granola/.test(n)) return { aisle: '🌾 Feculents', order: 7 }
  if (/amande|noix|cacahuète|noisette|graine|beurre.*cacahuète|beurre.*amande|chia|lin/.test(n)) return { aisle: '🥜 Fruits secs', order: 8 }
  if (/huile|beurre(?!.*cacahuète|.*amande)|ghee|coco/.test(n)) return { aisle: '🫒 Huiles', order: 9 }
  if (/whey|caséine|protéine|bcaa|créatine|barre.*protéin/.test(n)) return { aisle: '💪 Supplements', order: 10 }
  if (/sauce|vinaigre|moutarde|miel|sirop|soja/.test(n)) return { aisle: '🍯 Condiments', order: 11 }
  if (/lait.*amande|lait.*avoine|lait.*soja|lait.*coco|jus|eau.*coco/.test(n)) return { aisle: '🥤 Boissons', order: 12 }
  if (/tofu|tempeh|seitan/.test(n)) return { aisle: '🌿 Vegetal', order: 14 }
  return { aisle: '🛒 Autres', order: 99 }
}

function roundUp(g: number): string {
  if (g >= 1000) return `${(Math.ceil(g / 100) / 10).toFixed(1)} kg`
  if (g > 500) return `${Math.ceil(g / 50) * 50}g`
  return `${Math.ceil(g / 25) * 25}g`
}

interface ShoppingListProps {
  planData: Record<string, any>
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
    const lines = ['🛒 LISTE DE COURSES -- MoovX', '']
    for (const [aisle, { items }] of aisles) {
      lines.push(aisle.toUpperCase())
      for (const item of items) {
        lines.push(`☐ ${item.name} -- ${item.display}`)
      }
      lines.push('')
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast.success('Liste copiee !')).catch(() => toast.error('Erreur de copie'))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG_BASE, zIndex: 1050, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: FONT_ALT, fontSize: '1.1rem', fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '2px', textTransform: 'uppercase' }}>LISTE DE COURSES</div>
          <div style={{ fontSize: '0.65rem', fontFamily: FONT_BODY, fontWeight: 300, color: TEXT_MUTED }}>{totalItems} articles -- {checkedCount}/{totalItems} coches</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 12, border: `1px solid ${GOLD_RULE}`, background: 'transparent', cursor: 'pointer', color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px' }}>
            <Copy size={13} /> Copier
          </button>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 12, background: BG_CARD_2, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={TEXT_MUTED} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 80px' }}>
        {aisles.length === 0 ? (
          <p style={{ textAlign: 'center', color: TEXT_MUTED, fontFamily: FONT_BODY, padding: '40px 0' }}>Aucun plan alimentaire pour generer la liste.</p>
        ) : (
          aisles.map(([aisle, { items }]) => (
            <div key={aisle} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 800, color: GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8, position: 'sticky', top: 0, background: BG_BASE, paddingTop: 4, paddingBottom: 4, zIndex: 1 }}>
                {aisle}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(item => {
                  const done = !!checked[item.name]
                  return (
                    <button key={item.name} onClick={() => toggle(item.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: 'none', background: done ? 'rgba(74,222,128,0.04)' : BG_CARD, cursor: 'pointer', textAlign: 'left', transition: 'all 150ms', width: '100%' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 12, border: `2px solid ${done ? GREEN : BORDER}`, background: done ? GREEN : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms' }}>
                        {done && <Check size={13} color="#0D0B08" strokeWidth={3} />}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.88rem', fontFamily: FONT_BODY, fontWeight: 400, color: done ? TEXT_MUTED : TEXT_PRIMARY, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.4 : 1, transition: 'all 150ms' }}>{item.name}</span>
                      <span style={{ fontSize: '0.78rem', fontFamily: FONT_DISPLAY, color: done ? TEXT_DIM : GOLD, fontWeight: 700, flexShrink: 0 }}>{item.display}</span>
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
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', background: 'rgba(5,5,5,0.95)', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'center' }}>
          <button onClick={resetAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, border: `1px solid ${GOLD_RULE}`, background: 'transparent', cursor: 'pointer', color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.5px' }}>
            <RotateCcw size={14} /> Tout decocher
          </button>
        </div>
      )}
    </div>
  )
}
