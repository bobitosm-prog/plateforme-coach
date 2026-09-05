'use client'

import { forwardRef, useId, useImperativeHandle, useRef, useState } from 'react'
import { Check, ChevronRight, Droplets, Loader2, Moon, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { HomeViewModel } from '../../../lib/home/home-dashboard-model'
import styles from './HomeV2.module.css'

type CheckInDraft = {
  mood: string | null
  sleep: string
  note: string
}

type Diagnostic = {
  id: string
  score_semaine: number
  points_forts?: string[]
} | null

type CoachSession = {
  weekday: string
  day: {
    name?: string
    day_name?: string
    exercises?: unknown[]
  }
} | null

export interface HomeV2LowerSectionsHandle {
  openCheckIn: () => void
}

interface HomeV2LowerSectionsProps {
  model: HomeViewModel
  waterToday: number
  waterTarget: number
  diagnostic: Diagnostic
  generatingDiagnostic: boolean
  diagnosticGenerationError: boolean
  coachProgram: Record<string, { name?: string; day_name?: string; exercises?: unknown[]; repos?: boolean; is_rest?: boolean }> | null
  nextSession: CoachSession
  completedThisWeek?: Map<number, string>
  todayKey: string
  onSaveCheckIn: (draft: CheckInDraft, wasCompleted: boolean) => Promise<boolean>
  onAddWater: (amountMl: number) => Promise<boolean>
  onGenerateDiagnostic: () => void
  onViewDiagnostic: () => void
  onOpenTraining: () => void
}

const moods = [
  { id: 'fatigue', icon: '😴' },
  { id: 'normal', icon: '😐' },
  { id: 'bien', icon: '💪' },
  { id: 'top', icon: '🔥' },
  { id: 'energie', icon: '⚡' },
] as const

const weekdays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

export function hasActiveCoachWeek(coach: HomeViewModel['coach']): boolean {
  return coach.relationStatus === 'active'
    && typeof coach.coachId === 'string'
    && coach.coachId.trim().length > 0
}

export function isTodayCoachSession(nextSession: CoachSession, todayKey: string): boolean {
  return Boolean(nextSession && nextSession.weekday === todayKey)
}

function moodIcon(mood: string | null): string | null {
  return moods.find(item => item.id === mood)?.icon ?? null
}

const HomeV2LowerSections = forwardRef<HomeV2LowerSectionsHandle, HomeV2LowerSectionsProps>(function HomeV2LowerSections({
  model,
  waterToday,
  waterTarget,
  diagnostic,
  generatingDiagnostic,
  diagnosticGenerationError,
  coachProgram,
  nextSession,
  completedThisWeek,
  todayKey,
  onSaveCheckIn,
  onAddWater,
  onGenerateDiagnostic,
  onViewDiagnostic,
  onOpenTraining,
}, ref) {
  const t = useTranslations('home.v2.lower')
  const panelId = useId()
  const checkInCardRef = useRef<HTMLElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [savingCheckIn, setSavingCheckIn] = useState(false)
  const [checkInError, setCheckInError] = useState(false)
  const [localCheckIn, setLocalCheckIn] = useState<CheckInDraft | null>(null)
  const [draft, setDraft] = useState<CheckInDraft>({ mood: null, sleep: '', note: '' })
  const [addingWater, setAddingWater] = useState(false)
  const [waterError, setWaterError] = useState(false)

  const displayedCheckIn = localCheckIn ?? {
    mood: model.checkIn.mood,
    sleep: model.checkIn.sleep == null ? '' : String(model.checkIn.sleep),
    note: model.checkIn.note ?? '',
  }
  const checkInCompleted = localCheckIn !== null || model.checkIn.completedToday
  const checkInLoading = model.checkIn.state === 'loading' && localCheckIn === null
  const checkInUnavailable = model.checkIn.state === 'error' && localCheckIn === null

  function openCheckIn() {
    if (checkInLoading || checkInUnavailable) return
    setDraft(displayedCheckIn)
    setCheckInError(false)
    setExpanded(true)
    requestAnimationFrame(() => {
      checkInCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      checkInCardRef.current?.focus({ preventScroll: true })
    })
  }

  useImperativeHandle(ref, () => ({ openCheckIn }))

  async function saveCheckIn() {
    if (!draft.mood || savingCheckIn) return
    setSavingCheckIn(true)
    setCheckInError(false)
    const saved = await onSaveCheckIn(draft, checkInCompleted)
    setSavingCheckIn(false)
    if (!saved) {
      setCheckInError(true)
      return
    }
    setLocalCheckIn(draft)
    setExpanded(false)
  }

  async function addWater() {
    if (addingWater) return
    setAddingWater(true)
    setWaterError(false)
    const saved = await onAddWater(250)
    setAddingWater(false)
    setWaterError(!saved)
  }

  const waterPercent = waterTarget > 0
    ? Math.min(100, Math.round((waterToday / waterTarget) * 100))
    : 0
  const showCoachWeek = hasActiveCoachWeek(model.coach) && Boolean(coachProgram)
  const todayIndex = weekdays.indexOf(todayKey as typeof weekdays[number])
  const coachWeekItems = weekdays
    .map((weekday, index) => ({
      weekday,
      index,
      day: coachProgram?.[weekday],
      isToday: weekday === todayKey,
      completed: completedThisWeek?.has(index) ?? false,
    }))
    .filter(item => item.isToday || (item.day && !item.day.repos && !item.day.is_rest && item.day.exercises?.length))
    .sort((a, b) => {
      if (a.isToday) return -1
      if (b.isToday) return 1
      const aDistance = todayIndex < 0 ? a.index : (a.index - todayIndex + 7) % 7
      const bDistance = todayIndex < 0 ? b.index : (b.index - todayIndex + 7) % 7
      return aDistance - bDistance
    })
    .slice(0, 4)
  const futureSession = nextSession && !isTodayCoachSession(nextSession, todayKey)
    ? nextSession
    : null
  const diagnosticLoading = model.diagnostic.state === 'loading' || generatingDiagnostic
  const diagnosticUnavailable = model.diagnostic.state === 'error'

  return <div className={styles.lowerSections} data-home-v2-lower>
    <section className={styles.lowerSection} aria-labelledby="home-today-actions-title">
      <h2 id="home-today-actions-title" className={styles.lowerSectionTitle}>{t('today')}</h2>
      <div className={styles.lowerGrid}>
        <article ref={checkInCardRef} tabIndex={-1} className={styles.quickCard} data-check-in-card aria-busy={checkInLoading}>
          <div className={styles.quickCardHeader}>
            <div>
              <p className={styles.quickEyebrow}>{t('checkIn.label')}</p>
              {checkInCompleted ? <div className={styles.checkInSummary}>
                {moodIcon(displayedCheckIn.mood) && <span className={styles.moodSummary} aria-hidden="true">{moodIcon(displayedCheckIn.mood)}</span>}
                <div>
                  <strong>{t('checkIn.saved')}</strong>
                  {displayedCheckIn.sleep && <span><Moon size={13} aria-hidden="true" /> {t('checkIn.sleepSummary', { hours: displayedCheckIn.sleep })}</span>}
                </div>
              </div> : <p className={styles.quickCopy} role={checkInUnavailable ? 'status' : undefined}>
                {checkInLoading
                  ? t('checkIn.loading')
                  : checkInUnavailable
                    ? t('checkIn.unavailable')
                    : t('checkIn.missing')}
              </p>}
            </div>
            <button
              type="button"
              className={styles.compactButton}
              aria-expanded={expanded}
              aria-controls={panelId}
              disabled={checkInLoading || checkInUnavailable}
              onClick={() => expanded ? setExpanded(false) : openCheckIn()}
            >
              {expanded ? t('checkIn.close') : checkInCompleted ? t('checkIn.edit') : t('checkIn.start')}
            </button>
          </div>

          {expanded && <div id={panelId} className={styles.checkInPanel} data-no-tab-swipe="true">
            <p className={styles.formQuestion}>{t('checkIn.question')}</p>
            <div className={styles.moodGrid} role="group" aria-label={t('checkIn.question')}>
              {moods.map(mood => <button
                key={mood.id}
                type="button"
                className={styles.moodButton}
                data-selected={draft.mood === mood.id}
                aria-pressed={draft.mood === mood.id}
                onClick={() => setDraft(current => ({ ...current, mood: mood.id }))}
              >
                <span aria-hidden="true">{mood.icon}</span>
                <small>{t(`checkIn.moods.${mood.id}`)}</small>
              </button>)}
            </div>
            <label className={styles.fieldRow}>
              <span>{t('checkIn.sleep')}</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="14"
                inputMode="decimal"
                value={draft.sleep}
                onChange={event => setDraft(current => ({ ...current, sleep: event.target.value }))}
              />
              <span aria-hidden="true">h</span>
            </label>
            <label className={styles.noteField}>
              <span className="sr-only">{t('checkIn.note')}</span>
              <textarea
                value={draft.note}
                onChange={event => setDraft(current => ({ ...current, note: event.target.value.slice(0, 200) }))}
                placeholder={t('checkIn.note')}
                rows={2}
                maxLength={200}
              />
            </label>
            {checkInError && <p className={styles.inlineError} role="status">{t('checkIn.error')}</p>}
            <button
              type="button"
              className={`${styles.button} ${styles.primary} ${styles.saveCheckIn}`}
              disabled={!draft.mood || savingCheckIn}
              onClick={saveCheckIn}
            >
              {savingCheckIn && <Loader2 size={16} className={styles.spinner} aria-hidden="true" />}
              {savingCheckIn ? t('checkIn.saving') : checkInCompleted ? t('checkIn.update') : t('checkIn.save')}
            </button>
          </div>}
        </article>

        <article className={styles.quickCard}>
          <div className={styles.hydrationRow}>
            <span className={styles.lowerIcon}><Droplets size={19} aria-hidden="true" /></span>
            <div className={styles.hydrationValue}>
              <p className={styles.quickEyebrow}>{t('hydration.label')}</p>
              <strong>{t('hydration.value', { current: (waterToday / 1000).toFixed(1), target: (waterTarget / 1000).toFixed(1) })}</strong>
            </div>
            <button
              type="button"
              className={styles.compactButton}
              aria-label={t('hydration.addLabel')}
              disabled={addingWater}
              onClick={addWater}
            >
              {addingWater ? <Loader2 size={16} className={styles.spinner} aria-hidden="true" /> : t('hydration.add')}
            </button>
          </div>
          <div className={styles.hydrationTrack} role="progressbar" aria-label={t('hydration.label')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={waterPercent}>
            <span style={{ width: `${waterPercent}%` }} />
          </div>
          {waterError && <p className={styles.inlineError} role="status">{t('hydration.error')}</p>}
        </article>
      </div>
    </section>

    <section className={styles.lowerSection} aria-labelledby="home-week-title">
      <h2 id="home-week-title" className={styles.lowerSectionTitle}>{t('week')}</h2>
      <div className={`${styles.weeklyGrid} ${showCoachWeek ? '' : styles.weeklyGridSolo}`}>
        <article className={styles.weeklyCard} aria-busy={diagnosticLoading}>
          <div className={styles.quickCardHeader}>
            <div>
              <p className={styles.quickEyebrow}>{t('diagnostic.label')}</p>
              {diagnostic ? <div className={styles.diagnosticSummary}>
                <strong>{diagnostic.score_semaine}<small>/100</small></strong>
                <p>{diagnostic.points_forts?.[0] ?? t('diagnostic.ready')}</p>
              </div> : <p className={styles.quickCopy} role={diagnosticUnavailable ? 'status' : undefined}>
                {diagnosticUnavailable
                  ? t('diagnostic.unavailable')
                  : diagnosticLoading
                    ? t('diagnostic.loading')
                    : model.diagnostic.canGenerate
                      ? t('diagnostic.empty')
                      : t('diagnostic.notAvailable')}
              </p>}
            </div>
            <span className={styles.lowerIcon}><Sparkles size={19} aria-hidden="true" /></span>
          </div>
          {diagnosticGenerationError && <p className={styles.inlineError} role="status">{t('diagnostic.error')}</p>}
          <button
            type="button"
            className={styles.textButton}
            disabled={diagnosticLoading || (!diagnostic && !model.diagnostic.canGenerate)}
            onClick={diagnostic ? onViewDiagnostic : onGenerateDiagnostic}
          >
            {diagnosticLoading && <Loader2 size={16} className={styles.spinner} aria-hidden="true" />}
            {diagnosticLoading
              ? t('diagnostic.generating')
              : diagnostic
                ? t('diagnostic.view')
                : model.diagnostic.canGenerate
                  ? t('diagnostic.generate')
                  : t('diagnostic.notAvailable')}
            {!diagnosticLoading && (diagnostic || model.diagnostic.canGenerate) && <ChevronRight size={16} aria-hidden="true" />}
          </button>
        </article>

        {showCoachWeek && <article className={styles.weeklyCard} data-coach-week>
          <div className={styles.quickCardHeader}>
            <div>
              <p className={styles.quickEyebrow}>{t('coachWeek.label')}</p>
              {futureSession && <p className={styles.upcomingSession}>
                <span>{t('coachWeek.upcoming')}</span>
                <strong>{t(`days.${futureSession.weekday}`)} · {futureSession.day.name ?? futureSession.day.day_name ?? t('coachWeek.session')}</strong>
              </p>}
            </div>
          </div>
          <div className={styles.coachWeekList}>
            {coachWeekItems.map(item => <div key={item.weekday} className={styles.coachWeekItem} data-today={item.isToday}>
              <span>{t(`days.${item.weekday}`)}</span>
              <strong>{item.completed ? <><Check size={14} aria-hidden="true" /> {t('coachWeek.completed')}</> : item.isToday ? t('coachWeek.today') : t('coachWeek.planned')}</strong>
            </div>)}
          </div>
          <button type="button" className={styles.textButton} onClick={onOpenTraining}>
            {t('coachWeek.cta')} <ChevronRight size={16} aria-hidden="true" />
          </button>
        </article>}
      </div>
    </section>
  </div>
})

export default HomeV2LowerSections
