'use client'

import dynamic from 'next/dynamic'
import { ArrowLeft, ChevronDown, RefreshCw, Settings2, ShieldCheck, UtensilsCrossed } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { useAiQuota } from '../../../hooks/useAiQuota'
import type { ActiveCoachResolutionState } from '../../../../lib/coach-relations/repository'
import type { UserCapabilities } from '../../../../lib/entitlements/capabilities'
import {
  resolveActiveNutritionPlan,
  type CoachNutritionPlan,
  type PersonalNutritionPlan,
} from '../../../../lib/nutrition/nutrition-dashboard-model'
import {
  resolveNutritionPlanStatus,
  resolveNutritionProgramAccess,
  type NutritionPlanStatus,
} from '../../../../lib/nutrition/nutrition-program-access'
import styles from './NutritionProgramSection.module.css'

const NutritionPreferences = dynamic(() => import('../../NutritionPreferences'), {
  ssr: false,
  loading: () => <div className={styles.loadingPanel} aria-live="polite" />,
})

interface NutritionProgramSectionProps {
  profile: Record<string, unknown> | null
  capabilities: UserCapabilities
  coachRelationStatus: ActiveCoachResolutionState['status']
  coachRelationIsAuthoritative: boolean
  coachId: string | null
  supabase: SupabaseClient
  userId: string
  fetchAll: () => Promise<void>
  onBack: () => void
}

interface PlanSnapshot {
  personalPlan: PersonalNutritionPlan | null
  coachPlan: CoachNutritionPlan | null
  loading: boolean
  error: boolean
}

const EMPTY_SNAPSHOT: PlanSnapshot = {
  personalPlan: null,
  coachPlan: null,
  loading: true,
  error: false,
}

function objectiveKey(value: unknown): 'cut' | 'maintain' | 'bulk' {
  if (typeof value !== 'string') return 'maintain'
  if (['cut', 'seche', 'perte_poids', 'weight_loss'].includes(value)) return 'cut'
  if (['bulk', 'prise_masse', 'mass'].includes(value)) return 'bulk'
  return 'maintain'
}

function NutritionPlanConfiguration({
  profile,
  capabilities,
  supabase,
  userId,
  hasPersonalPlan,
  coachPlanActive,
  coachRelationStatus,
  planStatus,
  onSaved,
  onGenerated,
}: Omit<NutritionProgramSectionProps, 'coachRelationStatus' | 'coachRelationIsAuthoritative' | 'coachId' | 'onBack'> & {
  hasPersonalPlan: boolean
  coachPlanActive: boolean
  coachRelationStatus: ActiveCoachResolutionState['status']
  planStatus: NutritionPlanStatus
  onSaved: () => void
  onGenerated: () => void
}) {
  const t = useTranslations('accountPrograms')
  const quota = useAiQuota()
  const access = resolveNutritionProgramAccess({
    capabilities,
    coachRelationStatus,
    coachPlanActive,
    planStatus,
    quota,
  })

  let blockedReason: string | null = null
  if (access.generationBlockReason === 'coach_plan') blockedReason = t('generationBlockedCoach')
  else if (access.generationBlockReason === 'relation_uncertain') blockedReason = t('generationBlockedRelation')
  else if (access.generationBlockReason === 'plan_read_error') blockedReason = t('generationBlockedPlanStatus')
  else if (access.generationBlockReason === 'capability') blockedReason = t('generationBlockedCapability')
  else if (access.generationBlockReason === 'quota_loading') blockedReason = t('quotaLoading')
  else if (access.generationBlockReason === 'quota_error') blockedReason = t('quotaUnavailable')
  else if (access.generationBlockReason === 'quota_exhausted') blockedReason = t('quotaReached', { days: quota.days })

  return <div id="nutrition-program-configuration" className={styles.configuration}>
    <div className={styles.configurationHeading}>
      <div>
        <span>{t('configurationEyebrow')}</span>
        <h2>{t('configurationTitle')}</h2>
      </div>
      {!quota.loading && !quota.error && capabilities.ai && (
        <span className={styles.quota}>{t('quota', { remaining: quota.remaining, limit: quota.limit })}</span>
      )}
    </div>
    <NutritionPreferences
      profile={profile}
      supabase={supabase}
      userId={userId}
      onSaved={onSaved}
      onPlanRegenerated={() => {
        quota.refresh()
        onGenerated()
      }}
      generationEnabled={access.canGenerate}
      hasPersonalPlan={hasPersonalPlan}
      generationBlockedReason={blockedReason}
    />
  </div>
}

