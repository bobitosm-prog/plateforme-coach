import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const viewDirectory = resolve(root, 'app/components/training/workout-session')
const viewFiles = ['WorkoutActiveSessionViews.tsx', 'WorkoutCompletionView.tsx', 'WorkoutDraftResumeView.tsx', 'WorkoutFinalizationViews.tsx', 'WorkoutRestViews.tsx']
const forbidden = [/supabase/i, /localStorage/, /sessionStorage/, /useWorkoutRuntime/, /AudioContext/, /navigator\.(?:vibrate|wakeLock)/, /createBrowserClient/, /\.from\(/]

describe('WorkoutSession presentation boundary', () => {
  it.each(viewFiles)('%s stays presentation-only', file => {
    const source = readFileSync(resolve(viewDirectory, file), 'utf8')
    for (const pattern of forbidden) expect(source).not.toMatch(pattern)
    expect(source).not.toContain("from 'next/")
  })

  it('delegates every extracted phase from WorkoutSession with callbacks kept in the orchestrator', () => {
    const source = readFileSync(resolve(root, 'app/components/WorkoutSession.tsx'), 'utf8')
    for (const component of ['WorkoutActiveSessionHeaderView', 'WorkoutActiveSessionFinishView', 'WorkoutDraftResumeView', 'WorkoutActiveRestView', 'WorkoutRestCompleteView', 'WorkoutCompletionView', 'WorkoutEndConfirmationView', 'WorkoutAbandonConfirmationView', 'WorkoutRepetitionsWarningView', 'WorkoutTemplateSaveView']) {
      expect(source).toContain(`<${component}`)
    }
    expect(source).toContain('onConfirm={() => { setShowDeleteConfirm(false); setShowEndModal(false); runtime.stop(); cleanupDraft(); onClose() }}')
    expect(source).toContain('onConfirm={() => { doValidate(repsWarning.eid, repsWarning.sid); setRepsWarning(null) }}')
  })

  it('does not duplicate the extracted completion or rest presentation markup in WorkoutSession', () => {
    const source = readFileSync(resolve(root, 'app/components/WorkoutSession.tsx'), 'utf8')
    expect(source).not.toContain('Mini-graph dernières séances')
    expect(source).not.toContain('strokeDasharray={2 * Math.PI * 32}')
    expect(source).not.toContain('END SESSION MODAL — slide up sheet')
  })
})
