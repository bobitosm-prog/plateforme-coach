import React from 'react'
import { Camera, Copy, Download, FolderOpen, Pencil, Plus, RefreshCw, Save, Trash2, UtensilsCrossed, X } from 'lucide-react'

import { bodyStyle, cardStyle, colors, fonts, mutedStyle, titleStyle } from '@/lib/design-tokens'
import type { MealKey } from '@/lib/meal-plan'

export interface NutritionJournalLog {
  id: string
  meal_type: string
  custom_name?: string | null
  food_name?: string | null
  quantity_g?: number | null
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
}

interface MealTotals { kcal: number; protein: number; carbs: number; fat: number }
interface Labels {
  noFood: string; recommended: (values: MealTotals) => string; consumed: (values: MealTotals) => string
  save: string; copy: string; clear: string; replace: string; remove: string; import: string; add: string; todayOnly: string
}

interface Props {
  mealOrder: readonly MealKey[]
  mealLabels: Record<string, string>
  mealIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>>
  logs: NutritionJournalLog[]
  recommendations: Partial<Record<MealKey, MealTotals | null>>
  selectedPlanDay: string
  todayPlanDay: string
  isInvited: boolean
  openMenu: string | null
  editingFoodId: string | null
  editQuantity: string
  labels: Labels
  onOpenMenu: (meal: string | null) => void
  onStartSave: (meal: MealKey, logs: NutritionJournalLog[]) => void
  onStartCopy: (meal: MealKey, logs: NutritionJournalLog[]) => void
  onClear: (meal: MealKey) => void
  onStartEditQuantity: (log: NutritionJournalLog) => void
  onEditQuantity: (value: string) => void
  onSaveQuantity: (id: string, value: number) => void
  onCancelQuantity: () => void
  onReplace: (log: NutritionJournalLog) => void
  onDelete: (id: string) => void
  onImport: (meal: MealKey) => void
  onAdd: (meal: MealKey) => void
  onPhoto: (meal: MealKey) => void
  onSavedMeals: (meal: MealKey) => void
}

function sum(logs: NutritionJournalLog[]): MealTotals {
  return logs.reduce((total, log) => ({ kcal: total.kcal + (log.calories ?? 0), protein: total.protein + (log.protein ?? 0), carbs: total.carbs + (log.carbs ?? 0), fat: total.fat + (log.fat ?? 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
}

const iconButtonStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' } as const
const actionButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: 'none', color: colors.gold, fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' } as const

export function NutritionJournalMealsSection(props: Props) {
  return <>{props.mealOrder.map(mealType => {
    const logs = props.logs.filter(log => log.meal_type === mealType)
    const consumed = sum(logs)
    const recommendation = props.recommendations[mealType] ?? null
    const Icon = props.mealIcons[mealType] ?? UtensilsCrossed
    const isToday = props.selectedPlanDay === props.todayPlanDay
    return <div key={mealType} style={{ ...cardStyle, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.goldBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><Icon size={18} color={colors.gold} /><span style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: colors.text }}>{props.mealLabels[mealType]}</span><span style={{ ...titleStyle, marginLeft: 'auto' }}>{consumed.kcal} kcal</span>{logs.length > 0 && <div style={{ position: 'relative' }}><button onClick={() => props.onOpenMenu(props.openMenu === mealType ? null : mealType)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>⋯</button>{props.openMenu === mealType && <div style={{ position: 'absolute', top: 36, right: 0, background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 6, zIndex: 50, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}><MenuButton icon={Save} label={props.labels.save} onClick={() => props.onStartSave(mealType, logs)} /><MenuButton icon={Copy} label={props.labels.copy} onClick={() => props.onStartCopy(mealType, logs)} /><MenuButton icon={Trash2} label={props.labels.clear} danger onClick={() => props.onClear(mealType)} /></div>}</div>}</div>
        {recommendation && <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>{props.labels.recommended(recommendation)}</div>}
        {logs.length > 0 && <div style={{ fontFamily: fonts.body, fontSize: 11, color: consumed.kcal > (recommendation?.kcal ?? 9999) ? colors.error : colors.gold, marginTop: 2 }}>{props.labels.consumed(consumed)}</div>}
      </div>
      <div style={{ padding: '0 16px' }}>{logs.map(log => <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${colors.goldBorder}` }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text }}>{log.custom_name || 'Aliment'}</div>{props.editingFoodId === log.id ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><input type="number" value={props.editQuantity} onChange={event => props.onEditQuantity(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') props.onSaveQuantity(log.id, Number(props.editQuantity)); if (event.key === 'Escape') props.onCancelQuantity() }} style={{ width: 60, padding: '4px 8px', background: colors.background, border: `1px solid ${colors.gold}`, borderRadius: 6, color: colors.text }} /><span style={{ color: colors.textMuted }}>g</span><button onClick={() => props.onSaveQuantity(log.id, Number(props.editQuantity))}>OK</button><button onClick={props.onCancelQuantity} style={iconButtonStyle}><X size={14} /></button></div> : <div onClick={() => props.onStartEditQuantity(log)} style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2, cursor: 'pointer' }}>{log.quantity_g}g <Pencil size={10} /> · P:{Math.round(log.protein ?? 0)}g G:{Math.round(log.carbs ?? 0)}g L:{Math.round(log.fat ?? 0)}g</div>}</div><span style={{ ...titleStyle, flexShrink: 0 }}>{Math.round(log.calories ?? 0)}</span><button title={props.labels.replace} onClick={() => props.onReplace(log)} style={iconButtonStyle}><RefreshCw size={14} /></button><button title={props.labels.remove} onClick={() => props.onDelete(log.id)} style={iconButtonStyle}><Trash2 size={14} /></button></div>)}
        {logs.length === 0 && <div style={{ padding: '16px 0', textAlign: 'center', ...mutedStyle }}>{props.labels.noFood}</div>}
        <div style={{ display: 'flex', gap: 8, padding: '8px 0 12px', flexWrap: 'wrap' }}>{recommendation && logs.length === 0 && <button onClick={() => isToday && props.onImport(mealType)} disabled={!isToday} title={!isToday ? props.labels.todayOnly : undefined} style={{ ...actionButtonStyle, flex: 1, cursor: isToday ? 'pointer' : 'not-allowed', opacity: isToday ? 1 : 0.4 }}><Download size={14} /> {props.isInvited ? props.labels.import : `${props.labels.import} IA`}</button>}<button onClick={() => props.onAdd(mealType)} style={{ ...actionButtonStyle, flex: 1 }}><Plus size={14} /> {props.labels.add}</button><button onClick={() => props.onPhoto(mealType)} style={actionButtonStyle}><Camera size={14} /></button><button onClick={() => props.onSavedMeals(mealType)} style={actionButtonStyle}><FolderOpen size={14} /></button></div>
      </div>
    </div>
  })}</>
}

function MenuButton({ icon: Icon, label, danger = false, onClick }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; danger?: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}><Icon size={14} color={danger ? colors.error : colors.textMuted} /><span style={{ ...bodyStyle, color: danger ? colors.error : colors.text }}>{label}</span></button>
}
