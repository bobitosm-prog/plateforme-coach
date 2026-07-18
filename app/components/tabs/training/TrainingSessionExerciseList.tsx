import { motion } from 'framer-motion'
import { Award, Search } from 'lucide-react'
import { colors, fonts, labelStyle } from '../../../../lib/design-tokens'
import TrainingExerciseCard from './TrainingExerciseCard'
import type { TrainingTabProps } from '../TrainingTabController'
import type { LegacyTrainingExercise } from './training-tab-types'

interface TrainingSessionExerciseListProps {
  exercises: LegacyTrainingExercise[]
  todayDateKey: string
  completedSets: Record<string, boolean[]>
  setInputs: Record<string, { kg: string; reps: string }[]>
  trainingIsToday: boolean
  todaySessionDone: boolean
  workoutStarted: number | null
  completedSetCount: number
  restRunning: boolean
  restingSet: { exName: string; setIdx: number } | null
  restTimer: number
  supabase: TrainingTabProps['supabase']
  userId?: string
  labels: { addExercise: string; discoverExercises: string; finishSession: string }
  onToggleSet: (exerciseName: string, setIndex: number, setCount: number, restSeconds: number) => void
  onAddSet: (exerciseName: string) => void
  onUpdateInput: (exerciseName: string, setIndex: number, field: 'kg' | 'reps', value: string) => void
  onExerciseInfo: (exercise: LegacyTrainingExercise) => void
  formatRest: (seconds: number) => string
  onCancelRest: () => void
  onVideoFeedback: (exerciseName: string) => void
  onTechniqueInfo: (technique: string) => void
  onAddExercise: () => void
  onBrowseExercises: () => void
  onStart: () => void
  onFinish: () => void
}

export default function TrainingSessionExerciseList(props: TrainingSessionExerciseListProps) {
  const {
    exercises, todayDateKey, completedSets, setInputs, trainingIsToday, todaySessionDone, workoutStarted,
    completedSetCount, restRunning, restingSet, restTimer, supabase, userId, labels, onToggleSet, onAddSet,
    onUpdateInput, onExerciseInfo, formatRest, onCancelRest, onVideoFeedback, onTechniqueInfo,
    onAddExercise, onBrowseExercises, onStart, onFinish,
  } = props

  return <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {exercises.map((exercise, exerciseIndex) => {
        const name = exercise.name || exercise.exercise_name || exercise.custom_name || ''
        const storageKey = `moovx-sets-${todayDateKey}-${name}`
        const setCount = Number(exercise.sets) || 3
        const stored = completedSets[storageKey]
        const sets = stored ? stored.slice(0, setCount).concat(Array.from({ length: Math.max(0, setCount - stored.length) }, () => false)) : Array.from({ length: setCount }, () => false)
        const inputs = setInputs[name] || Array.from({ length: setCount }, () => ({ kg: '', reps: String(exercise.reps || '') }))
        const nextExercise = exercises[exerciseIndex + 1]
        const previousExercise = exerciseIndex > 0 ? exercises[exerciseIndex - 1] : null
        const supersetStart = exercise.technique === 'superset' && exercise.technique_details && nextExercise
        const supersetEnd = previousExercise?.technique === 'superset' && previousExercise.technique_details?.toLowerCase() === name.toLowerCase()

        return <div key={`${name}-${exerciseIndex}`}>
          {supersetStart && <SupersetRule height={20} label />}
          <div style={supersetStart || supersetEnd ? { borderLeft: `3px solid ${colors.gold}`, paddingLeft: 8 } : {}}>
            <TrainingExerciseCard
              ex={exercise}
              exIdx={exerciseIndex}
              setsArr={sets}
              inputs={inputs}
              trainingIsToday={trainingIsToday}
              restRunning={restRunning}
              restingSet={restingSet}
              restTimer={restTimer}
              onToggleSet={onToggleSet}
              onAddSet={onAddSet}
              onUpdateInput={onUpdateInput}
              onExerciseInfo={onExerciseInfo}
              fmtRest={formatRest}
              onCancelRest={onCancelRest}
              onVideoFeedback={onVideoFeedback}
              onTechniqueInfo={onTechniqueInfo}
              supabase={supabase}
              userId={userId}
            />
          </div>
          {supersetEnd && <SupersetRule height={10} />}
        </div>
      })}
    </div>

    {trainingIsToday && (workoutStarted || completedSetCount > 0) && (
      <button onClick={onAddExercise} style={{ width: '100%', padding: 14, marginTop: 12, background: 'transparent', border: '1.5px dashed rgba(212,168,67,0.4)', borderRadius: 16, color: colors.gold, fontFamily: fonts.headline, fontSize: 16, letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {labels.addExercise}
      </button>
    )}

    <motion.button whileTap={{ scale: 0.97 }} onClick={onBrowseExercises} style={{ width: '100%', marginTop: 12, background: colors.surface2, border: `2px dashed ${colors.goldBorder}`, borderRadius: 16, padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
      <Search size={16} color={colors.gold} />
      <span style={{ ...labelStyle, fontSize: 13, fontWeight: 800, letterSpacing: 2 }}>{labels.discoverExercises}</span>
    </motion.button>

    {trainingIsToday && !todaySessionDone && !workoutStarted && (
      <motion.button whileTap={{ scale: 0.97 }} onClick={onStart} style={{ width: '100%', marginTop: 12, background: colors.gold, color: colors.onGold, fontWeight: 400, padding: 18, borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: fonts.headline, fontSize: 20, letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        DEMARRER LA SEANCE
      </motion.button>
    )}

    {trainingIsToday && !workoutStarted && completedSetCount > 0 && (
      <motion.button whileTap={{ scale: 0.97 }} onClick={onFinish} style={{ width: '100%', marginTop: 12, background: colors.success, color: colors.onGold, fontWeight: 700, padding: 16, borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: fonts.body, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Award size={18} color={colors.onGold} />{labels.finishSession}
      </motion.button>
    )}
  </>
}

function SupersetRule({ height, label = false }: { height: number; label?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
    <div style={{ width: 3, height, background: colors.gold, borderRadius: 2 }} />
    {label && <span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: colors.gold }}>SUPERSET</span>}
    <div style={{ flex: 1, height: 1, background: `${colors.gold}30` }} />
  </div>
}
