'use client'

import { useEffect, useRef, useState } from 'react'
import { getRandomMessage } from '../../lib/timer-audio'
import { WorkoutRuntimeController } from '../../lib/training/workout-runtime'
import {
  browserAudioPort, browserClock, browserScheduler, browserVibrationPort,
  browserVisibilityPort, createBrowserWakeLockPort,
} from '../../lib/training/workout-runtime-browser'

export function useWorkoutRuntime(startedAt?: string) {
  const [elapsed, setElapsed] = useState(() => startedAt ? Date.now() - new Date(startedAt).getTime() : 0)
  const [restOn, setRestOn] = useState(false)
  const [restSecs, setRestSecs] = useState(0)
  const [restMax, setRestMax] = useState(90)
  const [restDone, setRestDone] = useState(false)
  const [motivationalMsg, setMotivationalMsg] = useState('')
  const controllerRef = useRef<WorkoutRuntimeController | null>(null)
  if (controllerRef.current == null) {
    controllerRef.current = new WorkoutRuntimeController({
      clock: browserClock, scheduler: browserScheduler,
      audio: browserAudioPort, vibration: browserVibrationPort,
      wakeLock: createBrowserWakeLockPort(), visibility: browserVisibilityPort,
    }, {
      onElapsed: setElapsed,
      onRestTick: (remaining, duration) => { setRestSecs(remaining); setRestMax(duration) },
      onRestComplete: () => {
        setRestOn(false); setRestDone(true); setMotivationalMsg(getRandomMessage())
      },
    })
  }

  useEffect(() => {
    const controller = controllerRef.current!
    controller.mount(startedAt ? new Date(startedAt).getTime() : Date.now())
    return () => controller.unmount()
  }, [startedAt])

  return {
    elapsed, restOn, restSecs, restMax, restDone, motivationalMsg,
    startRest(seconds: number) {
      if (controllerRef.current!.startRest(seconds)) { setRestOn(true); setRestDone(false) }
    },
    cancelRest() { controllerRef.current!.cancelRest(); setRestOn(false); setRestSecs(0) },
    addRestTime(seconds = 30) { controllerRef.current!.extendRest(seconds) },
    dismissRestDone() { setRestDone(false) },
    stop() { controllerRef.current!.stop() },
  }
}
