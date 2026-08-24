import type { UserCapabilities } from '../entitlements/capabilities'
import { isInHomeDay, type HomeDayWindow } from './home-date'

export type HomeDomainState = 'loading' | 'ready' | 'empty' | 'error'
export type HomeCoachRelationStatus =
  | 'active'
  | 'ended'
  | 'not_found'
  | 'multiple_active'
  | 'error'

export interface HomeDomainError {
  domain: HomeDomain
  code: string
}

export type HomeDomain =
  | 'identity'
  | 'training'
  | 'nutrition'
  | 'recovery'
  | 'checkIn'
  | 'progression'
  | 'diagnostic'
  | 'coach'
  | 'hydration'

export interface HomeTrainingSession {
  id: string | null
  title: string
  exercises: readonly unknown[]
  scheduledAt: string | null
  isRest: boolean
}

export interface HomeTrainingWeeklySummary {
  planned: number
  completed: number
  adherence: number | null
}

export interface HomeMacros {
  protein: number | null
  carbs: number | null
  fat: number | null
}

export interface HomeViewModel {
  identity: {
    state: HomeDomainState
    firstName: string
    avatar: string | null
    xp: number | null
    streak: number
  }
  today: HomeDayWindow
  training: {
    state: HomeDomainState
    dayStatus: 'scheduled' | 'completed' | 'rest' | 'no_session'
    session: HomeTrainingSession | null
    source: 'scheduled' | 'custom_program' | 'coach_program' | 'none'
    hasProgram: boolean
    isCompleted: boolean
    nextSession: unknown | null
    weeklySummary: HomeTrainingWeeklySummary
  }
  nutrition: {
    state: HomeDomainState
    caloriesConsumed: number | null
    caloriesTarget: number | null
    macrosConsumed: HomeMacros
    macrosTarget: HomeMacros
    hasPlan: boolean
  }
  recovery: {
    state: HomeDomainState
    status: 'ready' | 'watch' | 'recover' | null
    score: number | null
    sourceDataAvailable: boolean
  }
  checkIn: {
    state: HomeDomainState
    completedToday: boolean
    mood: string | null
    sleep: number | null
    note: string | null
  }
  hydration: {
    state: HomeDomainState
    consumedMl: number | null
    targetMl: number | null
  }
  progression: {
    state: HomeDomainState
    currentWeight: number | null
    weightTrend: number | null
    sessionsThisWeek: number | null
    adherence: number | null
    latestPR: unknown | null
  }
  diagnostic: {
    state: HomeDomainState
    latest: unknown | null
    canGenerate: boolean
  }
  coach: {
    state: HomeDomainState
    relationStatus: HomeCoachRelationStatus
    coachId: string | null
    coachDisplayName: string | null
    nextAppointment: unknown | null
    lastMessage: unknown | 'unavailable' | null
  }
  capabilities: UserCapabilities
  loading: {
    global: boolean
    domains: Record<HomeDomain, boolean>
  }
  errors: Partial<Record<HomeDomain, HomeDomainError>>
  freshness: {
    generatedAt: string
    source: 'dashboard-cache' | 'network' | 'mixed'
  }
}

export interface HomeViewModelInput {
  today: HomeDayWindow
  identity: {
    firstName: string
    avatar?: string | null
    xp?: number | null
    streak?: number
    state?: HomeDomainState
  }
  training: {
    state?: HomeDomainState
    session?: HomeTrainingSession | null
    source?: HomeViewModel['training']['source']
    isCompleted?: boolean
    nextSession?: unknown | null
    weeklyPlanned?: number
    weeklyCompleted?: number
    hasProgram?: boolean
  }
  nutrition: {
    state?: HomeDomainState
    caloriesConsumed?: number | null
    caloriesTarget?: number | null
    macrosConsumed?: Partial<HomeMacros>
    macrosTarget?: Partial<HomeMacros>
    hasPlan?: boolean
  }
  recovery?: {
    state?: HomeDomainState
    status?: HomeViewModel['recovery']['status']
    score?: number | null
    sourceDataAvailable?: boolean
  }
  checkIn?: {
    state?: HomeDomainState
    mood?: string | null
    sleep?: number | null
    note?: string | null
  }
  hydration?: {
    state?: HomeDomainState
    consumedMl?: number | null
    targetMl?: number | null
  }
  progression?: {
    state?: HomeDomainState
    currentWeight?: number | null
    previousWeight?: number | null
    sessionsThisWeek?: number | null
    adherence?: number | null
    latestPR?: unknown | null
  }
  diagnostic?: {
    state?: HomeDomainState
    latest?: unknown | null
    canGenerate?: boolean
  }
  coach: {
    state?: HomeDomainState
    relationStatus: HomeCoachRelationStatus
    coachId?: string | null
    coachDisplayName?: string | null
    nextAppointment?: unknown | null
    lastMessage?: unknown | 'unavailable' | null
  }
  capabilities: UserCapabilities
  errors?: Partial<Record<HomeDomain, string>>
  freshness?: HomeViewModel['freshness']['source']
}

