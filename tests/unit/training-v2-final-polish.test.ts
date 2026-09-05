import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const trainingTab = read('app/components/tabs/TrainingTab.tsx')
const workoutSession = read('app/components/WorkoutSession.tsx')
const recentSessions = read('app/components/training/RecentSessionsList.tsx')
const videoFeedback = read('app/components/VideoFeedbackHistory.tsx')
const styles = read('app/components/training-v2/TrainingV2.module.css')
const visualSources = [
  'NoActiveSession',
  'TrainingSessionHero',
  'SessionTimeline',
  'ActiveExerciseFocus',
  'CurrentSetEditor',
  'ExerciseTools',
  'RestTimerCompact',
  'SessionCompletion',
].map(name => read(`app/components/training-v2/${name}.tsx`)).join('\n')

describe('Training V2 final polish contracts', () => {
  it('has no legacy execution or completion path', () => {
    expect(`${trainingTab}\n${workoutSession}\n${styles}`).not.toMatch(/legacy(Logger|Hero|Header)Hidden/)
    expect(trainingTab).not.toContain('SessionDoneModal')
    expect(workoutSession.match(/<CurrentSetEditor/g)).toHaveLength(1)
    expect(workoutSession).toContain('<SessionCompletion')
  })

  it('keeps history bounded and avoids eager full exercise loading', () => {
    expect(recentSessions).toContain('workoutHistory.slice(0, 3)')
    expect(recentSessions).toContain('filtered.slice(0, 20)')
    expect(trainingTab).not.toContain("from('exercises_db')")
    expect(workoutSession).not.toMatch(/from\('exercises_db'\)[\s\S]{0,180}select\('\*'\)/)
    expect(videoFeedback).toContain('.limit(20)')
    expect(videoFeedback).toContain('aria-expanded={isExpanded}')
    expect(videoFeedback).toContain('preload="metadata"')
  })

  it('keeps visual components data-source free and edits session-only', () => {
    expect(visualSources).not.toMatch(/supabase|createBrowserClient|\.from\(|\.rpc\(|fetch\(/i)
    expect(workoutSession).toContain('selectSessionVariant')
    expect(workoutSession).toContain('replacementSessionOnly')
    expect(workoutSession).not.toMatch(/from\('custom_programs'\)[\s\S]{0,160}update\(/)
  })

  it('encodes mobile overflow, desktop timeline, focus and reduced-motion contracts', () => {
    expect(styles).toMatch(/\.sessionShell\s*\{[\s\S]*?overflow-x:\s*hidden/)
    expect(styles).toMatch(/\.timelineList\s*\{[\s\S]*?overflow-x:\s*auto/)
    expect(styles).toMatch(/@media \(min-width: 768px\)[\s\S]*?\.timelineList\s*\{[\s\S]*?flex-direction:\s*column/)
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('.sessionShell *::before')
    expect(styles).toMatch(/:focus-visible/)
    expect(styles).toMatch(/\.shell button\s*\{[\s\S]*?min-height:\s*44px/)
  })

  it('has translated program-source labels in all supported locales', () => {
    for (const locale of ['fr', 'en', 'de']) {
      const messages = JSON.parse(read(`messages/${locale}.json`))
      expect(messages.training_tab.v2.coachPlan).toBeTruthy()
      expect(messages.training_tab.v2.personalProgram).toBeTruthy()
    }
    expect(workoutSession).not.toMatch(/>Plan coach<|>Programme personnel</)
  })
})
