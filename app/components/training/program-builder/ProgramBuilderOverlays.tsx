'use client'

import { Plus, Search, X } from 'lucide-react'
import { getExerciseName } from '@/lib/i18n-exercise'
import { getMuscleLabel } from '@/lib/i18n-muscle'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  FONT_ALT, FONT_BODY, FONT_DISPLAY, TEXT_MUTED, TEXT_PRIMARY, Z_MODAL,
} from '@/lib/design-tokens'
import type { ProgramEditorExercise } from '@/lib/training/program-editor-model'

type Translate = (key: string, values?: Record<string, string | number>) => string
type MuscleTranslate = (key: string) => string
type LibraryExercise = ProgramEditorExercise & { id?: string; _custom?: boolean; muscle_group?: string }
type VariantExercise = { name?: string; equipment?: string; muscle_group?: string }

interface ExerciseSearchOverlayProps {
  open: boolean
  locale: 'fr' | 'en' | 'de'
  query: string
  filter: string
  filters: Array<{ key: string; label: string }>
  allKey: string
  exercises: LibraryExercise[]
  t: Translate
  tMuscle: MuscleTranslate
  onQueryChange: (value: string) => void
  onFilterChange: (value: string) => void
  onClose: () => void
  onSelect: (exercise: LibraryExercise, custom: boolean) => void
  onCreateCustom: () => void
}

export function ProgramBuilderExerciseSearchOverlay(props: ExerciseSearchOverlayProps) {
  if (!props.open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: Z_MODAL, background: BG_BASE, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, background: BG_BASE, padding: '16px 16px 10px', paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: TEXT_PRIMARY }}>{props.t('search.title')}</span>
          <button onClick={props.onClose} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: 8, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={22} /></button>
        </div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }} />
          <input autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} inputMode="search" enterKeyHint="search"
            value={props.query} onChange={event => props.onQueryChange(event.target.value)}
            onFocus={event => { setTimeout(() => event.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }}
            placeholder={props.t('search.placeholder')}
            style={{ width: '100%', padding: '14px 44px 14px 40px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT_PRIMARY, fontSize: 16, fontFamily: FONT_BODY, outline: 'none' }} />
          {props.query && <button onClick={() => props.onQueryChange('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(212,168,67,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} color={GOLD} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
          {props.filters.map(item => {
            const selected = (item.key === props.allKey && !props.filter) || props.filter === item.key
            return <button key={item.key} onClick={() => props.onFilterChange(item.key === props.allKey ? '' : item.key)} style={{ padding: '6px 12px', border: `1.5px solid ${selected ? GOLD : BORDER}`, background: selected ? GOLD_DIM : BG_CARD, color: selected ? GOLD : TEXT_PRIMARY, cursor: 'pointer', fontFamily: FONT_ALT, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.label}</button>
          })}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 16px 120px' }}>
        {props.exercises.map((exercise, index) => <div key={exercise.id || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: TEXT_PRIMARY }}>{getExerciseName(exercise, props.locale)}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {exercise.muscle_group && <span style={{ fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase', padding: '2px 8px', background: GOLD_DIM, color: GOLD, letterSpacing: '0.05em' }}>{getMuscleLabel(exercise.muscle_group, props.locale, props.tMuscle)}</span>}
              {exercise._custom && <span style={{ fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase', padding: '2px 8px', background: GOLD_DIM, color: GOLD, letterSpacing: '0.05em' }}>{props.t('search.myExercise')}</span>}
            </div>
          </div>
          <button onClick={() => props.onSelect(exercise, !!exercise._custom)} style={{ background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, color: GOLD, cursor: 'pointer', padding: 10, borderRadius: 12, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={18} /></button>
        </div>)}
        {props.exercises.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 14 }}>{props.t('search.noResults')}</div>}
      </div>
      <div style={{ padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: BG_BASE }}>
        <button onClick={props.onCreateCustom} style={{ width: '100%', padding: '14px', background: BG_CARD_2, border: `1px solid ${BORDER}`, color: GOLD, borderRadius: 12, fontFamily: FONT_DISPLAY, fontSize: 16, cursor: 'pointer' }}>{props.t('search.createExercise')}</button>
      </div>
    </div>
  )
}

interface VariantOverlayProps {
  variants: VariantExercise[] | null
  locale: 'fr' | 'en' | 'de'
  t: Translate
  tMuscle: MuscleTranslate
  onClose: () => void
  onSelect: (variant: VariantExercise) => void
}

export function ProgramBuilderVariantOverlay(props: VariantOverlayProps) {
  if (!props.variants) return null
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: Z_MODAL, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={props.onClose}>
    <div onClick={event => event.stopPropagation()} style={{ background: BG_CARD, border: `1px solid ${GOLD_RULE}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '60vh', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: 2, color: TEXT_PRIMARY }}>{props.t('variants.title')}</span><button aria-label={props.t('variants.close')} onClick={props.onClose} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 20, cursor: 'pointer' }}>✕</button></div>
      <div style={{ overflowY: 'auto', maxHeight: 'calc(60vh - 60px)', padding: '8px 12px' }}>
        {props.variants.length === 0 ? <div style={{ textAlign: 'center', padding: 32, color: TEXT_MUTED, fontSize: 14, fontFamily: FONT_BODY }}>{props.t('variants.noVariants')}</div> : props.variants.map((variant, index) => <button key={index} onClick={() => props.onSelect(variant)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 4, borderRadius: 14, background: BG_BASE, border: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{variant.equipment === 'Barre' ? '🏋️' : variant.equipment === 'Haltères' ? '💪' : variant.equipment === 'Machine' ? '⚙️' : variant.equipment === 'Poulie' ? '🔗' : '🤸'}</div>
          <div><div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY, fontWeight: 500 }}>{variant.name}</div><div style={{ fontFamily: FONT_ALT, fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>{variant.equipment || ''}{variant.muscle_group ? ` · ${getMuscleLabel(variant.muscle_group, props.locale, props.tMuscle)}` : ''}</div></div>
        </button>)}
      </div>
    </div>
  </div>
}
