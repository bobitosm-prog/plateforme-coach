export type InitialGenerationDomain = 'training' | 'nutrition'
// Same-runtime and supported cross-tab races are serialized, but the database
// has no unique active-resource key. Cross-device idempotency remains partial.
export const INITIAL_GENERATION_IDEMPOTENCY = 'PARTIAL' as const
export type InitialGenerationPhase = 'idle' | 'checking' | 'ready' | 'missing' | 'generating' | 'error'
export type InitialGenerationError =
  | 'read'
  | 'generation'
  | 'persistence'
  | 'confirmation'
  | 'capability'
  | 'relation'
  | 'quota_exhausted'
  | 'quota_error'
  | 'finalization'

export interface InitialGenerationDomainState {
  phase: InitialGenerationPhase
  reason?: InitialGenerationError | 'coach_managed'
}

export interface InitialGenerationSnapshot {
  training: InitialGenerationDomainState
  nutrition: InitialGenerationDomainState
  finalization: 'idle' | 'clearing' | 'ready' | 'error'
}

export type InitialGenerationGlobalState = 'idle' | 'preparing' | 'partial' | 'ready' | 'error'

export type ResourceReadResult =
  | { kind: 'ready' }
  | { kind: 'missing' }
  | { kind: 'error'; reason?: 'read' | 'relation' }

export type QuotaCheckResult = 'available' | 'exhausted' | 'error'

export class InitialGenerationFailure extends Error {
  constructor(readonly reason: InitialGenerationError) {
    super('INITIAL_GENERATION_FAILED')
    this.name = 'InitialGenerationFailure'
  }
}

export interface InitialGenerationDomainPort {
  read: () => Promise<ResourceReadResult>
  generate: () => Promise<unknown>
  validate: (payload: unknown) => boolean
  persist: (payload: unknown) => Promise<boolean>
  canGenerate: boolean
  blockedReason?: 'coach_managed' | 'capability'
}

interface RunInitialGenerationInput {
  snapshot: InitialGenerationSnapshot
  domains: readonly InitialGenerationDomain[]
  ports: Record<InitialGenerationDomain, InitialGenerationDomainPort>
  checkQuota: () => Promise<QuotaCheckResult>
  clearFlag: () => Promise<boolean>
  onChange?: (snapshot: InitialGenerationSnapshot) => void
}

export const EMPTY_INITIAL_GENERATION_SNAPSHOT: InitialGenerationSnapshot = {
  training: { phase: 'idle' },
  nutrition: { phase: 'idle' },
  finalization: 'idle',
}

export function deriveInitialGenerationGlobalState(
  snapshot: InitialGenerationSnapshot,
): InitialGenerationGlobalState {
  if (snapshot.finalization === 'error') return 'error'
  if (snapshot.finalization === 'ready') return 'ready'

  const phases = [snapshot.training.phase, snapshot.nutrition.phase]
  if (phases.every(phase => phase === 'idle')) return 'idle'
  if (phases.includes('checking') || phases.includes('generating') || snapshot.finalization === 'clearing') {
    return 'preparing'
  }
  if (phases.every(phase => phase === 'ready')) return 'preparing'
  if (phases.includes('ready')) return 'partial'
  if (phases.includes('missing')) return 'partial'
  return 'error'
}

function cloneSnapshot(snapshot: InitialGenerationSnapshot): InitialGenerationSnapshot {
  return {
    training: { ...snapshot.training },
    nutrition: { ...snapshot.nutrition },
    finalization: snapshot.finalization,
  }
}

/**
 * Runs one controlled attempt. Domains are independent: a failure in one never
 * prevents the other from being checked or generated. Every generated resource
 * must pass a race re-read, persistence, then an authoritative confirmation read.
 */
export async function runInitialGenerationAttempt({
  snapshot: initialSnapshot,
  domains,
  ports,
  checkQuota,
  clearFlag,
  onChange,
}: RunInitialGenerationInput): Promise<InitialGenerationSnapshot> {
  let snapshot = cloneSnapshot(initialSnapshot)
  const emit = (
    domain?: InitialGenerationDomain,
    state?: InitialGenerationDomainState,
    finalization?: InitialGenerationSnapshot['finalization'],
  ) => {
    snapshot = {
      ...snapshot,
      ...(domain && state ? { [domain]: state } : {}),
      ...(finalization ? { finalization } : {}),
    }
    onChange?.(cloneSnapshot(snapshot))
  }

  for (const domain of domains) {
    if (snapshot[domain].phase === 'ready') continue
    const port = ports[domain]
    emit(domain, { phase: 'checking' }, snapshot.finalization === 'error' ? 'idle' : undefined)

    let initialRead: ResourceReadResult
    try {
      initialRead = await port.read()
    } catch {
      initialRead = { kind: 'error', reason: 'read' }
    }
    if (initialRead.kind === 'error') {
      emit(domain, { phase: 'error', reason: initialRead.reason ?? 'read' })
      continue
    }
    if (initialRead.kind === 'ready') {
      emit(domain, { phase: 'ready' })
      continue
    }

    emit(domain, { phase: 'missing', reason: port.blockedReason })
    if (!port.canGenerate) {
      if (port.blockedReason !== 'coach_managed') {
        emit(domain, { phase: 'error', reason: 'capability' })
      }
      continue
    }

    const quota = await checkQuota().catch(() => 'error' as const)
    if (quota !== 'available') {
      emit(domain, {
        phase: 'error',
        reason: quota === 'exhausted' ? 'quota_exhausted' : 'quota_error',
      })
      continue
    }

    emit(domain, { phase: 'generating' })
    try {
      const payload = await port.generate()
      if (!port.validate(payload)) throw new InitialGenerationFailure('generation')

      // A second read narrows refresh/tab races before any insert.
      const raceRead = await port.read()
      if (raceRead.kind === 'error') throw new InitialGenerationFailure(raceRead.reason ?? 'read')
      if (raceRead.kind === 'ready') {
        emit(domain, { phase: 'ready' })
        continue
      }

      const persisted = await port.persist(payload)
      if (!persisted) throw new InitialGenerationFailure('persistence')

      const confirmation = await port.read()
      if (confirmation.kind !== 'ready') throw new InitialGenerationFailure('confirmation')
      emit(domain, { phase: 'ready' })
    } catch (error) {
      const reason = error instanceof InitialGenerationFailure ? error.reason : 'generation'
      emit(domain, { phase: 'error', reason })
    }
  }

  if (snapshot.training.phase === 'ready' && snapshot.nutrition.phase === 'ready') {
    emit(undefined, undefined, 'clearing')
    const cleared = await clearFlag().catch(() => false)
    emit(undefined, undefined, cleared ? 'ready' : 'error')
  }

  return cloneSnapshot(snapshot)
}
