import type { ChangeEvent } from 'react'
import { Camera, Trash2 } from 'lucide-react'

import ModalHeader from '@/app/components/ui/ModalHeader'
import { RailOverlay } from '@/app/components/ui/RailOverlay'
import { bodyStyle, colors, mutedStyle, statSmallStyle, Z_MODAL } from '@/lib/design-tokens'
import type { SavedMealFoodSnapshotInput } from '@/lib/nutrition/saved-meal-snapshot'

export interface OverlayFood { name?: string; quantity?: number; quantity_g?: number; calories?: number; protein?: number; proteins?: number; carbs?: number; fat?: number; fats?: number }
export interface EditableMeal { id: string; name?: string | null; foods?: OverlayFood[] }
export interface FoodSearchResult { id: string; nom: string; calories: number; proteines: number; glucides: number; lipides: number; source?: string }
export interface PhotoFood { name: string; quantity_g: number; calories: number; proteins: number; carbs: number; fats: number }
export interface PhotoResult { foods?: PhotoFood[]; total_calories?: number }
export interface ReusableMeal { id: string; name?: string; foods?: SavedMealFoodSnapshotInput[]; total_calories?: number | null }

interface Props {
  editingMeal: EditableMeal | null; editQuery: string; editResults: FoodSearchResult[]; editSaving: boolean; editSaved: boolean
  savedMealError: string | null; savedMealLoadError: string | null; savedMealLoading: boolean; saveMealSaving: boolean; savedMealReusing: boolean
  photoOpen: boolean; analyzingPhoto: boolean; photoResult: PhotoResult | null
  saveOpen: boolean; saveFoods: OverlayFood[]; saveName: string
  copyOpen: boolean; copyDate: string; copyMealType: string; today: string; mealOrder: readonly string[]; mealLabels: Record<string, string>
  savedOpen: boolean; savedMeals: ReusableMeal[]
  labels: { editFallback: string; save: string; saving: string; saved: string; deleteMeal: string; scan: string; takePhoto: string; gallery: string; retake: string; addAll: string; saveTitle: string; savePlaceholder: string; saveCount: (count: number) => string; cancel: string; copyTitle: string; copyDate: string; copyMeal: string; copy: string; savedTitle: string; savedEmpty: string; savedCount: (count: number) => string; shortcuts: { label: string; date: string }[] }
  onCloseEdit: () => void; onEditFood: (index: number, quantity: number) => void; onRemoveFood: (index: number) => void; onEditQuery: (value: string) => void; onAddFood: (food: FoodSearchResult) => void; onSaveEdit: () => void; onDeleteEdit: () => void
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void; onClosePhoto: () => void; onRetake: () => void; onAddPhoto: () => void
  onSaveName: (name: string) => void; onCloseSave: () => void; onSaveMeal: () => void
  onCopyDate: (date: string) => void; onCopyMealType: (type: string) => void; onCloseCopy: () => void; onCopy: () => void
  onCloseSaved: () => void; onApplySaved: (meal: ReusableMeal) => void
}

const backdrop = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: Z_MODAL } as const
const popup = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 440, background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 16, zIndex: Z_MODAL, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' } as const
const inputStyle = { width: '100%', padding: '12px 14px', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 10, color: colors.text, outline: 'none', marginBottom: 12 } as const
const primaryButton = { padding: 14, border: 'none', background: `linear-gradient(135deg, ${colors.gold}, ${colors.goldContainer})`, borderRadius: 12, color: colors.onGold, cursor: 'pointer' } as const
const secondaryButton = { padding: 14, background: 'transparent', border: `1.5px solid ${colors.goldBorder}`, borderRadius: 12, color: colors.gold, cursor: 'pointer' } as const

export function SavedMealWriteAlert({ message }: { readonly message: string | null }) {
  return message
    ? <div role="alert" style={{ color: colors.error, marginBlock: 12 }}>{message}</div>
    : null
}

export function SavedMealSelectionList(props: {
  meals: readonly ReusableMeal[]
  error: string | null
  loading: boolean
  emptyLabel: string
  countLabel: (count: number) => string
  reusing: boolean
  onApply: (meal: ReusableMeal) => void
}) {
  return <>
    <SavedMealWriteAlert message={props.error} />
    {!props.loading && !props.error && props.meals.length === 0
      ? <div style={bodyStyle}>{props.emptyLabel}</div>
      : props.meals.map(meal => <button key={meal.id} disabled={props.reusing} onClick={() => props.onApply(meal)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}><div>{meal.name}<div style={mutedStyle}>{props.countLabel(meal.foods?.length ?? 0)}</div></div><div style={statSmallStyle}>{Math.round(meal.total_calories ?? 0)}</div></button>)}
  </>
}

