// ── Types ──

export type PrevSessionSet = { weight: number; reps: number; completed: boolean }
export type ProgressionStatus = 'progress' | 'hold' | 'deload'
export type ProgressionResult = {
  weight: number
  status: ProgressionStatus
  reason: string
  step: number
}

// ── Helpers ──

/** Parse la cible reps depuis le format DB/UI.
 *  "10" → 10, "10-12" → 10 (plancher), "AMRAP" → null, null → null */
export function parseRepsTarget(input: unknown): number | null {
  if (input == null) return null
  if (typeof input === 'number') return input > 0 ? input : null
  const s = String(input).trim()
  if (!s) return null
  const rangeMatch = s.match(/^(\d+)\s*[-–]\s*\d+$/)
  if (rangeMatch) return parseInt(rangeMatch[1], 10) || null
  const n = parseInt(s, 10)
  return n > 0 ? n : null
}

/** Increment intelligent par groupe musculaire.
 *  Compound lourd → 5, compound upper → 2.5, isolation → 1.25 */
export function getIncrementForExercise(name: string): number {
  const n = name.toLowerCase()
  if (/squat|deadlift|souleve de terre|hip thrust|good morning/i.test(n)) return 5
  if (/bench|developpe couche|developpe militaire|overhead press|push press|incline press/i.test(n)) return 2.5
  if (/\brow\b|tirage|pull-?up|traction|chin-?up/i.test(n)) return 2.5
  if (/curl|extension|lateral|kickback|fly|ecarte|front raise|rear delt|reverse fly/i.test(n)) return 1.25
  return 2.5
}

/** Arrondit au step le plus proche (round-to-nearest). */
export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

// ── Fonction principale ──

/** Calcule la progression de charge pour la prochaine séance.
 *  @param prevSessions index 0 = plus récente, index 1 = avant-dernière
 *  @param targetReps cible plancher du coach (nombre de reps minimum attendu)
 *  @param exerciseName pour déterminer le step adaptatif */
export function computeProgression(
  prevSessions: PrevSessionSet[][],
  targetReps: number | null,
  exerciseName: string,
): ProgressionResult | null {
  if (targetReps == null) return null
  if (!prevSessions.length || !prevSessions[0]?.length) return null

  const lastSession = prevSessions[0].filter(s => s.completed)
  if (lastSession.length === 0) return null

  // refWeight = max des sets complétés ayant atteint la cible.
  // Gère le cas échauffement progressif (43×10 / 50×10 / 50×10 → ref=50).
  // Si aucun set n'a atteint la cible, fallback sur max global complété.
  // En cas de deload (set <5 reps), on utilise la dernière charge réussie
  // à cible pour que l'user consolide à partir de là, pas de la charge échouée.
  const setsAtTarget = lastSession.filter(s => s.reps >= targetReps)
  const refWeight = setsAtTarget.length > 0
    ? Math.max(...setsAtTarget.map(s => s.weight))
    : Math.max(...lastSession.map(s => s.weight))
  if (refWeight <= 0) return null

  const step = getIncrementForExercise(exerciseName)
  const allReachedTarget = lastSession.every(s => s.reps >= targetReps)
  const hasFailedSet = lastSession.some(s => s.reps < 5)

  // 1. Mauvais set isolé → deload immédiat
  if (hasFailedSet) {
    return {
      weight: roundToStep(refWeight * 0.9, step),
      status: 'deload',
      reason: 'Consolide une charge plus légère',
      step,
    }
  }

  // 2. Tous les sets atteignent la cible → progress
  if (allReachedTarget) {
    return {
      weight: refWeight + step,
      status: 'progress',
      reason: 'Tous tes sets validés, monte la charge',
      step,
    }
  }

  // 3. Hold — au moins 1 set sous cible mais ≥ 5 reps
  //    Vérifier si 2 séances consécutives en hold au même poids → deload stagnation
  const prevSession = prevSessions[1]?.filter(s => s.completed) ?? []
  if (prevSession.length > 0) {
    const prevRefWeight = prevSession[0].weight
    const prevAllReached = prevSession.every(s => s.reps >= targetReps)
    const prevHadFailedSet = prevSession.some(s => s.reps < 5)
    const prevWasHold = !prevAllReached && !prevHadFailedSet

    if (prevWasHold && prevRefWeight === refWeight) {
      return {
        weight: roundToStep(refWeight * 0.9, step),
        status: 'deload',
        reason: '2 séances bloquées, on consolide',
        step,
      }
    }
  }

  return {
    weight: refWeight,
    status: 'hold',
    reason: 'Vise 1 rep de plus que la dernière fois',
    step,
  }
}
