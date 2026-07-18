import WorkoutCelebration from '../../tabs/training/WorkoutCelebration'
import { getExerciseName } from '../../../../lib/i18n-exercise'
import { getMuscleLabel } from '../../../../lib/i18n-muscle'
import {
  BG_BASE, BG_CARD_2, BORDER, FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, GOLD_DIM,
  GREEN, RED, TEXT_DIM, TEXT_MUTED, TEXT_PRIMARY, badgeStyle, btnPrimary,
  cardStyle, mutedStyle, pageTitleStyle, statSmallStyle, statStyle, subtitleStyle,
  titleLineStyle, titleStyle, colors,
} from '../../../../lib/design-tokens'
import type { WorkoutPresentationExercise, WorkoutSummaryData, WorkoutTranslate } from './types'

interface WorkoutCompletionViewProps {
  sessionName: string
  elapsedMs: number
  completedSets: number
  totalSets: number
  totalVolume: number
  exercises: WorkoutPresentationExercise[]
  summary: WorkoutSummaryData | null
  summaryLoading: boolean
  autoRedirectCountdown: number
  now: Date
  locale: 'fr' | 'en' | 'de'
  t: WorkoutTranslate
  tMuscle: WorkoutTranslate
  formatDuration(ms: number): string
  onClose(): void
}

