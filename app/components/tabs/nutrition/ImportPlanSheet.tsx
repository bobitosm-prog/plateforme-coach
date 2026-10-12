'use client'
import { RailOverlay } from '../../ui/RailOverlay'
import TrainingSheet from '../../training-v2/TrainingSheet'
import { colors, fonts, btnPrimary, btnSecondary } from '../../../../lib/app-design-tokens'
import type { Food } from '../../../../lib/meal-plan'

interface Props {
  mealLabel: string
  foods: Food[]
  isCoachManaged?: boolean
  onImport: () => void
  onClose: () => void
}

export default function ImportPlanSheet({ mealLabel, foods, isCoachManaged, onImport, onClose }: Props) {
  return <RailOverlay>
    <TrainingSheet viewportContained
      title={isCoachManaged ? 'Importer du plan' : 'Importer le plan IA'}
      description={`Ajouter les aliments recommandés pour ${mealLabel} ?`}
      onClose={onClose}
    >
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {foods.map((food, index) => <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 16, border: `1px solid ${colors.divider}`, borderRadius: 20, background: colors.background }}>
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <div style={{ fontFamily: fonts.body, fontSize: 16, color: colors.text, fontWeight: 600 }}>{food.name}</div>
            <div style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 4 }}>{food.qty} g</div>
          </div>
          <span style={{ flexShrink: 0, fontFamily: fonts.body, fontSize: 16, color: colors.gold, fontWeight: 700 }}>{food.kcal} kcal</span>
        </li>)}
      </ul>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button type="button" onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Annuler</button>
        <button type="button" onClick={onImport} style={{ ...btnPrimary, flex: 1 }}>Importer</button>
      </div>
    </TrainingSheet>
  </RailOverlay>
}
