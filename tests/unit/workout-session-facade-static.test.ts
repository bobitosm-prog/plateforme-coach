import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const facadePath = 'app/components/WorkoutSession.tsx'
const extracted = [
  'app/components/training/workout-session/WorkoutCustomBuilder.tsx',
  'app/components/training/workout-session/WorkoutExerciseEditor.tsx',
  'app/components/training/workout-session/WorkoutSessionOverlays.tsx',
]

describe('WorkoutSession facade architecture', () => {
  it('keeps the public facade below 600 lines', () => {
    const lines = read(facadePath).split(/\r?\n/).length
    expect(lines).toBeLessThan(600)
  })

  it('delegates the remaining builder, exercise editor and overlays', () => {
    const source = read(facadePath)
    expect(source).toContain('<WorkoutCustomBuilder')
    expect(source).toContain('<WorkoutExerciseEditor')
    expect(source).toContain('<WorkoutSessionOverlays')
    expect(source).not.toContain('Exercise Hero Banner')
    expect(source).not.toContain('Exercise info popup')
    expect(source).not.toContain('Save changes popup')
  })

  it('keeps each extracted responsibility reasonably bounded', () => {
    const limits = new Map([
      ['WorkoutCustomBuilder.tsx', 250],
      ['WorkoutExerciseEditor.tsx', 400],
      ['WorkoutSessionOverlays.tsx', 200],
    ])
    for (const file of extracted) {
      const maximum = limits.get(file.split('/').at(-1)!)!
      expect(read(file).split(/\r?\n/).length, file).toBeLessThan(maximum)
    }
  })

  it('introduces no any, wildcard projection or forbidden runtime dependency in extracted boundaries', () => {
    for (const file of extracted) {
      const source = read(file)
      expect(source, file).not.toMatch(/\bany\b/)
      expect(source, file).not.toMatch(/select\(['"]\*['"]\)/)
    }
    for (const file of extracted.slice(1)) {
      const source = read(file)
      expect(source, file).not.toMatch(/supabase|localStorage|sessionStorage|useWorkoutRuntime|AudioContext|wakeLock|navigator\.vibrate/i)
    }
  })

  it('keeps save, finalization, rest and tempo effects wired in the orchestrator', () => {
    const source = read(facadePath)
    expect(source).toContain('onSaveChanges={() => { setShowSavePopup(false); finish() }}')
    expect(source).toContain('onUseOnce={() => { setSessionModified(false); setShowSavePopup(false); finish() }}')
    expect(source).toContain('onStartTempo={(exercise, setIndex) => { initAudio(); setTempoExecutor(')
    expect(source).toContain('onConfirm={() => { setShowDeleteConfirm(false); setShowEndModal(false); runtime.stop(); cleanupDraft(); onClose() }}')
  })
})
