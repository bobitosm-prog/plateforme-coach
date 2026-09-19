'use client'

import { useTranslations } from 'next-intl'
import { getNutritionPlanConsistency } from '../../../lib/nutrition/plan-context'
import { colors } from '../../../lib/design-tokens'

export default function NutritionPlanConsistencyNotice({ plan, profile, source }: {
  plan: unknown
  profile: unknown
  source: 'personal' | 'coach' | 'none'
}) {
  const t = useTranslations('nutritionPlanConsistency')
  if (source !== 'personal' || !plan) return null
  const consistency = getNutritionPlanConsistency(plan, profile)
  if (consistency === 'aligned') return null
  return <p role="status" style={{ color: colors.text, background: colors.goldDim,
    border: `1px solid ${colors.goldRule}`, borderRadius: 12, padding: 12, fontSize: '0.85rem', lineHeight: 1.5 }}>
    {t(consistency)}
  </p>
}
