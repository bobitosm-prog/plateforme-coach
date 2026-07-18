import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = React.createElement
const captures = vi.hoisted(() => ({
  heroes: [] as Array<Record<string, unknown>>,
  exercises: [] as Array<Record<string, unknown>>,
  progress: [] as Array<Record<string, unknown>>,
}))

vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}))
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
      h(tag, props, children),
  }),
}))
vi.mock('../../app/hooks/useWakeLock', () => ({ useWakeLock: vi.fn() }))
vi.mock('../../app/hooks/useBeforeUnload', () => ({ useBeforeUnload: vi.fn() }))
vi.mock('../../app/hooks/useExerciseInfo', () => ({
  useExerciseInfo: () => ({ exerciseInfo: null, setExerciseInfo: vi.fn(), loadExerciseInfo: vi.fn() }),
}))
vi.mock('../../lib/gamification', () => ({ addXP: vi.fn(), updateStreak: vi.fn() }))
vi.mock('../../lib/timer-audio', () => ({
  initAudio: vi.fn(), playBeep: vi.fn(), playWarningTick: vi.fn(), vibrateDevice: vi.fn(),
  getRandomMessage: () => 'continue',
}))
vi.mock('../../lib/program-excel', () => ({
  exportProgramToXlsx: vi.fn(), parseProgramFromXlsx: vi.fn(), downloadBlankTemplate: vi.fn(),
}))
vi.mock('../../app/components/ui/RailOverlay', () => ({ RailOverlay: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../../app/components/ui/SectionTitle', () => ({ default: ({ title }: { title: string }) => h('div', null, title) }))
vi.mock('../../app/components/home/HeroSessionCard', () => ({
  default: (props: Record<string, unknown>) => {
    captures.heroes.push(props)
    return h('section', { 'data-state': String(props.state) }, String(props.sessionTitle))
  },
}))
vi.mock('../../app/components/training/SessionDetailModal', () => ({
  default: ({ children }: { children: React.ReactNode }) => h('div', null, children),
}))
vi.mock('../../app/components/training/SessionDoneModal', () => ({ default: () => h('div', null, 'done-detail') }))
vi.mock('../../app/components/tabs/training/TrainingExerciseCard', () => ({
  default: (props: Record<string, unknown>) => {
    captures.exercises.push(props)
    const ex = props.ex as Record<string, unknown>
    return h('article', null, String(ex.name))
  },
}))
vi.mock('../../app/components/training/PhaseProgressBanner', () => ({
  default: ({ program }: { program: Record<string, unknown> }) => {
    captures.progress.push(program)
    return h('div', null, 'phase-progress')
  },
}))
vi.mock('../../app/components/training/RecentSessionsList', () => ({ default: () => h('div', null, 'recent-sessions') }))
vi.mock('../../app/components/training/ExerciseLibrarySection', () => ({ default: () => h('div', null, 'exercise-library') }))
vi.mock('../../app/components/tabs/training/TrainingActiveBar', () => ({ default: () => null }))
vi.mock('../../app/components/tabs/training/TrainingRestDay', () => ({ default: () => h('div', null, 'rest-day') }))
vi.mock('../../app/components/tabs/training/WorkoutCelebration', () => ({ default: () => null }))
vi.mock('../../app/components/modals/ExerciseSearchModal', () => ({ default: () => null }))
vi.mock('../../app/components/modals/ExerciseDetailModal', () => ({ default: () => null }))
vi.mock('../../app/components/VideoFeedbackModal', () => ({ default: () => null }))
vi.mock('../../app/components/VideoFeedbackHistory', () => ({ default: () => null }))
vi.mock('../../app/components/training/ProgramBuilder', () => ({
  default: () => null,
  padTo7Days: (days: unknown[]) => [...days, ...Array.from({ length: Math.max(0, 7 - days.length) }, () => ({ is_rest: true }))].slice(0, 7),
}))
vi.mock('../../app/components/tabs/training/AddExercisePopup', () => ({ default: () => null }))
vi.mock('../../app/components/tabs/training/SaveChoicePopup', () => ({ default: () => null }))
vi.mock('../../app/components/tabs/training/TechniquePopup', () => ({ TechniqueTooltip: () => null }))
vi.mock('../../app/components/tabs/training/StartProgramModal', () => ({ default: () => null }))
vi.mock('../../app/components/ExerciseInfoPopup', () => ({ default: () => null }))
vi.mock('../../app/components/training/WorkoutDetailList', () => ({ default: () => null }))
vi.mock('../../app/components/CardioSection', () => ({ default: () => null }))
vi.mock('../../app/components/ui/AiQuotaBadge', () => ({ default: () => null }))

import TrainingTab from '../../app/components/tabs/TrainingTab'

function query() {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'neq', 'gte', 'lte', 'in', 'order', 'limit', 'update', 'insert', 'delete', 'single']) {
    builder[method] = () => builder
  }
  builder.then = (resolve: (value: { data: unknown[]; error: null }) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve, reject)
  return builder
}

function currentFrenchDay(): string {
  return ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][new Date().getDay()]
}

