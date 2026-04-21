type ExerciseLike = {
  rest_seconds?: number | string | null;
  /** @deprecated ancien nom, gardé pour compat */
  rest?: number | string | null;
};

/**
 * Parse une valeur de repos tolérante aux formats hétérogènes.
 * Accepte :
 *   - number : 120
 *   - string "120"     → 120
 *   - string "120s"    → 120
 *   - string "120 s"   → 120
 *   - string "2min"    → 120
 *   - string "1m30"    → 90
 *
 * Retourne null si la valeur est absente/invalide.
 */
function parseRestValue(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;

  // Cas number direct
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }

  // Cas string
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "") return null;

    // Format "1m30", "2m", "1m15s"
    const mmss = s.match(/^(\d+)\s*m(?:in)?(?:\s*(\d+)\s*s?)?$/);
    if (mmss) {
      const minutes = parseInt(mmss[1], 10);
      const seconds = mmss[2] ? parseInt(mmss[2], 10) : 0;
      return minutes * 60 + seconds;
    }

    // Format "120", "120s", "120 s", "120sec", "120 seconds"
    const num = s.match(/^(\d+)/);
    if (num) {
      const n = parseInt(num[1], 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }

    return null;
  }

  return null;
}

/**
 * Retourne le temps de repos d'un exercice en SECONDES.
 * Tolère les formats DB hétérogènes (number, "120s", "2min", etc.).
 */
export function getRestSeconds(
  ex: ExerciseLike,
  fallback = 90
): number {
  const parsed =
    parseRestValue(ex.rest_seconds) ?? parseRestValue(ex.rest);
  return parsed ?? fallback;
}
