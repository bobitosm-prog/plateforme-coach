'use client'

import { colors, fonts } from '@/lib/design-tokens'
import { RailOverlay } from '@/app/components/ui/RailOverlay'

export interface TrainingExerciseVariant {
  name?: string | null
  equipment?: string | null
  muscle_group?: string | null
  [key: string]: unknown
}

interface TrainingVariantModalProps {
  variants: readonly TrainingExerciseVariant[]
  closeLabel: string
  emptyLabel: string
  onClose: () => void
  onSelect: (variant: TrainingExerciseVariant) => void
}

function equipmentIcon(equipment?: string | null) {
  if (equipment === 'Barre') return '🏋️'
  if (equipment === 'Haltères') return '💪'
  if (equipment === 'Machine') return '⚙️'
  if (equipment === 'Poulie') return '🔗'
  return '🤸'
}

export default function TrainingVariantModal({ variants, closeLabel, emptyLabel, onClose, onSelect }: TrainingVariantModalProps) {
  return (
    <RailOverlay>
      <div data-no-tab-swipe="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
        <div onClick={event => event.stopPropagation()} style={{ background: colors.surface, border: `1px solid ${colors.goldRule}`, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, maxHeight: '60vh', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.goldBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: fonts.headline, fontSize: 20, letterSpacing: 2, color: colors.text }}>VARIANTES</span>
            <button aria-label={closeLabel} onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 'calc(60vh - 60px)', padding: '8px 12px 30px' }}>
            {variants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: colors.textMuted, fontSize: 14, fontFamily: fonts.body }}>{emptyLabel}</div>
            ) : variants.map((variant, index) => (
              <button key={index} onClick={() => onSelect(variant)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 4, borderRadius: 16, background: colors.background, border: `1px solid ${colors.goldBorder}`, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {equipmentIcon(variant.equipment)}
                </div>
                <div>
                  <div style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text, fontWeight: 500 }}>{variant.name}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.gold, fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>
                    {variant.equipment || ''}{variant.muscle_group ? ` · ${variant.muscle_group}` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </RailOverlay>
  )
}