export default function NutritionProgramSection({
  profile,
  capabilities,
  coachRelationStatus,
  coachRelationIsAuthoritative,
  coachId,
  supabase,
  userId,
  fetchAll,
  onBack,
}: NutritionProgramSectionProps) {
  const t = useTranslations('accountPrograms')
  const [snapshot, setSnapshot] = useState<PlanSnapshot>(EMPTY_SNAPSHOT)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const refreshPlans = useCallback(async () => {
    if (!userId) return
    setSnapshot(current => ({ ...current, loading: true, error: false, coachPlan: null }))
    const personalRequest = supabase
      .from('meal_plans')
      .select('id,plan,active,created_at')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const coachRequest = coachRelationIsAuthoritative && coachId
      ? supabase
        .from('client_meal_plans')
        .select('id,coach_id,plan,created_at,updated_at')
        .eq('client_id', userId)
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null })
    const [personal, coach] = await Promise.all([personalRequest, coachRequest])
    setSnapshot({
      personalPlan: (personal.data ?? null) as PersonalNutritionPlan | null,
      coachPlan: (coach.data ?? null) as CoachNutritionPlan | null,
      loading: false,
      error: Boolean(personal.error || coach.error),
    })
  }, [coachId, coachRelationIsAuthoritative, supabase, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshPlans()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshPlans])

  const activePlan = useMemo(() => resolveActiveNutritionPlan({
    coachRelationStatus,
    coachId,
    isAuthoritative: coachRelationIsAuthoritative,
    coachMealPlan: snapshot.coachPlan,
    personalMealPlan: snapshot.personalPlan,
  }), [coachId, coachRelationIsAuthoritative, coachRelationStatus, snapshot.coachPlan, snapshot.personalPlan])
  const coachPlanActive = activePlan.source === 'coach'
  const hasPersonalPlan = activePlan.source === 'personal'
  const planStatus = resolveNutritionPlanStatus({
    loading: snapshot.loading,
    error: snapshot.error,
    hasActivePlan: activePlan.source !== 'none',
  })
  const relationUncertain = coachRelationStatus === 'error' || coachRelationStatus === 'multiple_active'
  const canOpenConfiguration = capabilities.nutrition

  async function handleSaved() {
    await fetchAll()
  }

  async function handleGenerated() {
    await Promise.all([fetchAll(), refreshPlans()])
  }

  return <main className={styles.page}>
    <div className={styles.shell}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        {t('back')}
      </button>

      <header className={styles.header}>
        <span>{t('programsEyebrow')}</span>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </header>

      <section className={styles.summary} aria-labelledby="nutrition-program-title">
        <div className={styles.summaryIcon}><UtensilsCrossed size={22} aria-hidden="true" /></div>
        <div className={styles.summaryContent}>
          <span>{t('nutritionProgram')}</span>
          <h2 id="nutrition-program-title">
            {planStatus === 'loading'
              ? t('loading')
              : planStatus === 'error'
                ? t('statusUnavailable')
                : planStatus === 'empty'
                  ? t('noPlan')
                  : t('activePlan')}
          </h2>
          {(planStatus === 'ready' || planStatus === 'empty') && <dl className={styles.meta}>
            <div><dt>{t('source')}</dt><dd>{activePlan.source === 'coach' ? t('coachSource') : activePlan.source === 'personal' ? t('personalSource') : t('noneSource')}</dd></div>
            <div><dt>{t('objective')}</dt><dd>{t(`objectives.${objectiveKey(profile?.objective)}`)}</dd></div>
          </dl>}
          {snapshot.error && <p className={styles.error} role="status">{t('loadError')}</p>}
          {relationUncertain && <p className={styles.notice} role="status">{t('relationUncertain')}</p>}
          {coachPlanActive && <p className={styles.coachNotice} role="status">
            <ShieldCheck size={17} aria-hidden="true" />
            {t('coachPlanNotice')}
          </p>}
        </div>
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.configureButton}
          aria-expanded={settingsOpen}
          aria-controls="nutrition-program-configuration"
          disabled={!canOpenConfiguration || snapshot.loading}
          onClick={() => setSettingsOpen(open => !open)}
        >
          <Settings2 size={18} aria-hidden="true" />
          <span>{settingsOpen ? t('closeConfiguration') : t('configure')}</span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
        {hasPersonalPlan && !settingsOpen && <button
          type="button"
          className={styles.regenerateButton}
          disabled={!canOpenConfiguration}
          onClick={() => setSettingsOpen(true)}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {t('regenerate')}
        </button>}
      </div>
      {!canOpenConfiguration && <p className={styles.disabledReason}>{t('configurationUnavailable')}</p>}

      {settingsOpen && <NutritionPlanConfiguration
        profile={profile}
        capabilities={capabilities}
        supabase={supabase}
        userId={userId}
        fetchAll={fetchAll}
        hasPersonalPlan={hasPersonalPlan}
        coachPlanActive={coachPlanActive}
        coachRelationStatus={coachRelationStatus}
        planStatus={planStatus}
        onSaved={() => void handleSaved()}
        onGenerated={() => void handleGenerated()}
      />}

      {!settingsOpen && hasPersonalPlan && <p className={styles.regenerationHint}>
        <RefreshCw size={15} aria-hidden="true" />
        {t('regenerationHint')}
      </p>}
    </div>
  </main>
}
