'use client'
import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import TrainingSheet from './training-v2/TrainingSheet'
import styles from './NutritionLibrary.module.css'
import { RailOverlay } from './ui/RailOverlay'
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

  // Count only ingredients present in the current plan.
  const checkedCount = aisles.reduce((count, [, aisle]) => count + aisle.items.filter(item => checked[item.name]).length, 0)

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
    <RailOverlay>
      <TrainingSheet viewportContained title={t('title')} description={t('subtitle', { total: totalItems, checked: checkedCount })} onClose={onClose}>
        <div className={styles.library}>
          <div className={styles.toolbar}>
            <button type="button" className={styles.action} onClick={copyToClipboard}><Copy size={18} />{t('copy')}</button>
            {checkedCount > 0 && <button type="button" className={styles.action} onClick={resetAll}><RotateCcw size={18} />{t('uncheckAll')}</button>}
          </div>
          {aisles.length === 0 ? <p role="status">{t('emptyState')}</p> : aisles.map(([aisleKey, { items, emoji }]) => (
            <section key={aisleKey} className={styles.aisle}>
              <h3>{emoji} {tAisle(aisleKey)}</h3>
              {items.map(item => (
                <button type="button" key={item.name} className={styles.item} aria-label={`${item.name} ${item.display}`} aria-pressed={!!checked[item.name]} onClick={() => toggle(item.name)}>
                  <span className={styles.check} aria-hidden="true">{checked[item.name] && <Check size={16} />}</span>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.quantity}>{item.display}</span>
                </button>
              ))}
            </section>
          ))}
        </div>
      </TrainingSheet>
    </RailOverlay>
  )
}
