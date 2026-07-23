'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import useClientDetail from '../../hooks/useClientDetail'
import type { MealPlanTemplate } from '@/lib/meal-plan-templates'
import type { ClientProgramTemplate } from './client-detail-page-types'
import ClientDetailPageView from './ClientDetailPageView'
import { ClientDetailLoadingView, ClientDetailUnavailableView } from './ClientDetailPageStates'
import DeferredContentFallback from '@/app/components/loading/DeferredContentFallback'
import { hasOpenClientDetailOverlay } from './client-detail-overlay-state'

const ClientDetailPageOverlays = dynamic(() => import('./ClientDetailPageOverlays'), {
  loading: () => <DeferredContentFallback label="Ouverture…" overlay />,
})

export default function ClientDetailPageClient() {
  const detail = useClientDetail()
  const [pendingTemplate, setPendingTemplate] = useState<ClientProgramTemplate | null>(null)

  if (detail.loading) return <ClientDetailLoadingView />
  if (detail.error || !detail.profile) {
    return <ClientDetailUnavailableView message={detail.error ?? 'Client introuvable'} onBack={() => detail.router.back()} />
  }

  const handleApplyMealTemplate = (template: MealPlanTemplate) => {
    const plan: MealPlanTemplate['plan'] = JSON.parse(JSON.stringify(template.plan))
    detail.setMealPlan(plan)
    detail.setCalorieTarget(template.macros.calorieTarget)
    detail.setProtTarget(template.macros.protTarget)
    detail.setCarbTarget(template.macros.carbTarget)
    detail.setFatTarget(template.macros.fatTarget)
    detail.showToast(`Template "${template.name}" appliqué — n'oublie pas de sauvegarder`)
  }

  return (
    <>
      <ClientDetailPageView detail={detail} onApplyMealTemplate={handleApplyMealTemplate} onRequestTemplate={setPendingTemplate} />
      {hasOpenClientDetailOverlay(detail, pendingTemplate) && (
        <ClientDetailPageOverlays
          detail={detail}
          pendingTemplate={pendingTemplate}
          onClearPendingTemplate={() => setPendingTemplate(null)}
        />
      )}
    </>
  )
}