export function NutritionTabOverlays(props: Props) {
  return <>
    {props.editingMeal && <RailOverlay><div style={{ ...backdrop, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)' }}><div style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto' }}><ModalHeader title={props.editingMeal.name || props.labels.editFallback} onClose={props.onCloseEdit} /><div style={{ padding: '0 24px 24px' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>{(props.editingMeal.foods ?? []).map((food, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.surfaceHigh, borderRadius: 10, padding: '8px 10px' }}><div style={{ flex: 1 }}><div>{food.name}</div><div style={{ color: colors.textDim }}>{food.calories ?? 0} kcal · {food.protein ?? 0}g P</div></div><input type="number" value={food.quantity ?? 100} onChange={event => props.onEditFood(index, Number(event.target.value))} style={{ width: 50 }} /><span>g</span><button onClick={() => props.onRemoveFood(index)}><Trash2 size={14} color={colors.error} /></button></div>)}</div><input value={props.editQuery} onChange={event => props.onEditQuery(event.target.value)} placeholder="+ Ajouter un aliment..." style={inputStyle} />{props.editResults.map(food => <button key={food.id} onClick={() => props.onAddFood(food)} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left' }}>{food.nom} · {food.calories} kcal</button>)}<SavedMealWriteAlert message={props.savedMealError} /><button onClick={props.onSaveEdit} disabled={props.editSaving} style={{ width: '100%', padding: 14 }}>{props.editSaving ? props.labels.saving : props.editSaved ? props.labels.saved : props.labels.save}</button><button onClick={props.onDeleteEdit} style={{ width: '100%', padding: 12, color: colors.error }}>{props.labels.deleteMeal}</button></div></div></div></RailOverlay>}
    {props.photoOpen && <RailOverlay><><div onClick={props.onClosePhoto} style={backdrop} /><div style={{ ...popup, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}><ModalHeader title={props.labels.scan} onClose={props.onClosePhoto} /><div style={{ overflowY: 'auto', padding: 20 }}><label style={{ width: '100%', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}><input type="file" accept="image/*" capture="environment" onChange={props.onPhotoChange} style={{ display: 'none' }} />{!props.photoResult && !props.analyzingPhoto && <><Camera size={48} /><span>{props.labels.takePhoto}</span><span style={mutedStyle}>{props.labels.gallery}</span></>}</label>{props.analyzingPhoto && <div style={{ textAlign: 'center', padding: 40 }}>ANALYSE EN COURS...</div>}{props.photoResult?.foods?.map((food, index) => <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}><div>{food.name}<div>{food.quantity_g}g · P:{food.proteins}g G:{food.carbs}g L:{food.fats}g</div></div><span>{food.calories}</span></div>)}</div>{props.photoResult?.foods && <div style={{ display: 'flex', gap: 12, padding: 16 }}><button onClick={props.onRetake}>{props.labels.retake}</button><button onClick={props.onAddPhoto}>{props.labels.addAll}</button></div>}</div></></RailOverlay>}
    {props.saveOpen && <RailOverlay><><div onClick={props.onCloseSave} style={backdrop} /><div style={{ ...popup, padding: 24 }}><h3>{props.labels.saveTitle}</h3><input value={props.saveName} onChange={event => props.onSaveName(event.target.value)} placeholder={props.labels.savePlaceholder} style={inputStyle} /><div>{props.labels.saveCount(props.saveFoods.length)}{props.saveFoods.map((food, index) => <div key={index}>{food.name} <span>{food.calories} kcal</span></div>)}</div><SavedMealWriteAlert message={props.savedMealError} /><button onClick={props.onCloseSave} style={secondaryButton}>{props.labels.cancel}</button><button disabled={!props.saveName.trim() || props.saveMealSaving} onClick={props.onSaveMeal} style={primaryButton}>{props.saveMealSaving ? props.labels.saving : props.labels.save}</button></div></></RailOverlay>}
    {props.copyOpen && <RailOverlay><><div onClick={props.onCloseCopy} style={backdrop} /><div style={{ ...popup, padding: 24 }}><h3>{props.labels.copyTitle}</h3><div>{props.labels.copyDate}</div><div>{props.labels.shortcuts.map(shortcut => <button key={shortcut.label} onClick={() => props.onCopyDate(shortcut.date)}>{shortcut.label}</button>)}</div><input type="date" value={props.copyDate} min={props.today} onChange={event => props.onCopyDate(event.target.value)} style={inputStyle} /><div>{props.labels.copyMeal}</div>{props.mealOrder.map(type => <button key={type} onClick={() => props.onCopyMealType(type)}>{props.mealLabels[type]}</button>)}<button onClick={props.onCloseCopy}>{props.labels.cancel}</button><button disabled={!props.copyDate || !props.copyMealType} onClick={props.onCopy}>{props.labels.copy}</button></div></></RailOverlay>}
    {props.savedOpen && <RailOverlay><><div onClick={props.onCloseSaved} style={backdrop} /><div style={{ ...popup, maxHeight: '75vh', overflow: 'hidden' }}><ModalHeader title={props.labels.savedTitle} onClose={props.onCloseSaved} /><div style={{ padding: 20 }}><SavedMealSelectionList meals={props.savedMeals} error={props.savedMealLoadError ?? props.savedMealError} loading={props.savedMealLoading} emptyLabel={props.labels.savedEmpty} countLabel={props.labels.savedCount} reusing={props.savedMealReusing} onApply={props.onApplySaved} /></div></div></></RailOverlay>}
  </>
}
