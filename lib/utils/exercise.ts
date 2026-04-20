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
  const raw = ex.rest_seconds ?? ex.rest;
  if (raw === null || raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}