function renderTab(options: {
  profile?: Record<string, unknown>
  coachProgram?: Record<string, unknown> | null
  todaySessionDone?: boolean
} = {}) {
  const startProgramWorkout = vi.fn()
  const todayKey = currentFrenchDay()
  const props = {
    supabase: { from: vi.fn(() => query()) },
    session: { user: { id: '00000000-0000-4000-8000-000000000101' } },
    profile: options.profile ?? { subscription_type: 'active', current_weight: 75 },
    coachProgram: options.coachProgram ?? null,
    todayKey,
    todaySessionDone: options.todaySessionDone ?? false,
    startProgramWorkout,
    fetchAll: vi.fn(async () => undefined), scheduledSessions: [], calendarSelectedDate: new Date(),
    setCalendarSelectedDate: vi.fn(), markSessionCompleted: vi.fn(async () => undefined),
    checkForPR: vi.fn(async () => ({ newPR: false })), lastCompletedByIndex: new Map<number, string>(),
    setModal: vi.fn(),
  }
  const html = renderToStaticMarkup(h(TrainingTab, props))
  return { html, props, startProgramWorkout }
}

beforeEach(() => {
  captures.heroes.length = 0
  captures.exercises.length = 0
  captures.progress.length = 0
})

describe('TrainingTab characterization', () => {
  it('keeps the empty-program state and free training action visible', () => {
    const { html } = renderTab()

    expect(captures.heroes.at(-1)?.state).toBe('no-program')
    expect(html).toContain('session.freeSession')
    expect(html).toContain('programs.createProgram')
    expect(html).toContain('exercise-library')
  })

  it('renders an assigned coach program with exercise prescriptions and starts server-provided data', () => {
    const todayKey = currentFrenchDay()
    const exercise = { name: 'Développé couché', sets: 4, reps: '8-10', rest_seconds: 90 }
    const day = { name: 'Force haut du corps', repos: false, exercises: [exercise] }
    const { html, startProgramWorkout } = renderTab({
      profile: { subscription_type: 'invited' }, coachProgram: { [todayKey]: day },
    })

    expect(html).toContain('programs.coachProgram')
    expect(html).toContain('Développé couché')
    expect(captures.heroes.at(-1)?.state).toBe('active')
    expect(captures.heroes.at(-1)?.todayExercises).toEqual([exercise])
    const card = captures.exercises.at(-1)
    expect(card?.setsArr).toEqual([false, false, false, false])
    expect(card?.ex).toMatchObject({ name: 'Développé couché', reps: '8-10', rest_seconds: 90 })

    ;(captures.heroes.at(-1)?.onStart as () => void)()
    expect(startProgramWorkout).toHaveBeenCalledWith(day, [exercise])
  })

  it('marks today as completed without removing the assigned exercise detail', () => {
    const todayKey = currentFrenchDay()
    const exercise = { name: 'Row', sets: 3, reps: 12 }
    renderTab({
      coachProgram: { [todayKey]: { name: 'Séance terminée', exercises: [exercise] } },
      todaySessionDone: true,
    })

    expect(captures.heroes.at(-1)?.state).toBe('done')
    expect(captures.heroes.at(-1)?.todaySession).toMatchObject({ id: 'today' })
    expect(captures.heroes.at(-1)?.hideStartButton).toBe(true)
  })

  it('characterizes rest days and incomplete legacy exercise defaults without crashing', () => {
    const todayKey = currentFrenchDay()
    const rest = renderTab({ coachProgram: { [todayKey]: { repos: true, exercises: [] } } })
    expect(captures.heroes.at(-1)?.state).toBe('rest')
    expect(rest.html).toContain('rest-day')

    captures.heroes.length = 0
    captures.exercises.length = 0
    renderTab({ coachProgram: { [todayKey]: { exercises: [{ name: 'Mobilité' }] } } })
    expect(captures.heroes.at(-1)?.state).toBe('active')
    expect(captures.exercises.at(-1)?.setsArr).toEqual([false, false, false])
    expect(captures.exercises.at(-1)?.ex).toMatchObject({ name: 'Mobilité' })
  })

  it('locks the personal-program priority, progression and direct-start contracts statically', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'app/components/tabs/TrainingTab.tsx'), 'utf8')

    expect(source).toContain('resolveActiveProgramDay({')
    expect(source).toContain('selectActivePersonalProgram(programs)')
    expect(source).toContain('<PhaseProgressBanner program={activeCustomProgram} />')
    expect(source).toContain('startProgramWorkout(trainingDayData, trainingExercises)')
    expect(source).toContain("profile?.subscription_type !== 'invited'")
  })
})
