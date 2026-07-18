'use client'

import { Dumbbell } from 'lucide-react'
import { colors, fonts, btnSecondary } from '../../../lib/design-tokens'
import CardioSection from '../CardioSection'
import WorkoutCelebration from './training/WorkoutCelebration'
import TrainingActiveBar from './training/TrainingActiveBar'
import TrainingRestDay from './training/TrainingRestDay'
import SessionDoneModal from '../training/SessionDoneModal'
import { getRestSeconds } from '../../../lib/utils/exercise'
import HeroSessionCard, { type HeroState } from '../home/HeroSessionCard'
import SessionDetailModal from '../training/SessionDetailModal'
import RecentSessionsList from '../training/RecentSessionsList'
import PhaseProgressBanner from '../training/PhaseProgressBanner'
import ExerciseLibrarySection from '../training/ExerciseLibrarySection'
import { padTo7Days } from '../training/ProgramBuilder'
import TrainingTimerAlertModal from './training/modals/TrainingTimerAlertModal'
import TrainingProgramDayEditor from './training/TrainingProgramDayEditor'
import TrainingSessionExerciseList from './training/TrainingSessionExerciseList'
import TrainingTabOverlays from './training/TrainingTabOverlays'
import TrainingTabOverview from './TrainingTabOverview'
import type { TrainingTabProps } from './TrainingTabController'
import type { ScheduledSession } from '../../../lib/schedule-utils'
import type { LegacyTrainingExercise, LegacyTrainingProgram } from './training/training-tab-types'

export type TrainingTabRuntime = Record<string, TrainingTabProps['supabase']>

