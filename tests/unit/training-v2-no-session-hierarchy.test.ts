import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const trainingTab = readFileSync('app/components/tabs/TrainingTab.tsx', 'utf8')
const noActiveSession = readFileSync('app/components/training-v2/NoActiveSession.tsx', 'utf8')
const sessionHero = readFileSync('app/components/training-v2/TrainingSessionHero.tsx', 'utf8')
const trainingStyles = readFileSync('app/components/training-v2/TrainingV2.module.css', 'utf8')
const recentSessions = readFileSync('app/components/training/RecentSessionsList.tsx', 'utf8')
const workoutSession = readFileSync('app/components/WorkoutSession.tsx', 'utf8')
const frenchMessages = JSON.parse(readFileSync('messages/fr.json', 'utf8'))

describe('Training V2 no-session hierarchy', () => {
  it('does not treat a zero-exercise day as a valid planned workout', () => {
    expect(noActiveSession).toContain('const hasPlannedSession = exerciseCount > 0')
    expect(noActiveSession).toContain("t('noSessionToday')")
    expect(sessionHero).toContain("const hasPlannedExercises = mode === 'active' || exerciseCount > 0")
    expect(sessionHero).toContain('{hasPlannedExercises && <div className={styles.heroMeta}')
  })

  it('renders a calm compact hero only for the empty-day branch', () => {
    expect(noActiveSession).toContain('{hasPlannedSession ? <TrainingSessionHero')
    expect(noActiveSession).toContain('styles.emptyHero')
    expect(noActiveSession).toContain('styles.emptyTitle')
    expect(frenchMessages.training_tab.v2.noSessionToday).toBe('Pas de séance aujourd’hui')
    expect(frenchMessages.training_tab.v2.noSessionDescription).toBe('Journée de repos ou aucune séance planifiée.')
    expect(trainingStyles).toContain('font-size: clamp(32px, 8.5vw, 40px)')
  })

  it('never fabricates a duration for a zero-exercise day', () => {
    expect(trainingTab).toContain('const v2EstimatedMinutes = trainingExercises.length > 0')
    expect(trainingTab).toContain(': 0')
    expect(trainingTab).not.toContain('Math.max(25')
    expect(noActiveSession).toContain('estimatedMinutes={hasPlannedSession ? estimatedMinutes : undefined}')
  })

  it('keeps starting a real workout as the dominant action', () => {
    expect(frenchMessages.training_tab.v2.start).toBe('Commencer la séance')
    expect(sessionHero).toContain('className={styles.primaryAction}')
    expect(noActiveSession).toContain('className={styles.tertiaryAction}')
    expect(frenchMessages.training_tab.v2.manageInAccount).toBe('Gérer dans Compte')
  })

  it('routes the neutral next-session action to the next non-empty program day', () => {
    expect(trainingTab).toContain('const v2NextSession = (() => {')
    expect(trainingTab).toContain('if (exercises.length > 0)')
    expect(trainingTab).toContain('onViewNext={showNextPlannedSession}')
    expect(noActiveSession).toContain('onClick={onViewNext}')
  })

  it('keeps the week calendar structurally compact and accessible', () => {
    expect(trainingTab).toContain('data-training-calendar="compact"')
    expect(trainingTab).toContain("padding: '7px 2px'")
    expect(trainingTab).toContain('aria-label={`${dayName} ${dayNum} · ${statusLabel}`}')
    expect(trainingTab).toContain('aria-hidden="true"')
  })

  it('limits the primary history to three sessions and hides advanced filters until expanded', () => {
    expect(recentSessions).toContain('workoutHistory.slice(0, 3)')
    expect(recentSessions).toContain('filtered.slice(0, 20)')
    expect(recentSessions).toContain('{showFullHistory && (')
    expect(recentSessions).toContain('data-training-history-filters="advanced"')
    expect(recentSessions).toContain('<TrainingSheet')
    expect(frenchMessages.training_tab.recent.viewAll).toBe('Voir l’historique ›')
  })

  it('leaves active-session Focus Mode on the single selected logger', () => {
    expect(workoutSession).toContain('if (idx !== activeExerciseIndex) return null')
    expect(workoutSession).toContain('<ActiveExerciseFocus')
  })
})