export interface HomeDashboardTrainingSource {
  day: HomeDayWindow
  scheduledSessions: ReadonlyArray<{
    id: string
    title?: string | null
    scheduled_date: string
    scheduled_time?: string | null
    session_type?: string | null
    completed?: boolean | null
  }>
  programSession?: {
    title: string
    exercises?: readonly unknown[]
    isRest?: boolean
    source: 'custom_program' | 'coach_program'
  } | null
  workoutSessions: ReadonlyArray<{
    id?: string | null
    name?: string | null
    created_at: string
    completed?: boolean | null
  }>
  nextSession?: unknown | null
  weeklyPlanned?: number
  weeklyCompleted?: number
  hasProgram?: boolean
  state?: HomeDomainState
}

/**
 * Resolves the training snapshot exclusively from data already loaded by the
 * dashboard. A scheduled item owns timing/title, while the active program owns
 * exercise content. A completed free session remains visible even without a
 * program. This selector performs no I/O.
 */
export function resolveHomeTrainingData(
  source: HomeDashboardTrainingSource,
): HomeViewModelInput['training'] {
  if (source.state === 'loading' || source.state === 'error') {
    return { state: source.state }
  }

  const scheduled = source.scheduledSessions.find(item => (
    item.scheduled_date === source.day.localDateKey
    && item.session_type !== 'rest'
  ))
  const completedWorkout = source.workoutSessions.find(item => (
    item.completed !== false && isInHomeDay(item.created_at, source.day)
  ))
  const program = source.programSession ?? null
  const isCompleted = Boolean(scheduled?.completed || completedWorkout)

  let session: HomeTrainingSession | null = null
  let sessionSource: HomeViewModel['training']['source'] = 'none'

  if (scheduled) {
    session = {
      id: scheduled.id,
      title: scheduled.title || program?.title || '',
      exercises: program?.exercises ?? [],
      scheduledAt: scheduled.scheduled_time
        ? `${scheduled.scheduled_date}T${scheduled.scheduled_time}`
        : null,
      isRest: false,
    }
    sessionSource = 'scheduled'
  } else if (program) {
    session = {
      id: null,
      title: program.title,
      exercises: program.exercises ?? [],
      scheduledAt: null,
      isRest: program.isRest ?? false,
    }
    sessionSource = program.source
  } else if (completedWorkout) {
    session = {
      id: completedWorkout.id ?? null,
      title: completedWorkout.name || '',
      exercises: [],
      scheduledAt: completedWorkout.created_at,
      isRest: false,
    }
  }

  return {
    state: session ? 'ready' : 'empty',
    session,
    source: sessionSource,
    isCompleted,
    nextSession: source.nextSession ?? null,
    weeklyPlanned: source.weeklyPlanned,
    weeklyCompleted: source.weeklyCompleted,
    hasProgram: source.hasProgram ?? Boolean(program),
  }
}

const emptyMacros: HomeMacros = { protein: null, carbs: null, fat: null }

function normalizeMacros(value?: Partial<HomeMacros>): HomeMacros {
  return { ...emptyMacros, ...value }
}

function stateOrEmpty(
  explicit: HomeDomainState | undefined,
  hasData: boolean,
): HomeDomainState {
  return explicit ?? (hasData ? 'ready' : 'empty')
}

function trainingDayStatus(
  state: HomeDomainState,
  session: HomeTrainingSession | null,
  isCompleted: boolean,
): HomeViewModel['training']['dayStatus'] {
  if (state === 'loading' || state === 'error' || !session) return 'no_session'
  if (isCompleted) return 'completed'
  if (session.isRest) return 'rest'
  return 'scheduled'
}

