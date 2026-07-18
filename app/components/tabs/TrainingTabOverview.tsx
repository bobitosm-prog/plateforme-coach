'use client'

import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { BookOpen, ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'
import SectionTitle from '../ui/SectionTitle'
import { getExerciseName } from '../../../lib/i18n-exercise'
import { getSessionForDay } from '../../../lib/get-today-session'
import { colors, fonts, titleLineStyle, cardStyle, btnPrimary } from '../../../lib/design-tokens'
import { getEffectiveWeek } from '../../../lib/training/program-week'
import { navigateTrainingWeek, selectTrainingDay } from '../../../lib/training/active-program-day'
import { formatRelativeTime } from '../../../lib/formatRelativeTime'
import type { TrainingTabRuntime } from './TrainingTabView'
import type { ScheduledSession } from '../../../lib/schedule-utils'
import type { LegacyTrainingDay, LegacyTrainingExercise, LegacyTrainingProgram } from './training/training-tab-types'

export default function TrainingTabOverview({ runtime }: { runtime: TrainingTabRuntime }) {
  const {
    t, locale, dateLocale, T, aiAllowed, activeCustomProgram,
    setShowProgramManager, customPrograms, weekOffset, weekDir, calTouchStart: calTouchStartRef, weekSessions,
    todayStr, doneDates, setWeekDir, setWeekOffset, setTrainingDay, setCalendarSelectedDate,
    coachProgram, todayKey, lastCompletedByIndex, startProgramWorkout, scheduledBannerDismissed, setScheduledBannerDismissed,
  } = runtime

  return <>
    {/* ═══ SECTION 1 — HEADER ═══ */}
    <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div>
        <div style={{ fontFamily: fonts.headline, fontSize: 24, fontWeight: 400, color: colors.gold, letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase' }}>
          {t('header.title')}
        </div>
        <div style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: colors.textDim, textTransform: 'uppercase', marginTop: 4 }}>
          {activeCustomProgram
            ? `${activeCustomProgram.name}${activeCustomProgram.total_weeks ? ` • SEMAINE ${getEffectiveWeek(activeCustomProgram)}/${activeCustomProgram.total_weeks}` : ''}`
            : t('header.noActiveProgram')}
        </div>
      </div>
      <button onClick={() => setShowProgramManager(true)} aria-label={t('header.managePrograms')}
        style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <BookOpen size={18} color={colors.gold} />
      </button>
    </div>

    {/* ═══ SECTION 2 — CALENDRIER HORIZONTAL ═══ */}
    {(() => {
      const today = new Date()
      const dow = today.getDay()
      const baseMonday = new Date(today)
      baseMonday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
      baseMonday.setHours(0, 0, 0, 0)

      const displayDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(baseMonday)
        d.setDate(baseMonday.getDate() + i)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const ws = weekSessions.find((session: ScheduledSession) => session.scheduled_date === dateStr)
        const progSession = activeCustomProgram?.days?.length ? getSessionForDay(activeCustomProgram.days, i) : null
        const isProgRest = progSession?.type === 'rest'
        return { date: d, dateStr, ws, isProgRest }
      })

      const monthLabel = displayDays[3].date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase()

      const glassBtn: CSSProperties = {
        width: 32, height: 32, borderRadius: 10,
        background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }

      return (
        <div
          data-no-tab-swipe="true"
          style={{ margin: '0 20px', background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 20, marginBottom: 24 }}
          onTouchStart={e => { calTouchStartRef.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (calTouchStartRef.current === null) return
            const diff = e.changedTouches[0].clientX - calTouchStartRef.current
            if (diff > 60) {
              const next = navigateTrainingWeek(weekOffset, 'previous')
              setWeekDir(next.direction); setWeekOffset(next.offset)
            } else if (diff < -60) {
              const next = navigateTrainingWeek(weekOffset, 'next')
              setWeekDir(next.direction); setWeekOffset(next.offset)
            }
            calTouchStartRef.current = null
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: colors.textDim }}>{monthLabel}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {weekOffset !== 0 && (
                <button onClick={() => { const next = navigateTrainingWeek(weekOffset, 'today'); setWeekDir(next.direction); setWeekOffset(next.offset) }} aria-label={t('calendar.backToWeek')}
                  style={{ ...glassBtn, width: 'auto', padding: '6px 12px', fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: colors.gold, textTransform: 'uppercase' as const }}>
                  AUJOURD&apos;HUI
                </button>
              )}
              <button onClick={() => { const next = navigateTrainingWeek(weekOffset, 'previous'); setWeekDir(next.direction); setWeekOffset(next.offset) }} aria-label={t('calendar.prevWeek')} style={glassBtn}>
                <ChevronLeft size={16} color={colors.gold} />
              </button>
              <button onClick={() => { const next = navigateTrainingWeek(weekOffset, 'next'); setWeekDir(next.direction); setWeekOffset(next.offset) }} aria-label={t('calendar.nextWeek')} style={glassBtn}>
                <ChevronRight size={16} color={colors.gold} />
              </button>
            </div>
          </div>

          {/* 7-day grid */}
          <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={weekOffset}
            initial={{ x: weekDir * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -weekDir * 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.7 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}
          >
            {displayDays.map(({ date, dateStr, ws, isProgRest }, i) => {
              const dayNum = date.getDate()
              const dayName = format(date, 'EEE', { locale: dateLocale }).toUpperCase()
              const isToday = dateStr === todayStr
              const isRest = isProgRest || ws?.session_type === 'rest' || ws?.title === 'Repos'
              const isDone = (ws?.completed || doneDates.has(dateStr)) && !isRest
              const isMissed = !isDone && !isToday && !isRest && ws && date < new Date(todayStr)
              const dotColor = isRest ? 'rgba(255,255,255,0.2)' : isDone ? colors.success : isMissed ? colors.error : isToday ? colors.gold : `${colors.goldContainer}4d`

              return (
                <button
                  key={i}
                  onClick={() => {
                    const dayKey = selectTrainingDay(i)
                    if (!dayKey) return
                    setTrainingDay(dayKey)
                    setCalendarSelectedDate(date)
                  }}
                  style={{
                    background: isToday ? `${colors.gold}12` : 'transparent',
                    border: isToday ? `2px solid ${colors.gold}` : `1px solid ${colors.divider}`,
                    borderRadius: 12, padding: '10px 6px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: isToday ? colors.gold : colors.textDim, textTransform: 'uppercase' as const }}>{dayName}</span>
                  <span style={{ fontFamily: fonts.headline, fontSize: 20, fontWeight: 400, lineHeight: 1, color: isToday ? colors.gold : colors.text }}>{dayNum}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, marginTop: 2 }} />
                </button>
              )
            })}
          </motion.div>
          </AnimatePresence>

          {/* Legend compact */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 16 }}>
            {[
              { color: colors.success, label: t('calendar.legendDone') },
              { color: colors.error, label: t('calendar.legendMissed') },
              { color: 'rgba(255,255,255,0.2)', label: t('calendar.legendRest') },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
                <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    })()}

    {/* Scheduled program banner */}
    {!scheduledBannerDismissed && (() => {
      const scheduled = customPrograms.find((program: LegacyTrainingProgram) => program.scheduled && program.start_date)
      if (!scheduled) return null
      const startDate = new Date(scheduled.start_date + 'T00:00:00')
      const now = new Date(); now.setHours(0, 0, 0, 0)
      const diffDays = Math.ceil((startDate.getTime() - now.getTime()) / 86400000)
      if (diffDays < 1) return null
      return (
        <div style={{ margin: '0 24px 8px', padding: '10px 14px', background: colors.goldDim, border: `1px solid ${colors.goldRule}`, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.gold }}>
            Prochain : <span style={{ fontWeight: 700 }}>{scheduled.name}</span> — dans {diffDays} jour{diffDays > 1 ? 's' : ''}
          </div>
          <button onClick={() => setScheduledBannerDismissed(true)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
        </div>
      )
    })()}

    {/* ═══ SECTION 2.5 — MES PROGRAMMES (always visible for AUTO clients) ═══ */}
    {aiAllowed && (
      <div style={{ margin: '0 24px' }}>
        <SectionTitle noPadding title={t('programs.title')} trailing={String(customPrograms.length)} />
        <button onClick={() => setShowProgramManager(true)} style={{ width: '100%', padding: '12px 16px', background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Dumbbell size={16} color={colors.gold} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.text }}>
                {activeCustomProgram ? activeCustomProgram.name : customPrograms.length > 0 ? `${customPrograms.length} programme${customPrograms.length > 1 ? 's' : ''}` : t('programs.createProgram')}
              </div>
              {activeCustomProgram && <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{t('calendar.activeProgram')}</div>}
            </div>
          </div>
          <ChevronRight size={16} color={colors.textMuted} />
        </button>
      </div>
    )}

    {/* ═══ SECTION 2.7 — LISTE SEANCES COACH (invited clients only) ═══ */}
    {!aiAllowed && coachProgram && (
      <div style={{ margin: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={T}>{t('programs.coachProgram')}</span>
          <div style={titleLineStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(coachProgram as Record<string, LegacyTrainingDay>).map(([weekday, day]) => {
            if (!day || day.is_rest || day.repos) return null
            const exercises = day.exercises || []
            if (exercises.length === 0) return null
            const isToday = weekday === todayKey
            const sessionIndex = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].indexOf(weekday)
            const lastDone = lastCompletedByIndex?.get(sessionIndex)
            return (
              <div key={weekday} style={{ ...cardStyle, padding: 16, border: isToday ? `1.5px solid ${colors.gold}` : undefined }}>
                {isToday && (
                  <div style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    {"SUGGERE AUJOURD'HUI"}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 700, color: isToday ? colors.gold : colors.text, letterSpacing: 1 }}>
                      {(day.name || weekday).toUpperCase()}
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      {exercises.length} exercice{exercises.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTrainingDay(weekday)
                      startProgramWorkout(day, exercises, weekday)
                    }}
                    style={{ ...btnPrimary, padding: '10px 20px', borderRadius: 12, fontSize: 12 }}
                  >
                    COMMENCER
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {exercises.slice(0, 4).map((ex: LegacyTrainingExercise, i: number) => (
                    <span key={i} style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, background: colors.goldDim, padding: '2px 8px', borderRadius: 6 }}>
                      {getExerciseName(ex, locale) || t('calendar.exercise')}
                    </span>
                  ))}
                  {exercises.length > 4 && (
                    <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.gold, padding: '2px 8px' }}>
                      +{exercises.length - 4}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textDim, marginTop: 8 }}>
                  Derniere fois : {formatRelativeTime(lastDone)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )}

  </>
}
