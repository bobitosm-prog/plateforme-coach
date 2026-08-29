import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const recentSessions = read('app/components/training/RecentSessionsList.tsx')
const cardio = read('app/components/CardioSection.tsx')
const trainingTab = read('app/components/tabs/TrainingTab.tsx')
const noActiveSession = read('app/components/training-v2/NoActiveSession.tsx')

describe('Training V2 main-screen polish', () => {
  it('keeps three recent sessions without a competing global count', () => {
    expect(recentSessions).toContain('workoutHistory.slice(0, 3)')
    expect(recentSessions).toContain('data-training-section-card="recent-history"')
    expect(recentSessions).toContain("{t('lastSessions')}")
    expect(recentSessions).toContain('renderRows(recent, true)')
  })

  it('preserves the total count inside the secondary history view', () => {
    expect(recentSessions).toContain("description={t('historyTotal', { count: workoutHistory.length })}")
    expect(recentSessions).toContain('filtered.slice(0, 20)')
    expect(recentSessions).toContain("t('viewAll')")
  })

  it('keeps cardio compact and collapsed by default', () => {
    expect(cardio).toContain('const [expanded, setExpanded] = useState(false)')
    expect(cardio).toContain('data-training-section-card="cardio"')
    expect(cardio).toContain('aria-expanded={expanded}')
    expect(cardio).toContain('aria-controls={panelId}')
    expect(cardio).toContain('minHeight: 56')
    expect(cardio).toContain("t('ui.optionsCount', { count: allWorkouts.length })")
  })

  it('integrates both titles inside their section cards', () => {
    expect(recentSessions).toMatch(/data-training-section-card="recent-history"[\s\S]*<h2[\s\S]*\{t\('lastSessions'\)\}/)
    expect(cardio).toMatch(/data-training-section-card="cardio"[\s\S]*<h2[\s\S]*\{t\('ui\.title'\)\}/)
    expect(recentSessions).not.toContain('SectionTitle')
    expect(cardio).not.toContain('SectionTitle')
    expect(cardio).not.toContain('colors.goldRule')
  })

  it('reveals the existing HIIT and LISS functions only after expansion', () => {
    expect(cardio).toContain('{expanded && (')
    expect(cardio).toContain('<WorkoutCard workout={suggestedHiit}')
    expect(cardio).toContain('<WorkoutCard workout={suggestedLiss}')
    expect(cardio).toContain('<HiitTimer workout={activeWorkout}')
    expect(cardio).toContain('<LissTimer workout={activeWorkout}')
    expect(cardio.match(/from\('cardio_sessions'\)\.insert/g)).toHaveLength(2)
  })

  it('adds no read and keeps the Training entry points intact', () => {
    expect(cardio).not.toMatch(/\.select\(|\.rpc\(|fetch\(/)
    expect(trainingTab).toContain('<NoActiveSession')
    expect(trainingTab).toContain('<CardioSection')
    expect(trainingTab).toContain('startProgramWorkout')
    expect(noActiveSession).toContain('const hasPlannedSession = exerciseCount > 0')
  })

  it('provides the new semantics in French, English and German', () => {
    for (const locale of ['fr', 'en', 'de']) {
      const messages = JSON.parse(read(`messages/${locale}.json`))
      expect(messages.training_tab.recent.historyTotal).toBeTruthy()
      expect(messages.cardio.ui.optionsCount).toBeTruthy()
      expect(messages.cardio.ui.showOptions).toBeTruthy()
      expect(messages.cardio.ui.sessionsCount).toBeUndefined()
    }
  })
})