export function buildHomeViewModel(input: HomeViewModelInput): HomeViewModel {
  const errors = Object.fromEntries(
    Object.entries(input.errors ?? {}).map(([domain, code]) => [
      domain,
      { domain, code },
    ]),
  ) as HomeViewModel['errors']
  const errorDomains = new Set(Object.keys(errors) as HomeDomain[])
  const session = input.training.session ?? null
  const isCompleted = input.training.isCompleted ?? false
  const weeklyPlanned = input.training.weeklyPlanned ?? 0
  const weeklyCompleted = input.training.weeklyCompleted ?? 0
  const trainingState = errorDomains.has('training')
    ? 'error'
    : stateOrEmpty(input.training.state, Boolean(session))
  const nutritionHasData = input.nutrition.caloriesConsumed != null
    || Object.values(input.nutrition.macrosConsumed ?? {}).some(value => value != null)
  const nutritionState = errorDomains.has('nutrition')
    ? 'error'
    : stateOrEmpty(input.nutrition.state, nutritionHasData)
  const relationIsActive = input.coach.relationStatus === 'active'
    && Boolean(input.coach.coachId)
  const coachState = errorDomains.has('coach')
    || input.coach.relationStatus === 'error'
    || input.coach.relationStatus === 'multiple_active'
    ? 'error'
    : stateOrEmpty(input.coach.state, relationIsActive)

  const states: Record<HomeDomain, HomeDomainState> = {
    identity: errorDomains.has('identity')
      ? 'error'
      : stateOrEmpty(input.identity.state, Boolean(input.identity.firstName)),
    training: trainingState,
    nutrition: nutritionState,
    recovery: errorDomains.has('recovery')
      ? 'error'
      : stateOrEmpty(input.recovery?.state, input.recovery?.sourceDataAvailable === true),
    checkIn: errorDomains.has('checkIn')
      ? 'error'
      : stateOrEmpty(input.checkIn?.state, Boolean(input.checkIn?.mood)),
    progression: errorDomains.has('progression')
      ? 'error'
      : stateOrEmpty(
        input.progression?.state,
        input.progression?.currentWeight != null
          || input.progression?.sessionsThisWeek != null
          || input.progression?.latestPR != null,
      ),
    diagnostic: errorDomains.has('diagnostic')
      ? 'error'
      : stateOrEmpty(input.diagnostic?.state, input.diagnostic?.latest != null),
    coach: coachState,
    hydration: errorDomains.has('hydration')
      ? 'error'
      : stateOrEmpty(input.hydration?.state, input.hydration?.consumedMl != null),
  }
  const domainLoading = Object.fromEntries(
    Object.entries(states).map(([domain, state]) => [domain, state === 'loading']),
  ) as Record<HomeDomain, boolean>
  const globalLoading = domainLoading.identity || domainLoading.training

  return {
    identity: {
      state: states.identity,
      firstName: input.identity.firstName,
      avatar: input.identity.avatar ?? null,
      xp: input.identity.xp ?? null,
      streak: input.identity.streak ?? 0,
    },
    today: input.today,
    training: {
      state: states.training,
      dayStatus: trainingDayStatus(trainingState, session, isCompleted),
      session,
      source: session ? (input.training.source ?? 'none') : 'none',
      hasProgram: input.training.hasProgram ?? false,
      isCompleted,
      nextSession: input.training.nextSession ?? null,
      weeklySummary: {
        planned: weeklyPlanned,
        completed: weeklyCompleted,
        adherence: weeklyPlanned > 0
          ? Math.min(1, weeklyCompleted / weeklyPlanned)
          : null,
      },
    },
    nutrition: {
      state: states.nutrition,
      caloriesConsumed: nutritionState === 'error'
        ? null
        : input.nutrition.caloriesConsumed ?? null,
      caloriesTarget: input.nutrition.caloriesTarget ?? null,
      macrosConsumed: nutritionState === 'error'
        ? emptyMacros
        : normalizeMacros(input.nutrition.macrosConsumed),
      macrosTarget: normalizeMacros(input.nutrition.macrosTarget),
      hasPlan: input.nutrition.hasPlan ?? false,
    },
    recovery: {
      state: states.recovery,
      status: input.recovery?.status ?? null,
      score: input.recovery?.score ?? null,
      sourceDataAvailable: input.recovery?.sourceDataAvailable ?? false,
    },
    checkIn: {
      state: states.checkIn,
      completedToday: states.checkIn === 'ready',
      mood: input.checkIn?.mood ?? null,
      sleep: input.checkIn?.sleep ?? null,
      note: input.checkIn?.note ?? null,
    },
    hydration: {
      state: states.hydration,
      consumedMl: states.hydration === 'error'
        ? null
        : input.hydration?.consumedMl ?? null,
      targetMl: input.hydration?.targetMl ?? null,
    },
    progression: {
      state: states.progression,
      currentWeight: input.progression?.currentWeight ?? null,
      weightTrend: input.progression?.currentWeight != null
        && input.progression.previousWeight != null
        ? input.progression.currentWeight - input.progression.previousWeight
        : null,
      sessionsThisWeek: input.progression?.sessionsThisWeek ?? null,
      adherence: input.progression?.adherence ?? null,
      latestPR: input.progression?.latestPR ?? null,
    },
    diagnostic: {
      state: states.diagnostic,
      latest: input.diagnostic?.latest ?? null,
      canGenerate: input.diagnostic?.canGenerate ?? true,
    },
    coach: {
      state: states.coach,
      relationStatus: input.coach.relationStatus,
      coachId: relationIsActive ? input.coach.coachId ?? null : null,
      coachDisplayName: relationIsActive
        ? input.coach.coachDisplayName ?? null
        : null,
      nextAppointment: relationIsActive
        ? input.coach.nextAppointment ?? null
        : null,
      lastMessage: relationIsActive
        ? input.coach.lastMessage ?? 'unavailable'
        : null,
    },
    capabilities: input.capabilities,
    loading: { global: globalLoading, domains: domainLoading },
    errors,
    freshness: {
      generatedAt: input.today.date.toISOString(),
      source: input.freshness ?? 'mixed',
    },
  }
}