export default function TrainingTabView({ runtime }: { runtime: TrainingTabRuntime }) {
  const {
    t, supabase, session, profile, coachProgram, todayKey, todaySessionDone, startProgramWorkout,
    calendarSelectedDate, setModal, trainingDay, completedSets, setInputs, exercisesCache, workoutHistory,
    workoutFinished, workoutStarted, setVideoExercise, restingSet, restTimer, restRunning, elapsedSecs,
    showTimerAlert, setShowTimerAlert, motivationalMsg, activeCustomProgram, setActiveCustomProgram,
    setShowAddExercise, setExerciseSearchQ, setShowExDbModal, setTechniqueTooltip, showSessionModal, setShowSessionModal, trainingIsToday, todayStr,
    trainingDayData, trainingExercises, trainingTotalSets, trainingDoneSets, doneDates, weekSessions,
    editMode, setEditMode, editedDays, setEditedDays, loadExerciseInfo, startEditMode, editExField,
    editRemoveEx, editMoveEx, loadEditVariants, saveEditedProgram, fmtElapsed, fmtRest, updateInput,
    addSet, toggleSet, cancelRest, handleExerciseInfo, handleFinishWithCheck, openWorkoutDetail,
  } = runtime

  return (
    <div style={{ minHeight: '100vh', background: colors.background, paddingBottom: 100, overflowX: 'hidden', maxWidth: '100%' }}>
      <style>{`
        .set-input { -webkit-appearance: none; appearance: none; }
        .set-input::-webkit-inner-spin-button,
        .set-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .set-input:focus { border-color: ${colors.gold} !important; }
        @keyframes ttPopIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media(max-width:480px){
          .set-grid{grid-template-columns:28px 1fr 70px 52px 28px!important;gap:2px!important;padding-left:8px!important;padding-right:8px!important}
          .set-grid .prev-col{font-size:11px!important}
        }
      `}</style>

      {/* ── TIMER COMPLETE POPUP ── */}
      {showTimerAlert && (
        <TrainingTimerAlertModal message={motivationalMsg} restDoneLabel={t('session.restDone')} onClose={() => setShowTimerAlert(false)} />
      )}

      {/* ── WORKOUT FINISHED CELEBRATION ── */}
      <WorkoutCelebration visible={workoutFinished} />

      <TrainingTabOverview runtime={runtime} />

      {/* ═══ SECTION 3 — SÉANCE DU JOUR (HeroSessionCard compact) ═══ */}
      {(() => {
        const dayStatus = (() => {
          if (trainingIsToday) return 'today' as const
          const target = calendarSelectedDate ? new Date(calendarSelectedDate) : new Date()
          target.setHours(0, 0, 0, 0)
          const now = new Date(); now.setHours(0, 0, 0, 0)
          if (target > now) return 'future' as const
          const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
          const ws = weekSessions.find((session: ScheduledSession) => session.scheduled_date === dateStr)
          return (ws?.completed || doneDates.has(dateStr)) ? 'done' as const : 'missed' as const
        })()

        const heroState: HeroState = (() => {
          if (!activeCustomProgram && !coachProgram) return 'no-program'
          if (trainingDayData?.repos) return 'rest'
          if (trainingExercises.length === 0) return 'no-exercises'
          if (todaySessionDone && trainingIsToday) return 'done'
          if (dayStatus === 'done') return 'done'
          return 'active'
        })()

        const sessionName = (() => {
          if (activeCustomProgram?.days?.length) {
            const idx = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
            const paddedDays = padTo7Days(activeCustomProgram.days)
            const day = paddedDays[idx]
            if (day?.name && day.name !== 'Repos') return day.name
          }
          const ws = weekSessions.find((session: ScheduledSession) => session.scheduled_date === todayStr && session.session_type !== 'rest')
          if (ws?.title) return ws.title
          return trainingDay
        })()

        const dayLabel = trainingIsToday ? undefined : `SEANCE — ${trainingDay.toUpperCase()}`
        const dayBadge = dayStatus === 'today' ? null
          : dayStatus === 'future' ? { text: 'A VENIR', color: colors.textDim }
          : dayStatus === 'done' ? { text: 'TERMINEE', color: colors.success }
          : { text: 'MANQUEE', color: colors.error }

        return (
          <>
            <HeroSessionCard
              state={heroState}
              sessionTitle={sessionName}
              todayExercises={trainingExercises}
              todaySession={todaySessionDone && trainingIsToday ? { id: 'today', created_at: new Date().toISOString() } : null}
              onStart={() => startProgramWorkout(trainingDayData, trainingExercises)}
              onCalendar={() => {}}
              onClick={() => setShowSessionModal(true)}
              onViewDetail={() => setShowSessionModal(true)}
              dayLabel={dayLabel}
              dayBadge={dayBadge}
              hideCalendarButton
              hideStartButton={!trainingIsToday || todaySessionDone}
            />
            <div style={{ margin: '0 20px' }}>
              <button
                onClick={() => startProgramWorkout({ day_name: 'Séance libre' }, [])}
                style={{ ...btnSecondary, width: '100%', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {t('session.freeSession')}
              </button>
            </div>
            {todaySessionDone && trainingIsToday ? (
              <SessionDoneModal
                isOpen={showSessionModal}
                onClose={() => setShowSessionModal(false)}
                sessionId={workoutHistory[0]?.id ?? null}
                sessionTitle={sessionName}
                todayKey={todayKey}
                coachProgram={coachProgram}
                supabase={supabase}
                userId={session?.user?.id ?? ''}
              />
            ) : (
            <SessionDetailModal
              isOpen={showSessionModal}
              onClose={() => setShowSessionModal(false)}
              sessionTitle={sessionName}
              dayStatus={dayStatus}
              dayBadge={dayBadge}
            >
              {/* ── Modal content: read-only exercise detail ── */}
              {(() => {
                if (trainingDayData?.repos) return <TrainingRestDay />
                if (!activeCustomProgram && !coachProgram) return (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textDim }}>
                    <Dumbbell size={48} color={colors.textDim} style={{ marginBottom: 16 }} />
                    <p style={{ fontFamily: fonts.body, fontSize: 14, margin: 0 }}>{t('session.noActiveProgram')}</p>
                  </div>
                )
                if (trainingExercises.length === 0) return (
                  <p style={{ textAlign: 'center', padding: 40, color: colors.textDim, fontFamily: fonts.body }}>{t('session.noExercisesForDay', { day: trainingDay })}</p>
                )

                const totalSets = trainingExercises.reduce((sum: number, exercise: LegacyTrainingExercise) => sum + (Number(exercise.sets) || 3), 0)
                const totalRest = Math.round(trainingExercises.reduce((sum: number, exercise: LegacyTrainingExercise) => sum + getRestSeconds(exercise), 0) / 60)

                return (
                  <>
                    {activeCustomProgram?.phases && activeCustomProgram?.total_weeks && trainingIsToday && (
                      <div style={{ marginBottom: 20 }}>
                        <PhaseProgressBanner program={activeCustomProgram} />
                      </div>
                    )}

                    {/* Mini-stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                      {[
                        { label: 'SETS', value: totalSets },
                        { label: t('session.exercises'), value: trainingExercises.length },
                        { label: t('session.rest'), value: `${totalRest}min` },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 12, padding: 14, textAlign: 'center' }}>
                          <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 400, color: colors.gold, lineHeight: 1 }}>{stat.value}</div>
                          <div style={{ fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: colors.textDim, textTransform: 'uppercase', marginTop: 4 }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* MODIFIER button (today, not editing, not in workout) */}
                    {trainingIsToday && activeCustomProgram && !editMode && !workoutStarted && (
                      <div style={{ marginBottom: 16 }}>
                        <button onClick={startEditMode} style={{ ...btnSecondary, padding: '14px 20px', borderRadius: 14, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
                          MODIFIER
                        </button>
                      </div>
                    )}

                    {/* EDIT MODE or EXERCISE CARDS */}
                    {editMode && editedDays ? (() => {
                      const dayIdx = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(trainingDay)
                      const day = editedDays[dayIdx]
                      if (!day?.exercises) return null
                      return <TrainingProgramDayEditor
                        dayIndex={dayIdx}
                        day={day}
                        labels={{
                          editMode: t('calendar.buttons.editMode'), sets: t('calendar.sets'), reps: t('calendar.reps'),
                          rest: t('calendar.restLabel'), tempo: t('calendar.tempoLabel'), addExercise: t('session.addExercise'),
                          save: t('calendar.buttons.save'), cancel: t('calendar.buttons.cancel'),
                        }}
                        onMove={editMoveEx}
                        onInfo={loadExerciseInfo}
                        onVariants={loadEditVariants}
                        onRemove={editRemoveEx}
                        onChange={editExField}
                        onAdd={() => { setShowAddExercise(true); setExerciseSearchQ('') }}
                        onSave={saveEditedProgram}
                        onCancel={() => { setEditMode(false); setEditedDays(null) }}
                      />
                    })() : (
                      <TrainingSessionExerciseList
                        exercises={trainingExercises}
                        todayDateKey={todayStr}
                        completedSets={completedSets}
                        setInputs={setInputs}
                        trainingIsToday={trainingIsToday}
                        todaySessionDone={todaySessionDone}
                        workoutStarted={workoutStarted}
                        completedSetCount={trainingDoneSets}
                        restRunning={restRunning}
                        restingSet={restingSet}
                        restTimer={restTimer}
                        supabase={supabase}
                        userId={session?.user?.id}
                        labels={{ addExercise: t('session.addExercise'), discoverExercises: t('session.discoverExercises'), finishSession: t('session.finishSession') }}
                        onToggleSet={toggleSet}
                        onAddSet={addSet}
                        onUpdateInput={updateInput}
                        onExerciseInfo={handleExerciseInfo}
                        formatRest={fmtRest}
                        onCancelRest={cancelRest}
                        onVideoFeedback={setVideoExercise}
                        onTechniqueInfo={setTechniqueTooltip}
                        onAddExercise={() => { setShowAddExercise(true); setExerciseSearchQ('') }}
                        onBrowseExercises={() => setShowExDbModal(true)}
                        onStart={() => startProgramWorkout(trainingDayData, trainingExercises)}
                        onFinish={handleFinishWithCheck}
                      />
                    )}
                  </>
                )
              })()}
            </SessionDetailModal>
            )}
          </>
        )
      })()}

      {/* ═══ SECTION 4 — ACTIVE SESSION BAR ═══ */}
      <TrainingActiveBar
        workoutStarted={workoutStarted}
        elapsedSecs={elapsedSecs}
        trainingDoneSets={trainingDoneSets}
        trainingTotalSets={trainingTotalSets}
        onFinish={handleFinishWithCheck}
        fmtElapsed={fmtElapsed}
      />

      {/* ═══ SECTION 5 — DERNIÈRES SÉANCES ═══ */}
      <RecentSessionsList workoutHistory={workoutHistory} onOpenDetail={openWorkoutDetail} />
      {/* ═══ SECTION — BIBLIOTHÈQUE + ALTERNATIVES (extracted) ═══ */}
      <ExerciseLibrarySection exercisesCache={exercisesCache} activeCustomProgram={activeCustomProgram} supabase={supabase} onProgramUpdate={(updated: LegacyTrainingProgram) => { setActiveCustomProgram(updated) }} onStartWorkout={startProgramWorkout} />

      {/* ═══ SECTION 6 — CARDIO ═══ */}
      <div style={{ padding: '0 24px 16px' }}>
        <CardioSection supabase={supabase} userId={session?.user?.id || ''} weight={profile?.current_weight || 75} weightIsReal={!!profile?.current_weight} setModal={setModal} />
      </div>

      <TrainingTabOverlays runtime={runtime} />

    </div>
  )
}
