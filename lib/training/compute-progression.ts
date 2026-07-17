// ── Table d'autorégulation RIR (À VALIDER PAR UN COACH) ──
// RIR = reps en réserve sur le dernier set. 0 = échec, 4+ = très facile.
const RIR_SAFETY_MAX = 1   // RIR <= 1 sur un statut progress → bascule en hold (ne pas charger un user épuisé)
const RIR_ACCEL_MIN  = 4   // RIR >= 4 → accélère le step
const RIR_FRESH_MIN  = 2   // RIR >= 2 sur les sets frais → débloque le quasi-succès (À VALIDER PAR UN COACH)

function acceleratedStep(step: number): number {
  if (step <= 1.25) return 2.5
  if (step <= 2.5) return 5
  return 7.5
}

// ── Types ──

export type PrevSessionSet = { weight: number; reps: number; completed: boolean; rir: number | null }
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
  if (typeof input === 'number') return Number.isFinite(input) && Number.isInteger(input) && input > 0 ? input : null
  const s = String(input).trim()
  if (!s) return null
  const rangeMatch = s.match(/^(\d+)\s*[-–]\s*(\d+)$/)
  if (rangeMatch) {
    const min = Number(rangeMatch[1])
    const max = Number(rangeMatch[2])
    return min > 0 && max >= min ? min : null
  }
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Increment intelligent par groupe musculaire.
 *  Compound lourd → 5, compound upper → 2.5, isolation → 1.25 */
export function getIncrementForExercise(name: string): number {
  const n = name.toLowerCase()
  if (/squat|deadlift|souleve de terre|hip thrust|good morning/i.test(n)) return 5
  if (/bench|developpe couche|developpe militaire|overhead press|push press|incline press/i.test(n)) return 2.5
  if (/\brow\b|tirage|pull-?up|traction|chin-?up/i.test(n)) return 2.5
  if (/curl|extension|lateral|élévation|elevation|kickback|fly|ecarte|front raise|rear delt|reverse fly/i.test(n)) return 1.25
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
  if (!Number.isFinite(refWeight) || refWeight <= 0) return null

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

  // 2. Tous les sets atteignent la cible → progress (modulé par RIR si disponible)
  if (allReachedTarget) {
    // RIR du dernier set complété ayant un rir non-null
    const completedWithRir = lastSession.filter(s => s.rir != null)
    const lastRir = completedWithRir.length > 0 ? completedWithRir[completedWithRir.length - 1].rir : null

    if (lastRir != null && lastRir <= RIR_SAFETY_MAX) {
      return { weight: refWeight, status: 'hold', reason: 'Effort maximal la dernière fois, on consolide', step }
    }
    if (lastRir != null && lastRir >= RIR_ACCEL_MIN) {
      const accelStep = acceleratedStep(step)
      return { weight: refWeight + accelStep, status: 'progress', reason: 'C\'était facile, on accélère', step: accelStep }
    }

    return {
      weight: refWeight + step,
      status: 'progress',
      reason: 'Tous tes sets validés, monte la charge',
      step,
    }
  }

  // 2b/2c. Quasi-succès débloqué par RIR (tous les sets à cible ou cible-1, aucun échec franc)
  const quasiReached = lastSession.every(s => s.reps >= targetReps - 1)
  if (quasiReached) {
    // 2b. RIR frais : les 2 premiers sets complétés ont rir >= RIR_FRESH_MIN → signal fort
    if (lastSession.length >= 2 &&
        lastSession[0].rir != null && lastSession[0].rir >= RIR_FRESH_MIN &&
        lastSession[1].rir != null && lastSession[1].rir >= RIR_FRESH_MIN) {
      return {
        weight: refWeight + step,
        status: 'progress',
        reason: 'De la réserve sur tes premiers sets, monte la charge',
        step,
      }
    }

    // 2c. Tendance confirmée : dernier set rir >= RIR_FRESH_MIN sur 2 séances consécutives
    const completedWithRir = lastSession.filter(s => s.rir != null)
    const lastRir = completedWithRir.length > 0 ? completedWithRir[completedWithRir.length - 1].rir : null
    const prevSession2c = prevSessions[1]?.filter(s => s.completed) ?? []
    const prevCompletedWithRir = prevSession2c.filter(s => s.rir != null)
    const prevLastRir = prevCompletedWithRir.length > 0 ? prevCompletedWithRir[prevCompletedWithRir.length - 1].rir : null

    if (lastRir != null && lastRir >= RIR_FRESH_MIN &&
        prevLastRir != null && prevLastRir >= RIR_FRESH_MIN) {
      return {
        weight: refWeight + step,
        status: 'progress',
        reason: 'Deux séances avec de la réserve, monte la charge',
        step,
      }
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
