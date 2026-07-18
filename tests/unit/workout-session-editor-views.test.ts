import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WorkoutExerciseEditor, type WorkoutExerciseEditorProps } from '../../app/components/training/workout-session/WorkoutExerciseEditor'
import { WorkoutSessionOverlays } from '../../app/components/training/workout-session/WorkoutSessionOverlays'
import type { WorkoutSessionExercise } from '../../app/components/training/workout-session/types'

const t = (key: string, values?: Record<string, string | number>) => values ? `${key}:${JSON.stringify(values)}` : key
const callback = vi.fn()

const exercise: WorkoutSessionExercise = {
  id: 'squat', name: 'Squat', muscle: 'Quadriceps', targetSets: 1, targetReps: '8-10', rest: 90,
  tempo: '3-1-1-0', rir: 2, notes: '', exerciseId: 'catalog-squat', open: true,
  sets: [{ id: 'set-1', num: 1, weight: 80, weightRaw: '80', reps: 8, done: false, rir: 2 }],
}

function editorProps(exos: WorkoutSessionExercise[]): WorkoutExerciseEditorProps {
  return {
    exos, setExos: callback, reorderMode: false, setReorderMode: callback,
    locale: 'fr', t, tMuscle: t, previousData: {}, progressionByExo: {}, exerciseMenu: null,
    setExerciseMenu: callback, restOn: false, restExoId: null, restSetId: null, restSecs: 0,
    restMax: 90, rirTrackingEnabled: true, rirScaleAdvanced: true,
    onMoveExercise: callback, onRemoveExercise: callback, onLoadVariants: callback,
    onOpenExerciseInfo: callback, onOpenTempo: callback, onStartTempo: callback,
    onSetField: callback, onCommitWeight: callback, onValidate: callback, onUnvalidate: callback,
    onSetRir: callback, onAddRestTime: callback, onSkipRest: callback, onAddSet: callback,
    onAddExercise: callback,
  }
}

describe('WorkoutSession extracted editor views', () => {
  it('renders the empty exercise editor without changing its actions', () => {
    const html = renderToStaticMarkup(h(WorkoutExerciseEditor, editorProps([])))
    expect(html).toContain('emptyTitle')
    expect(html).toContain('addExercise')
  })

  it('renders exercise, set, load, repetitions, RIR and tempo data', () => {
    const html = renderToStaticMarkup(h(WorkoutExerciseEditor, {
      ...editorProps([exercise]),
      previousData: { Squat: [{ weight: 77.5, reps: 8 }] },
      progressionByExo: { Squat: { weight: 82.5, status: 'progress', step: 2.5 } },
    }))
    expect(html).toContain('Squat')
    expect(html).toContain('77.5 × 8')
    expect(html).toContain('value="80"')
    expect(html).toContain('value="8"')
    expect(html).toContain('3-1-1-0')
    expect(html).toContain('R2')
  })

  it('renders active rest under the matching set only', () => {
    const html = renderToStaticMarkup(h(WorkoutExerciseEditor, {
      ...editorProps([exercise]), restOn: true, restExoId: 'squat', restSetId: 'set-1', restSecs: 42,
    }))
    expect(html).toContain('data-workout-phase="resting"')
    expect(html).toContain('42s')
  })

  it('renders exercise information, variants and save popup from optional legacy fields', () => {
    const html = renderToStaticMarkup(h(WorkoutSessionOverlays, {
      exerciseInfo: { name: 'Squat', muscle_group: 'Quadriceps', equipment: 'Barre', description: 'Description', tips: 'Conseil' },
      variantPopup: { exIdx: 0, originalName: 'Squat', variants: [{ name: 'Front squat', equipment: 'Barre', muscle_group: 'Quadriceps' }] },
      showSavePopup: true, tempoModal: null, tempoExecutor: null, locale: 'fr', t, tMuscle: t,
      onCloseExerciseInfo: callback, onCloseVariants: callback, onSelectVariant: callback,
      onSaveChanges: callback, onUseOnce: callback, onCancelSave: callback,
      onCloseTempo: callback, onCloseTempoExecutor: callback,
    }))
    expect(html).toContain('Squat')
    expect(html).toContain('Front squat')
    expect(html).toContain('Description')
    expect(html).toContain('Conseil')
    expect(html).toContain('savePopup.title')
  })
})
