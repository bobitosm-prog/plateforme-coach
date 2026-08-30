'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, ArrowLeft, ChevronDown, Dumbbell, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { UserCapabilities } from '../../../../lib/entitlements/capabilities'
import type { ActiveTrainingProgramContext } from '../../../../lib/training/active-program'
import {
  resolveProfileTrainingObjective,
  resolveTrainingProgramAccess,
  resolveTrainingProgramFrequency,
} from '../../../../lib/training/training-program-access'
import styles from './TrainingProgramSection.module.css'

const TrainingProgramManager = dynamic(() => import('../../training/TrainingProgramManager'), {
  ssr: false,
  loading: () => <div role="status" aria-live="polite" className={styles.configurationLoading} />,
})

interface TrainingProgramSectionProps {
  activeProgram: ActiveTrainingProgramContext
  capabilities: UserCapabilities
  profileObjective: unknown
  supabase: SupabaseClient
  session: Session | null
  profile?: unknown
  onRefresh: (forceRefresh?: boolean) => Promise<void>
  onBack: () => void
}

export default function TrainingProgramSection({
  activeProgram,
  capabilities,
  profileObjective,
  supabase,
  session,
  profile,
  onRefresh,
  onBack,
}: TrainingProgramSectionProps) {
  const t = useTranslations('accountPrograms.training')
  const [preparationOpen, setPreparationOpen] = useState(false)
  const access = resolveTrainingProgramAccess({ capabilities, activeProgramContext: activeProgram })
  const frequency = resolveTrainingProgramFrequency(activeProgram)
  const objective = resolveProfileTrainingObjective(profileObjective)
  const isLoading = activeProgram.state === 'loading'
  const isRelationUncertain = access.reason === 'relation_uncertain'
  const isCoachPlan = activeProgram.source === 'coach' && activeProgram.coachRelation.status === 'active'

  const status = activeProgram.state === 'error'
    ? t('statusUnavailable')
    : activeProgram.state === 'empty'
      ? t('statusEmpty')
      : activeProgram.state === 'partial'
        ? t('statusPartial')
        : t('statusActive')

  const summaryTitle = activeProgram.state === 'error'
    ? t('summaryTitleUnavailable')
    : activeProgram.source === 'coach'
      ? t('summaryTitleCoach')
      : activeProgram.source === 'personal'
        ? t('summaryTitlePersonal')
        : t('summaryTitleEmpty')

  const source = activeProgram.source === 'coach'
    ? t('sourceCoach')
    : activeProgram.source === 'personal'
      ? t('sourcePersonal')
      : t('sourceNone')

  const objectiveLabel = objective.key
    ? t(`objectives.${objective.key}`)
    : objective.label ?? t('objectiveUndefined')

  const disabledReason = access.reason === 'coach_plan_protected'
    ? t('coachProtected')
    : access.reason === 'relation_uncertain'
      ? t('relationUncertain')
      : access.reason === 'authority_error'
        ? t('authorityError')
        : access.reason === 'training_unavailable'
          ? t('configurationUnavailable')
          : null

  return (
    <section className={styles.page} aria-labelledby="training-program-title">
      <div className={styles.shell}>
        <button type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          {t('back')}
        </button>

        <header className={styles.header}>
          <span>{t('eyebrow')}</span>
          <h1 id="training-program-title">{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </header>

        {isLoading ? (
          <div className={styles.loading} role="status" aria-live="polite" aria-busy="true">
            <span className={styles.srOnly}>{t('loading')}</span>
            <div className={styles.loadingIcon} />
            <div className={styles.loadingLines}><i /><i /><i /></div>
          </div>
        ) : (
          <article className={styles.summary} aria-live="polite">
            <div className={styles.summaryIcon} aria-hidden="true"><Dumbbell size={22} /></div>
            <div className={styles.summaryContent}>
              <span>{t('summary')}</span>
              <h2>{summaryTitle}</h2>

              <dl className={styles.meta}>
                <div><dt>{t('status')}</dt><dd>{status}</dd></div>
                <div><dt>{t('source')}</dt><dd>{source}</dd></div>
                <div><dt>{t('profileObjective')}</dt><dd>{objectiveLabel}</dd></div>
                <div><dt>{t('frequency')}</dt><dd>{frequency === null ? t('frequencyUnavailable') : t('daysPerWeek', { count: frequency })}</dd></div>
              </dl>

              {activeProgram.state === 'partial' && (
                <p className={styles.notice}><AlertTriangle size={16} aria-hidden="true" />{t('partialNotice')}</p>
              )}
              {activeProgram.state === 'error' && (
                <p className={styles.error}><AlertTriangle size={16} aria-hidden="true" />{t('authorityError')}</p>
              )}
              {isRelationUncertain && activeProgram.state !== 'error' && (
                <p className={styles.error}><AlertTriangle size={16} aria-hidden="true" />{t('relationUncertain')}</p>
              )}
              {isCoachPlan && (
                <p className={styles.coachNotice}><ShieldCheck size={16} aria-hidden="true" />{t('coachNotice')}</p>
              )}

              {!isCoachPlan && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.configureButton}
                    disabled={!access.canConfigure}
                    aria-expanded={access.canConfigure ? preparationOpen : undefined}
                    aria-controls={access.canConfigure ? 'training-program-preparation' : undefined}
                    onClick={() => setPreparationOpen(open => !open)}
                  >
                    <span>{t('configure')}</span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </button>
                  {disabledReason && <p className={styles.disabledReason}>{disabledReason}</p>}
                </div>
              )}
            </div>
          </article>
        )}

        {preparationOpen && access.canConfigure && (
          <div id="training-program-preparation">
            <TrainingProgramManager
              embedded
              supabase={supabase}
              session={session}
              profile={profile}
              capabilities={capabilities}
              activeProgramContext={activeProgram}
              onRefresh={onRefresh}
              onClose={() => setPreparationOpen(false)}
            />
          </div>
        )}
      </div>
    </section>
  )
}
