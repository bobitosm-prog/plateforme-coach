'use client'

import { useEffect, useRef, useState } from 'react'
import { useBeforeUnload } from '../../../hooks/useBeforeUnload'
import { useWakeLock } from '../../../hooks/useWakeLock'
import { getRandomMessage, initAudio, playBeep, playWarningTick, vibrateDevice } from '../../../../lib/timer-audio'
import type { LegacyTrainingDay } from './training-tab-types'

const currentTimestamp = () => Date.now()

interface UseTrainingWorkoutTimerOptions {
  coachProgram: Record<string, LegacyTrainingDay> | null
  trainingDay: string
  todayDateKey: string
}

export function useTrainingWorkoutTimer({ coachProgram, trainingDay, todayDateKey }: UseTrainingWorkoutTimerOptions) {
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [setInputs, setSetInputs] = useState<Record<string, { kg: string; reps: string }[]>>({})
  const [workoutFinished, setWorkoutFinished] = useState(false)
  const [workoutStarted, setWorkoutStarted] = useState<number | null>(null)
  const [activeRestExName, setActiveRestExName] = useState<string | null>(null)
  const [restingSet, setRestingSet] = useState<{ exName: string; setIdx: number } | null>(null)
  const [restTimer, setRestTimer] = useState(0)
  const [, setRestMax] = useState(90)
  const [restRunning, setRestRunning] = useState(false)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [showTimerAlert, setShowTimerAlert] = useState(false)
  const [motivationalMsg, setMotivationalMsg] = useState('')
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useBeforeUnload(workoutStarted !== null)
  useWakeLock(Boolean(workoutStarted) || restRunning)

  useEffect(() => {
    if (!restRunning || restTimer <= 0) return
    restIntervalRef.current = setInterval(() => setRestTimer(previous => Math.max(0, previous - 1)), 1000)
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    }
  }, [restRunning, restTimer])

  useEffect(() => {
    if (restRunning && restTimer === 5) playWarningTick()
    if (!restRunning || restTimer !== 0) return
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    const completion = setTimeout(() => {
      setRestRunning(false)
      setRestingSet(null)
      setActiveRestExName(null)
      playBeep()
      vibrateDevice()
      setMotivationalMsg(getRandomMessage())
      setShowTimerAlert(true)
      setTimeout(() => setShowTimerAlert(false), 3000)
    }, 0)
    return () => clearTimeout(completion)
  }, [restTimer, restRunning])

  useEffect(() => {
    if (workoutStarted) {
      elapsedIntervalRef.current = setInterval(() => setElapsedSecs(Math.round((Date.now() - workoutStarted) / 1000)), 1000)
    } else {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current)
      const reset = setTimeout(() => setElapsedSecs(0), 0)
      return () => clearTimeout(reset)
    }
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current)
    }
  }, [workoutStarted])

  useEffect(() => {
    if (!coachProgram || !trainingDay) return
    const exercises = coachProgram[trainingDay]?.exercises
    if (!exercises) {
      const reset = setTimeout(() => { setCompletedSets({}); setSetInputs({}) }, 0)
      return () => clearTimeout(reset)
    }
    const loadedSets: Record<string, boolean[]> = {}
    const loadedInputs: Record<string, { kg: string; reps: string }[]> = {}
    exercises.forEach(exercise => {
      const name = exercise.name || exercise.exercise_name || exercise.custom_name || ''
      const storageKey = `moovx-sets-${todayDateKey}-${name}`
      const inputKey = `moovx-inputs-${todayDateKey}-${name}`
      const stored = typeof window === 'undefined' ? null : localStorage.getItem(storageKey)
      const storedInputs = typeof window === 'undefined' ? null : localStorage.getItem(inputKey)
      const setCount = Number(exercise.sets) || 3
      loadedSets[storageKey] = stored ? JSON.parse(stored) : Array.from({ length: setCount }, () => false)
      loadedInputs[name] = storedInputs ? JSON.parse(storedInputs) : Array.from({ length: setCount }, () => ({ kg: exercise.weight ? String(exercise.weight) : '', reps: String(exercise.reps || '') }))
    })
    const hydrate = setTimeout(() => { setCompletedSets(loadedSets); setSetInputs(loadedInputs) }, 0)
    return () => clearTimeout(hydrate)
  }, [coachProgram, todayDateKey, trainingDay])

  function updateInput(exerciseName: string, setIndex: number, field: 'kg' | 'reps', value: string) {
    const inputKey = `moovx-inputs-${todayDateKey}-${exerciseName}`
    setSetInputs(previous => {
      const inputs = previous[exerciseName] ? [...previous[exerciseName]] : []
      inputs[setIndex] = { ...(inputs[setIndex] || { kg: '', reps: '' }), [field]: value }
      if (typeof window !== 'undefined') localStorage.setItem(inputKey, JSON.stringify(inputs))
      return { ...previous, [exerciseName]: inputs }
    })
  }

  function addSet(exerciseName: string) {
    const storageKey = `moovx-sets-${todayDateKey}-${exerciseName}`
    const inputKey = `moovx-inputs-${todayDateKey}-${exerciseName}`
    setCompletedSets(previous => {
      const next = [...(previous[storageKey] || []), false]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return { ...previous, [storageKey]: next }
    })
    setSetInputs(previous => {
      const inputs = previous[exerciseName] ? [...previous[exerciseName]] : []
      const last = inputs.length > 0 ? { ...inputs[inputs.length - 1] } : { kg: '', reps: '' }
      const next = [...inputs, last]
      localStorage.setItem(inputKey, JSON.stringify(next))
      return { ...previous, [exerciseName]: next }
    })
  }

  function toggleSet(exerciseName: string, setIndex: number, totalSets: number, restSeconds: number) {
    initAudio()
    const storageKey = `moovx-sets-${todayDateKey}-${exerciseName}`
    const next = [...(completedSets[storageKey] || Array.from({ length: totalSets }, () => false))]
    next[setIndex] = !next[setIndex]
    localStorage.setItem(storageKey, JSON.stringify(next))
    setCompletedSets(previous => ({ ...previous, [storageKey]: next }))
    if (!workoutStarted && next[setIndex]) setWorkoutStarted(currentTimestamp())
    if (next[setIndex] && !next.every(Boolean) && restSeconds > 0) {
      setRestingSet({ exName: exerciseName, setIdx: setIndex })
      setActiveRestExName(exerciseName)
      setRestMax(restSeconds)
      setRestTimer(restSeconds)
      setRestRunning(true)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
    } else if (!next[setIndex] && activeRestExName === exerciseName) {
      cancelRest()
    }
  }

  function cancelRest() {
    setRestRunning(false)
    setRestTimer(0)
    setRestingSet(null)
    setActiveRestExName(null)
  }

  return {
    completedSets, setCompletedSets, setInputs, setSetInputs, workoutFinished, setWorkoutFinished,
    workoutStarted, setWorkoutStarted, activeRestExName, setActiveRestExName, restingSet, setRestingSet,
    restTimer, setRestTimer, restRunning, setRestRunning, elapsedSecs, setElapsedSecs,
    showTimerAlert, setShowTimerAlert, motivationalMsg, updateInput, addSet, toggleSet, cancelRest,
  }
}
