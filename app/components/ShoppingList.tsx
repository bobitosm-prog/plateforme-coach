'use client'
import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { X, Copy, Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { colors, fonts } from '../../lib/design-tokens'
import { parseMealPlan } from '../../lib/meal-plan'

interface AisleInfo { aisleKey: string; emoji: string; order: number }

function getAisle(name: string): AisleInfo {
  const n = name.toLowerCase()
  if (/poulet|dinde|boeuf|bœuf|steak|filet|bavette|porc|jambon|bacon|viande|escalope|agneau|veau/.test(n)) return { aisleKey: 'butcher', emoji: '🥩', order: 1 }
  if (/saumon|thon|cabillaud|crevette|sardine|maquereau|truite|colin|dorade|bar|poisson/.test(n)) return { aisleKey: 'fish', emoji: '🐟', order: 2 }
  if (/oeuf|œuf/.test(n)) return { aisleKey: 'eggs', emoji: '🥚', order: 3 }
  if (/yaourt|fromage|skyr|cottage|mozzarella|emmental|gruyère|parmesan|ricotta|feta|lait(?!.*amande|.*avoine|.*soja|.*coco)|crème/.test(n)) return { aisleKey: 'dairy', emoji: '🧀', order: 4 }
  if (/patate|pomme.*de.*terre|brocoli|épinard|haricot.*vert|courgette|asperge|poivron|tomate|concombre|carotte|chou|champignon|salade|avocat|oignon|ail|aubergine|betterave|laitue|légume/.test(n)) return { aisleKey: 'vegetables', emoji: '🥬', order: 5 }
  if (/banane|pomme(?!.*terre)|orange|fraise|myrtille|framboise|kiwi|mangue|ananas|poire|raisin|melon|pêche|abricot|citron/.test(n)) return { aisleKey: 'fruits', emoji: '🍎', order: 6 }
  if (/riz|pâte|quinoa|boulgour|semoule|pain|flocon|muesli|galette|tortilla|wrap|lentille|pois.*chiche|haricot.*rouge|haricot.*blanc|avoine|céréale|granola/.test(n)) return { aisleKey: 'starches', emoji: '🌾', order: 7 }
  if (/amande|noix|cacahuète|noisette|graine|beurre.*cacahuète|beurre.*amande|chia|lin/.test(n)) return { aisleKey: 'nutsSeeds', emoji: '🥜', order: 8 }
  if (/huile|beurre(?!.*cacahuète|.*amande)|ghee|coco/.test(n)) return { aisleKey: 'oils', emoji: '🫒', order: 9 }
  if (/whey|caséine|protéine|bcaa|créatine|barre.*protéin/.test(n)) return { aisleKey: 'supplements', emoji: '💪', order: 10 }
  if (/sauce|vinaigre|moutarde|miel|sirop|soja/.test(n)) return { aisleKey: 'condiments', emoji: '🍯', order: 11 }
  if (/lait.*amande|lait.*avoine|lait.*soja|lait.*coco|jus|eau.*coco/.test(n)) return { aisleKey: 'drinks', emoji: '🥤', order: 12 }
  if (/tofu|tempeh|seitan/.test(n)) return { aisleKey: 'plantBased', emoji: '🌿', order: 14 }
  return { aisleKey: 'others', emoji: '🛒', order: 99 }
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
  const t = useTranslations('shoppingList')
  const tAisle = useTranslations('shoppingList.aisles')
  const storageKey = `moovx-shopping-${new Date().toISOString().split('T')[0]}`
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}') } catch { return {} }
  })

  // Aggregate all ingredients from 7 days
  const { aisles, totalItems } = useMemo(() => {
    const agg: Record<string, number> = {}

    const parsed = parseMealPlan(planData)
    for (const dayPlan of Object.values(parsed)) {
      for (const meal of dayPlan.meals) {
        for (const food of meal.foods) {
          const name = food.name.trim()
          if (!name) continue
          agg[name] = (agg[name] || 0) + food.qty
        }
      }
    }

    // Group by aisle
    const grouped: Record<string, { items: { name: string; qty: number; display: string }[]; order: number; emoji: string }> = {}
    for (const [name, qty] of Object.entries(agg)) {
      const { aisleKey, emoji, order } = getAisle(name)
      if (!grouped[aisleKey]) grouped[aisleKey] = { items: [], order, emoji }
      grouped[aisleKey].items.push({ name, qty, display: roundUp(qty) })
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
    const lines = [`🛒 ${t('clipboardHeader')} -- MoovX`, '']
    for (const [aisleKey, { items, emoji }] of aisles) {
      lines.push(`${emoji} ${tAisle(aisleKey)}`.toUpperCase())
      for (const item of items) {
        lines.push(`☐ ${item.name} -- ${item.display}`)
      }
      lines.push('')
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast.success(t('copySuccess'))).catch(() => toast.error(t('copyError')))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: colors.background, zIndex: 1050, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${colors.divider}`, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: fonts.alt, fontSize: '1.1rem', fontWeight: 800, color: colors.text, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('title')}</div>
          <div style={{ fontSize: '0.65rem', fontFamily: fonts.body, fontWeight: 300, color: colors.textMuted }}>{t('subtitle', { total: totalItems, checked: checkedCount })}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: colors.gold, fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
            <Copy size={13} /> {t('copy')}
          </button>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 12, background: colors.surfaceHigh, border: `1px solid ${colors.divider}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={colors.textMuted} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 80px' }}>
        {aisles.length === 0 ? (
          <p style={{ textAlign: 'center', color: colors.textMuted, fontFamily: fonts.body, padding: '40px 0' }}>{t('emptyState')}</p>
        ) : (
          aisles.map(([aisleKey, { items, emoji }]) => (
            <div key={aisleKey} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: fonts.alt, fontSize: '0.82rem', fontWeight: 800, color: colors.gold, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8, position: 'sticky', top: 0, background: colors.background, paddingTop: 4, paddingBottom: 4, zIndex: 1 }}>
                {emoji} {tAisle(aisleKey)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(item => {
                  const done = !!checked[item.name]
                  return (
                    <button key={item.name} onClick={() => toggle(item.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: 'none', background: done ? 'rgba(74,222,128,0.04)' : colors.surface2, cursor: 'pointer', textAlign: 'left', transition: 'all 150ms', width: '100%' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 12, border: `2px solid ${done ? colors.success : colors.divider}`, background: done ? colors.success : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms' }}>
                        {done && <Check size={13} color="#0D0B08" strokeWidth={3} />}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.88rem', fontFamily: fonts.body, fontWeight: 400, color: done ? colors.textMuted : colors.text, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.4 : 1, transition: 'all 150ms' }}>{item.name}</span>
                      <span style={{ fontSize: '0.78rem', fontFamily: fonts.headline, color: done ? colors.textDim : colors.gold, fontWeight: 700, flexShrink: 0 }}>{item.display}</span>
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
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', background: 'rgba(5,5,5,0.95)', borderTop: `1px solid ${colors.divider}`, display: 'flex', justifyContent: 'center' }}>
          <button onClick={resetAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: colors.gold, fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
            <RotateCcw size={14} /> {t('uncheckAll')}
          </button>
        </div>
      )}
    </div>
  )
}
