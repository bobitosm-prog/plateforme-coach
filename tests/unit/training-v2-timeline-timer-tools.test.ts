import { readFileSync } from 'node:fs'
import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { getTimelineExerciseState } from '@/app/components/training-v2/SessionTimeline'
import { extendRestTimerDeadline, resolveRestTimer } from '@/lib/training/rest-timer'

const workoutSession = readFileSync('app/components/WorkoutSession.tsx', 'utf8')
const timeline = readFileSync('app/components/training-v2/SessionTimeline.tsx', 'utf8')
const restTimer = readFileSync('app/components/training-v2/RestTimerCompact.tsx', 'utf8')
const exerciseTools = readFileSync('app/components/training-v2/ExerciseTools.tsx', 'utf8')
const trainingSheet = readFileSync('app/components/training-v2/TrainingSheet.tsx', 'utf8')
const wave4eComponents = [restTimer, exerciseTools, trainingSheet]
const messagesByLocale = Object.fromEntries(
  ['fr', 'en', 'de'].map(locale => [
    locale,
    JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as {
      training_tab: { v2: Record<string, string> }
    },
  ]),
)

describe('Training V2 timeline', () => {
  it('computes completion from relevant sets rather than the current index', () => {
    expect(getTimelineExerciseState({ completedSets: 4, totalSets: 4 }, 0, 2)).toBe('done')
    expect(getTimelineExerciseState({ completedSets: 2, totalSets: 3 }, 1, 1)).toBe('active')
    expect(getTimelineExerciseState({ completedSets: 0, totalSets: 3 }, 2, 1)).toBe('upcoming')
  })

  it('exposes accessible navigation without unnecessary confirmation', () => {
    expect(timeline).toContain("aria-current={active ? 'step' : undefined}")
    expect(timeline).toContain('data-state={state}')
    expect(timeline).toContain('onClick={() => onSelect(index)}')
    const selectExercise = workoutSession.slice(workoutSession.indexOf('const selectExercise'), workoutSession.indexOf('const finish'))
    expect(selectExercise).not.toContain('confirm(')
    expect(selectExercise).toContain('persistDraft({ currentExerciseIndex: index, currentSetIndex })')
  })
})

