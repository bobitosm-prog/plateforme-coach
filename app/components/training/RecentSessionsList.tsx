'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { HISTORY_FILTERS } from '../../../lib/session-types'
import { matchesWorkoutHistory, type WorkoutHistoryItem } from '../../../lib/training/workout-history'
import { colors, fonts } from '../../../lib/design-tokens'
import type { TrainingReadState } from '../../../lib/training/active-program'
import TrainingSheet from '../training-v2/TrainingSheet'
import { RailOverlay } from '../ui/RailOverlay'
import styles from './RecentSessionsList.module.css'

interface RecentSessionsListProps {
  workoutHistory: WorkoutHistoryItem[]
  state: TrainingReadState
  onOpenDetail: (workout: WorkoutHistoryItem) => void
  loadHistory: (signal: AbortSignal) => Promise<WorkoutHistoryItem[]>
}

export default function RecentSessionsList({ workoutHistory, state, onOpenDetail, loadHistory }: RecentSessionsListProps) {
  const t = useTranslations('training_tab.recent')
  const locale = useLocale()
  const filterLabels: Record<string, string> = Object.fromEntries(HISTORY_FILTERS.map(f => [f.key, t(`filters.${f.key}`)]))
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')
  const [allHistory, setAllHistory] = useState<WorkoutHistoryItem[]>([])
  const [fullState, setFullState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [visibleCount, setVisibleCount] = useState(20)
  const [retry, setRetry] = useState(0)
  const activeFilterRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!showFullHistory) return
    const controller = new AbortController()
    setFullState('loading')
    setAllHistory([])
    setVisibleCount(20)
    loadHistory(controller.signal).then(rows => {
      if (!controller.signal.aborted) { setAllHistory(rows); setFullState('ready') }
    }).catch(() => {
      if (!controller.signal.aborted) setFullState('error')
    })
    return () => controller.abort()
  }, [showFullHistory, loadHistory, retry])

  useEffect(() => {
    if (!showFullHistory) return
    activeFilterRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [historyFilter, showFullHistory])

  const filtered = allHistory.filter(session => matchesWorkoutHistory(session, historyFilter))

  const recent = workoutHistory.slice(0, 3)
  const expanded = filtered.slice(0, visibleCount)

  const renderRows = (sessions: WorkoutHistoryItem[], compact = false) => sessions.map((session, index) => {
    const date = new Date(session.date ? `${session.date}T12:00:00` : session.created_at)
    const dateLabel = date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })

    return (
      <button
        key={session.id}
        type="button"
        onClick={() => { setShowFullHistory(false); setHistoryFilter('all'); onOpenDetail(session) }}
        style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 12,
          minHeight: 58, padding: compact ? '10px 2px' : '10px 12px', background: compact ? 'transparent' : colors.surface2,
          border: compact ? 'none' : `1px solid ${colors.divider}`,
          borderBottom: compact && index < sessions.length - 1 ? `1px solid ${colors.divider}` : undefined,
          borderRadius: compact ? 0 : 13,
          cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: compact ? 0 : 8,
          fontFamily: 'inherit', color: 'inherit',
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', overflow: 'hidden', color: colors.text, fontFamily: fonts.headline, fontSize: 15, textOverflow: 'ellipsis', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {session.name || t('sessionFallback')}
          </span>
          <span style={{ display: 'block', marginTop: 3, color: colors.textDim, fontFamily: fonts.body, fontSize: 11 }}>
            {dateLabel}{session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.success, fontFamily: fonts.alt, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em' }}>
          <CheckCircle2 size={15} aria-hidden="true" />
          {t('completed')}
          <ChevronRight size={16} color={colors.textDim} aria-hidden="true" />
        </span>
      </button>
    )
  })

  return (
    <div style={{ padding: '0 20px', marginBottom: 24 }}>
      <section
        data-training-section-card="recent-history"
        style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 14, padding: 14 }}
      >
        <h2 style={{ margin: '0 0 10px', color: colors.gold, fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', lineHeight: 1.2, textTransform: 'uppercase' }}>
          {t('lastSessions')}
        </h2>

        {state === 'loading' ? (
          <div role="status" style={{ textAlign: 'center', padding: '24px 0', fontFamily: fonts.body, fontSize: 14, color: colors.textDim }}>
            {t('loading')}
          </div>
        ) : state === 'error' ? (
          <div role="status" style={{ textAlign: 'center', padding: '24px 0', fontFamily: fonts.body, fontSize: 14, color: colors.textDim }}>
            {t('loadError')}
          </div>
        ) : recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: fonts.body, fontSize: 14, color: colors.textDim }}>
            {t('noSessions')}
          </div>
        ) : (
          <>
            {renderRows(recent, true)}
            {workoutHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFullHistory(true)}
                style={{
                  width: '100%', minHeight: 44, padding: 12, marginTop: 10,
                  background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)',
                  border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 12,
                  fontFamily: fonts.alt, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.18em', color: colors.gold,
                  textTransform: 'uppercase', cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {t('viewAll')}
              </button>
            )}
          </>
        )}
        {(recent.length === 0 || state === 'error') && state !== 'loading' && (
          <button type="button" className={styles.filterButton} onClick={() => setShowFullHistory(true)}>{t('viewAll')}</button>
        )}
      </section>

      {showFullHistory && (
        <RailOverlay>
          <TrainingSheet viewportContained title={t('historyTitle')} description={fullState === 'ready' ? t('historyTotal', { count: allHistory.length }) : t(fullState === 'error' ? 'loadError' : 'loading')} onClose={() => { setShowFullHistory(false); setHistoryFilter('all') }}>
            <div className={styles.historyContent}>
              <p>{t('filterHelp')}</p>
              <div className={styles.filterRail} data-training-history-filters="advanced">
                {HISTORY_FILTERS.map(filter => {
                  const active = historyFilter === filter.key
                  return (
                    <button
                      ref={active ? activeFilterRef : undefined}
                      key={filter.key}
                      type="button"
                      className={styles.filterButton}
                      aria-pressed={active}
                      onClick={() => { setHistoryFilter(filter.key); setVisibleCount(20) }}
                      style={{
                        background: active ? 'rgba(230,195,100,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${active ? colors.gold : 'rgba(255,255,255,0.1)'}`,
                        color: active ? colors.gold : colors.textDim,
                      }}
                    >
                      {filterLabels[filter.key]}
                    </button>
                  )
                })}
              </div>
              {fullState === 'loading' ? <p role="status">{t('loading')}</p> : fullState === 'error' ? (
                <div role="alert"><p>{t('loadError')}</p><button type="button" className={styles.filterButton} onClick={() => setRetry(value => value + 1)}>{t('retry')}</button></div>
              ) : expanded.length > 0 ? renderRows(expanded) : (
                <div style={{ textAlign: 'center', padding: 24, color: colors.textDim }}>{t('noSessions')}</div>
              )}
              {fullState === 'ready' && expanded.length < filtered.length && <button type="button" className={styles.filterButton} onClick={() => setVisibleCount(value => value + 20)}>{t('showMore')}</button>}
            </div>
          </TrainingSheet>
        </RailOverlay>
      )}
    </div>
  )
}
