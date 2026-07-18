import type { ReactNode } from 'react'

interface NutritionPlanSectionProps {
  active: boolean
  loading: boolean
  hasPersonalPlan: boolean
  hasCoachPlan: boolean
  emptyView: ReactNode
  personalPlanView: ReactNode
  coachPlanView: ReactNode
}

export function NutritionPlanSection(props: NutritionPlanSectionProps) {
  if (!props.active) return null
  if (props.loading && !props.hasCoachPlan) return <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>{[1,2,3,4].map(value => <div key={value} className="skeleton" style={{ height: 52, borderRadius: 16 }} />)}</div>{[1,2,3,4].map(value => <div key={value} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}</div>
  if (!props.hasPersonalPlan && !props.hasCoachPlan) return <>{props.emptyView}</>
  return <div style={{ padding: '0 20px', paddingBottom: 'calc(160px + env(safe-area-inset-bottom, 0px))' }}>{props.hasPersonalPlan ? props.personalPlanView : props.coachPlanView}</div>
}
