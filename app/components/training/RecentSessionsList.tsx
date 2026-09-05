'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { resolveSessionType, HISTORY_FILTERS } from '../../../lib/session-types'
import { colors, fonts } from '../../../lib/design-tokens'
import type { TrainingReadState } from '../../../lib/training/active-program'
import TrainingSheet from '../training-v2/TrainingSheet'
import { RailOverlay } from '../ui/RailOverlay'
import styles from './RecentSessionsList.module.css'

interface RecentSessionsListProps {
  workoutHistory: WorkoutHistoryItem[]
  state: TrainingReadState
  onOpenDetail: (workout: WorkoutHistoryItem) => void
}

interface WorkoutHistoryItem {
  id: string
  name?: string | null
  completed?: boolean | null
  created_at: string
  duration_minutes?: number | null
}

export default function RecentSessionsList({ workoutHistory, state, onOpenDetail }: RecentSessionsListProps) {
  const t = useTranslations('training_tab.recent')
  const locale = useLocale()
  const filterLabels: Record<string, string> = Object.fromEntries(HISTORY_FILTERS.map(f => [f.key, t(`filters.${f.key}`)]))
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')
  const activeFilterRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!showFullHistory) return
    activeFilterRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [historyFilter, showFullHistory])

  const filtered = workoutHistory.filter(session => {
    if (historyFilter === 'all') return true
    const resolved = resolveSessionType(session.name)
    return resolved.key === historyFilter
  })

  const recent = workoutHistory.slice(0, 3)
  const expanded = filtered.slice(0, 20)

  const renderRows = (sessions: WorkoutHistoryItem[], compact = false) => sessions.map((session, index) => {
    const date = new Date(session.created_at)
    const dateLabel = date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })

    return (
      <button
        key={session.id}
        type="button"
        onClick={() => onOpenDetail(session)}
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
            {workoutHistory.length > 3 && (
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
      </section>

      {showFullHistory && (
        <RailOverlay>
          <TrainingSheet viewportContained title={t('historyTitle')} description={t('historyTotal', { count: workoutHistory.length })} onClose={() => { setShowFullHistory(false); setHistoryFilter('all') }}>
            <div className={styles.historyContent}>
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
                      onClick={() => setHistoryFilter(filter.key)}
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
              {expanded.length > 0 ? renderRows(expanded) : (
                <div style={{ textAlign: 'center', padding: 24, color: colors.textDim }}>{t('noSessions')}</div>
              )}
            </div>
          </TrainingSheet>
        </RailOverlay>
      )}
    </div>
  )
}