export function WorkoutCompletionView(props: WorkoutCompletionViewProps) {
  const { sessionName, elapsedMs, completedSets, totalSets, totalVolume, exercises, summary, summaryLoading, autoRedirectCountdown, now, locale, t, tMuscle, formatDuration, onClose } = props
  const volumeDelta = summary ? summary.currentWeekVolume - summary.lastWeekVolume : 0
  const volumePercent = summary && summary.lastWeekVolume > 0 ? (volumeDelta / summary.lastWeekVolume) * 100 : null
  const trend = volumePercent === null ? 'neutral' : volumePercent > 0.5 ? 'up' : volumePercent < -0.5 ? 'down' : 'neutral'
  const trendColor = trend === 'up' ? GREEN : trend === 'down' ? RED : TEXT_DIM
  const performances = exercises.map(exercise => {
    const doneSets = exercise.sets.filter(set => set.done)
    if (!doneSets.length) return null
    return { name: exercise.name, muscle: exercise.muscle, setsCount: doneSets.length, best: Math.max(...doneSets.map(set => Number(set.weight) || 0)) }
  }).filter((performance): performance is NonNullable<typeof performance> => performance !== null && performance.best > 0)
    .sort((left, right) => right.best - left.best).slice(0, 3)
  const dateLabel = `${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const graphSessions = summary?.previousSessions ? [...summary.previousSessions].reverse().slice(-4) : []
  const maxGraphVolume = graphSessions.length ? Math.max(...graphSessions.map(session => session.volume), totalVolume) : totalVolume

  return (
    <div data-workout-phase="completed">
      <WorkoutCelebration visible />
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: BG_BASE, fontFamily: FONT_BODY, overflowY: 'auto' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[24rem] h-[24rem] pointer-events-none rounded-full" style={{ background: `radial-gradient(circle, ${GOLD_DIM} 0%, transparent 65%)`, filter: 'blur(80px)', opacity: 0.4 }} />
        <div className="relative z-10 flex-1 flex flex-col pt-8 pb-36 w-full" style={{ paddingLeft: 20, paddingRight: 20, maxWidth: 512, marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="flex items-center justify-between mb-6">
            <div style={mutedStyle}>{dateLabel}</div>
            {summaryLoading ? <div style={{ width: 64, height: 22, background: BG_CARD_2, borderRadius: 12, opacity: 0.5 }} /> : volumePercent !== null ? (
              <div style={{ ...badgeStyle, color: trendColor, background: trend === 'up' ? 'rgba(74,222,128,0.12)' : trend === 'down' ? 'rgba(239,68,68,0.12)' : colors.goldDim, fontSize: 11, padding: '4px 10px' }}>
                {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {volumePercent > 0 ? '+' : ''}{volumePercent.toFixed(1)}%
              </div>
            ) : null}
          </div>
          <h1 className="mb-1" style={{ ...pageTitleStyle, fontSize: 40, letterSpacing: '0.04em', lineHeight: 1.05 }}>{t('done.title')}<span style={{ color: GOLD }} /></h1>
          <p className="mb-10" style={{ ...subtitleStyle, color: TEXT_MUTED, fontStyle: 'italic', textTransform: 'none', letterSpacing: '0.02em', fontWeight: 400 }}>{sessionName}</p>
          <div className="flex items-center gap-3 mb-2"><span style={titleStyle}>{t('done.totalVolume')}</span><div style={titleLineStyle} /></div>
          <div style={{ ...cardStyle, padding: '32px 24px', marginBottom: 24, textAlign: 'center', background: `linear-gradient(135deg, ${colors.surface}, ${BG_CARD_2})` }}>
            <div className="flex items-baseline justify-center gap-3">
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 800, color: GOLD, letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(totalVolume).toLocaleString('fr-FR')}</span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: TEXT_MUTED, letterSpacing: '0.05em' }}>kg</span>
            </div>
          </div>
          {graphSessions.length > 0 && <>
            <div className="flex items-center gap-3 mb-2"><span style={titleStyle}>{t('done.lastSessions')}</span><div style={titleLineStyle} /></div>
            <div style={{ ...cardStyle, padding: '20px 16px', marginBottom: 24 }}><div className="flex items-end gap-3 h-24">
              {graphSessions.map((session, index) => {
                const heightPct = (session.volume / maxGraphVolume) * 100
                const isCurrent = index === graphSessions.length - 1
                return <div key={session.id} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t" style={{ height: `${Math.max(heightPct, 6)}%`, background: isCurrent ? GOLD : GOLD_DIM, minHeight: 8 }} />
                  <div style={{ ...mutedStyle, fontSize: 10 }}>{new Date(session.date).getDate()}/{new Date(session.date).getMonth() + 1}</div>
                </div>
              })}
            </div></div>
          </>}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div style={{ ...cardStyle, padding: 20, textAlign: 'center' }}><div style={{ ...titleStyle, fontSize: 10, marginBottom: 8 }}>{t('done.duration')}</div><div style={{ ...statStyle, fontSize: 32 }}>{formatDuration(elapsedMs)}</div></div>
            <div style={{ ...cardStyle, padding: 20, textAlign: 'center' }}><div style={{ ...titleStyle, fontSize: 10, marginBottom: 8 }}>{t('done.sets')}</div><div style={{ ...statStyle, fontSize: 32 }}>{completedSets}<span style={{ color: TEXT_DIM, fontSize: 22 }}>/{totalSets}</span></div></div>
          </div>
          {performances.length > 0 && <>
            <div className="flex items-center gap-3 mb-2"><span style={titleStyle}>{t('done.exercises')}</span><div style={titleLineStyle} /></div>
            <div style={{ ...cardStyle, padding: '8px 20px' }}>{performances.map((performance, index) => <div key={`${performance.name}-${index}`}>
              <div className="py-3 flex justify-between items-center gap-3"><div className="flex-1 min-w-0">
                <div style={{ fontFamily: FONT_ALT, fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: '0.01em' }} className="truncate">{getExerciseName(performance, locale)}</div>
                <div className="mt-0.5" style={{ ...mutedStyle, fontSize: 11 }}>{t('done.setsCount', { count: performance.setsCount })} · {getMuscleLabel(performance.muscle, locale, tMuscle)}</div>
              </div><div style={{ ...statSmallStyle, fontSize: 18 }}>{performance.best} kg</div></div>
              {index < performances.length - 1 && <div style={{ height: 1, background: BORDER, opacity: 0.5 }} />}
            </div>)}</div>
          </>}
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-20" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
          <div className="pt-6" style={{ paddingLeft: 20, paddingRight: 20, maxWidth: 512, marginLeft: 'auto', marginRight: 'auto', background: 'linear-gradient(to top, rgba(13,11,8,0.98) 0%, rgba(13,11,8,0.95) 60%, transparent 100%)' }}>
            <button onClick={onClose} style={{ ...btnPrimary, width: '100%', padding: '16px 0', fontSize: 14 }} className="active:scale-[0.98] transition-transform">{t('done.backToDashboard')}</button>
            <p className="text-center mt-3" style={{ ...mutedStyle, fontSize: 11 }}>{t('done.autoRedirect', { seconds: autoRedirectCountdown })}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
