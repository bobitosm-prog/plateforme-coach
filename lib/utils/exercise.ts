type ExerciseLike = {
  rest_seconds?: number | string | null;
  /** @deprecated ancien nom, gardé pour compat */
  rest?: number | string | null;
};

/**
 * Retourne le temps de repos d'un exercice en SECONDES.
 * - Gère les deux noms de champ (rest_seconds prioritaire).
 * - Gère les valeurs string venant de la DB ("120").
 * - Gère explicitement 0 (repos volontairement nul, supersets).
 * - Fallback = 90s uniquement si valeur absente/invalide.
 */
export function getRestSeconds(
  ex: ExerciseLike,
  fallback = 90
): number {
  console.log('[getRestSeconds] INPUT:', {
    exerciseName: (ex as any).name,
    rest: ex.rest,
    rest_seconds: ex.rest_seconds,
    raw: ex,
  });
  const raw = ex.rest_seconds ?? ex.rest;
  if (raw === null || raw === undefined || raw === "") {
    console.log('[getRestSeconds] OUTPUT:', fallback, '(fallback)');
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    console.log('[getRestSeconds] OUTPUT:', fallback, '(invalid)');
    return fallback;
  }
  console.log('[getRestSeconds] OUTPUT:', n);
  return n;
}
