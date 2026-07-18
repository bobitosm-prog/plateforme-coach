import type { ProgramEditorDay } from '@/lib/training/program-editor-model'
import { SESSION_TYPES } from '@/lib/session-types'
import { DAY_NAMES_FR } from '@/lib/schedule-utils'
import { BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, FONT_ALT, FONT_DISPLAY, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY, colors } from '@/lib/design-tokens'

const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
type Translate = (key: string, values?: Record<string, string | number>) => string

interface ProgramBuilderDayNavigationProps {
  days: readonly ProgramEditorDay[]
  activeIndex: number
  swapMode: boolean
  swapFirst: number | null
  t: Translate
  onSelectDay: (index: number) => void
  onStartSwap: () => void
  onCancelSwap: () => void
  onToggleRest: () => void
  onSessionNameChange: (name: string) => void
}

export function ProgramBuilderDayNavigation(props: ProgramBuilderDayNavigationProps) {
  const active = props.days[props.activeIndex]
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 12 }}>
      {props.days.slice(0, 7).map((day, index) => {
        const selected = props.activeIndex === index
        const swapping = props.swapFirst === index
        const hasExercises = !day.is_rest && (day.exercises?.length || 0) > 0
        return <button key={index} onClick={() => props.onSelectDay(index)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 2px', borderRadius: 14, cursor: 'pointer', background: swapping ? 'rgba(232,201,122,0.2)' : selected ? GOLD : day.is_rest ? BG_BASE : hasExercises ? GOLD_DIM : BG_CARD, border: `1.5px solid ${swapping ? '#E8C97A' : selected ? GOLD : hasExercises ? GOLD_RULE : BORDER}`, transition: 'all 0.2s' }}>
          <span style={{ fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: selected ? colors.onGold : day.is_rest ? TEXT_DIM : hasExercises ? GOLD : TEXT_MUTED }}>{DAY_SHORT[index]}</span>
          {day.is_rest ? <span style={{ fontSize: 14, lineHeight: 1 }}>😴</span> : <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: selected ? colors.onGold : hasExercises ? GOLD : TEXT_DIM }}>{day.exercises?.length || 0}</span>}
        </button>
      })}
    </div>
    {active?.name && !active.is_rest && <div style={{ fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>{DAY_NAMES_FR[props.activeIndex]} — {active.name}</div>}
    <button onClick={props.swapMode ? props.onCancelSwap : props.onStartSwap} style={{ width: '100%', padding: 12, borderRadius: 14, marginBottom: 10, background: props.swapMode ? GOLD_DIM : BG_CARD, border: props.swapMode ? `1px solid ${GOLD}` : `1px dashed ${BORDER}`, color: props.swapMode ? GOLD : TEXT_MUTED, fontFamily: FONT_ALT, fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>
      {props.swapMode ? (props.swapFirst !== null ? props.t('day.swapSelected', { day: DAY_SHORT[props.swapFirst] }) : props.t('day.swapHint')) : props.t('day.reorderDays')}
    </button>
    {active && <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: TEXT_PRIMARY, letterSpacing: 1 }}>{DAY_NAMES_FR[props.activeIndex]}</span>
        <button onClick={props.onToggleRest} style={{ padding: '6px 14px', borderRadius: 10, cursor: 'pointer', background: active.is_rest ? 'rgba(138,133,128,.18)' : GOLD_DIM, border: `1px solid ${active.is_rest ? BORDER : GOLD}`, color: active.is_rest ? TEXT_MUTED : GOLD, fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{active.is_rest ? props.t('day.restToggleOn') : props.t('day.trainingToggle')}</button>
      </div>
      {!active.is_rest && <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_ALT, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: TEXT_MUTED, marginBottom: 8 }}>{props.t('day.sessionType')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {SESSION_TYPES.map(option => {
            const selected = active.name === option.label
            return <button key={option.key} onClick={() => props.onSessionNameChange(option.label)} style={{ padding: '10px 6px', borderRadius: 10, cursor: 'pointer', background: selected ? `${option.color}20` : BG_CARD, border: `1.5px solid ${selected ? option.color : BORDER}`, color: selected ? option.color : TEXT_MUTED, fontFamily: FONT_ALT, fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><span style={{ fontSize: 16 }}>{option.emoji}</span> {option.label}</button>
          })}
        </div>
      </div>}
    </div>}
  </>
}
