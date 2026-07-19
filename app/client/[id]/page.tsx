'use client'
import { useState } from 'react'
import useClientDetail from './hooks/useClientDetail'
import type { MealPlanTemplate } from '@/lib/meal-plan-templates'
import type { ClientProgramTemplate } from './components/page/client-detail-page-types'
import ClientDetailPageView from './components/page/ClientDetailPageView'
import ClientDetailPageOverlays from './components/page/ClientDetailPageOverlays'
import { ClientDetailLoadingView, ClientDetailUnavailableView } from './components/page/ClientDetailPageStates'

export default function ClientProfilePage() {
  const detail = useClientDetail()
  const [pendingTemplate, setPendingTemplate] = useState<ClientProgramTemplate | null>(null)

  if (detail.loading) return <ClientDetailLoadingView />
  if (detail.error || !detail.profile) return <ClientDetailUnavailableView message={detail.error ?? 'Client introuvable'} onBack={() => detail.router.back()} />

  const handleApplyMealTemplate = (template: MealPlanTemplate) => {
    const plan: MealPlanTemplate['plan'] = JSON.parse(JSON.stringify(template.plan))
    detail.setMealPlan(plan)
    detail.setCalorieTarget(template.macros.calorieTarget)
    detail.setProtTarget(template.macros.protTarget)
    detail.setCarbTarget(template.macros.carbTarget)
    detail.setFatTarget(template.macros.fatTarget)
    detail.showToast(`Template "${template.name}" appliqué — n'oublie pas de sauvegarder`)
  }

  return <>
    <ClientDetailPageView detail={detail} onApplyMealTemplate={handleApplyMealTemplate} onRequestTemplate={setPendingTemplate} />
    <ClientDetailPageOverlays detail={detail} pendingTemplate={pendingTemplate} onClearPendingTemplate={() => setPendingTemplate(null)} />
  </>
}