describe('Training V2 rest timer', () => {
  it('resolves the rest skip label in every supported locale', () => {
    const translate = (locale: 'fr' | 'en' | 'de') => createTranslator({
      locale,
      messages: messagesByLocale[locale],
      namespace: 'training_tab.v2',
    })

    expect(translate('fr')('skipRest')).toBe('Passer')
    expect(translate('en')('skipRest')).toBe('Skip')
    expect(translate('de')('skipRest')).toBe('Überspringen')
    expect(restTimer).toContain("useTranslations('training_tab.v2')")
    expect(restTimer).toContain("t('skipRest')")
    expect(restTimer).not.toContain('training_tab.v2.skipRest')
  })

  it('resolves the session replacement label in every supported locale', () => {
    const translate = (locale: 'fr' | 'en' | 'de') => createTranslator({
      locale,
      messages: messagesByLocale[locale],
      namespace: 'training_tab.v2',
    })

    expect(translate('fr')('replaceForSession')).toBe('Remplacer pour cette séance')
    expect(translate('en')('replaceForSession')).toBe('Replace for this session')
    expect(translate('de')('replaceForSession')).toBe('Für diese Einheit ersetzen')
    expect(exerciseTools).toContain("t('replaceForSession')")
    expect(exerciseTools).not.toContain('training_tab.v2.replaceForSession')
  })

  it('keeps every Wave 4E component translation key inside the v2 message contract', () => {
    const translationKeys = wave4eComponents.flatMap(component =>
      [...component.matchAll(/\bt\('([^']+)'/g)].map(match => match[1]),
    )

    for (const locale of ['fr', 'en', 'de']) {
      const messages = messagesByLocale[locale].training_tab.v2
      expect(translationKeys.filter(key => !(key in messages))).toEqual([])

      const translate = createTranslator({
        locale,
        messages: messagesByLocale[locale],
        namespace: 'training_tab.v2',
      })
      expect(translationKeys.map(key => translate(key, { seconds: 16 })).filter(label => label.startsWith('training_tab.'))).toEqual([])
    }

    expect(wave4eComponents.some(component => component.includes('training_tab.v2.'))).toBe(false)
  })

  it('derives running and finished states from an absolute deadline', () => {
    const now = Date.parse('2026-08-29T12:00:00.000Z')
    expect(resolveRestTimer('2026-08-29T12:01:18.000Z', now)).toEqual({
      state: 'running',
      endAt: Date.parse('2026-08-29T12:01:18.000Z'),
      remainingSeconds: 78,
    })
    expect(resolveRestTimer('2026-08-29T11:59:59.000Z', now).state).toBe('finished')
    expect(resolveRestTimer(null, now).state).toBe('idle')
  })

  it('extends the deadline by thirty seconds without per-second persistence', () => {
    const now = Date.parse('2026-08-29T12:00:00.000Z')
    expect(extendRestTimerDeadline(now + 10_000, 30, now)).toBe(now + 40_000)
    expect(workoutSession).toContain('extendRestTimerDeadline(restEndsAtRef.current, 30)')
    expect(workoutSession).toContain('persistDraft({ restTimerEndAt: new Date(restEndsAtRef.current).toISOString() })')
    expect(workoutSession).toContain('persistDraft({ restTimerEndAt: null })')
    expect(workoutSession).not.toMatch(/setInterval\([\s\S]{0,500}persistDraft/)
  })

  it('restores after refresh and finishes without a blocking full-screen popup', () => {
    expect(workoutSession).toContain('resolveRestTimer(draft.restTimerEndAt)')
    expect(workoutSession).toContain("state={restDone ? 'finished' : 'running'}")
    expect(workoutSession).not.toContain('REST DONE POPUP')
    expect(restTimer).toContain('role="status" aria-live="assertive"')
    expect(restTimer).not.toMatch(/\bRIR\b/i)
  })
})

describe('Training V2 exercise tools', () => {
  it('keeps tools secondary and details collapsed by default', () => {
    expect(exerciseTools).toContain('const [open, setOpen] = useState(false)')
    expect(exerciseTools).toContain('aria-expanded={open}')
    expect(workoutSession.indexOf('<CurrentSetEditor')).toBeLessThan(workoutSession.indexOf('<ExerciseTools'))
    expect(exerciseTools).not.toContain('supabase')
  })

  it('loads video and technique only after a user opens a tool', () => {
    expect(workoutSession).toContain('onOpenVideo={() =>')
    expect(workoutSession).toContain('preload="metadata"')
    expect(workoutSession).not.toMatch(/<video[^>]+autoPlay/)
    expect(exerciseTools).toContain("panel === 'technique'")
    expect(exerciseTools).toContain("panel === 'notes'")
  })

  it('keeps replacement lazy, bounded and session-only', () => {
    expect(exerciseTools).toContain('onReplace')
    expect(workoutSession.match(/\.limit\(5\)/g)?.length).toBeGreaterThanOrEqual(2)
    const replacement = workoutSession.slice(workoutSession.indexOf('async function loadVariantsForSession'), workoutSession.indexOf("if (mode === 'custom')"))
    expect(replacement).not.toMatch(/\.update\(|\.insert\(|\.upsert\(/)
    expect(replacement).not.toContain('setSessionModified(true)')
    expect(replacement).toContain('sets.some(set => set.done)')
    expect(replacement).toContain('status: \'error\'')
  })

  it('provides keyboard-managed sheets and non-blocking secondary errors', () => {
    expect(trainingSheet).toContain("event.key === 'Escape'")
    expect(trainingSheet).toContain("event.key !== 'Tab'")
    expect(trainingSheet).toContain('role="dialog" aria-modal="true"')
    expect(trainingSheet).toContain('closeRef.current?.focus()')
    expect(workoutSession).toContain("variantPopup.status === 'error'")
    expect(workoutSession).toContain('exerciseInfoError')
  })
})
