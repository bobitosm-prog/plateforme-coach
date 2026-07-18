import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('workout runtime boundaries', () => {
  it('keeps the pure controller independent from React, Next, Supabase and browser globals', () => {
    const source = read('lib/training/workout-runtime.ts')
    expect(source).not.toMatch(/from ['"](?:react|next|@supabase)/)
    expect(source).not.toMatch(/\b(?:window|document|navigator|localStorage)\b/)
  })

  it('keeps browser effects behind the typed adapter and a narrow React hook', () => {
    const adapter = read('lib/training/workout-runtime-browser.ts')
    const hook = read('app/hooks/useWorkoutRuntime.ts')
    const quickTimer = read('app/components/tabs/training/useTrainingWorkoutTimer.ts')
    const wakeHook = read('app/hooks/useWakeLock.ts')
    expect(adapter).toContain('createBrowserWakeLockPort')
    expect(adapter).toContain("document.addEventListener('visibilitychange'")
    expect(adapter).toContain("document.removeEventListener('visibilitychange'")
    expect(hook).toContain('new WorkoutRuntimeController')
    expect(hook).toContain('controller.unmount()')
    expect(quickTimer).toContain('browserAudioPort')
    expect(quickTimer).toContain('browserVibrationPort')
    expect(quickTimer).not.toMatch(/navigator\.vibrate|playWarningTick|playBeep/)
    expect(wakeHook).toContain('createBrowserWakeLockPort')
    expect(wakeHook).not.toMatch(/navigator\.wakeLock|document\.addEventListener/)
  })

  it('removes direct timer, wake lock and visibility orchestration from WorkoutSession', () => {
    const source = read('app/components/WorkoutSession.tsx')
    expect(source).toContain('useWorkoutRuntime(startedAt)')
    expect(source).not.toContain("navigator.wakeLock.request('screen')")
    expect(source).not.toContain("document.addEventListener('visibilitychange'")
    expect(source).not.toContain('scheduleRestPeriodSounds(')
    expect(source).not.toContain('createWorkoutRestPeriod(')
  })
})
