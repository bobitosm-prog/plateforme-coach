// ═══════════════════════════════════════════════════════════
// Standard session types — single source of truth for display
// ═══════════════════════════════════════════════════════════

export interface SessionTypeInfo {
  key: string
  label: string
  shortLabel: string
  emoji: string
  color: string
}

export const SESSION_TYPES: SessionTypeInfo[] = [
  { key: 'pectoraux', label: 'Pectoraux', shortLabel: 'Pec', emoji: '🏋️', color: '#F97316' },
  { key: 'dos', label: 'Dos', shortLabel: 'Dos', emoji: '💪', color: '#3B82F6' },
  { key: 'epaules', label: 'Épaules', shortLabel: 'Épaules', emoji: '🤸', color: '#A855F7' },
  { key: 'jambes', label: 'Jambes', shortLabel: 'Jambes', emoji: '🦵', color: '#22C55E' },
  { key: 'full_body', label: 'Full Body', shortLabel: 'Full', emoji: '⚡', color: '#FBBF24' },
  { key: 'haut', label: 'Haut du Corps', shortLabel: 'Haut', emoji: '🏋️', color: '#F97316' },
  { key: 'bas', label: 'Bas du Corps', shortLabel: 'Bas', emoji: '🦵', color: '#22C55E' },
  { key: 'cardio', label: 'Cardio', shortLabel: 'Cardio', emoji: '🏃', color: '#EF4444' },
  { key: 'repos', label: 'Repos', shortLabel: 'Repos', emoji: '😴', color: '#6B7280' },
  { key: 'libre', label: 'Séance Libre', shortLabel: 'Libre', emoji: '⚡', color: '#D4A843' },
]

// ── Old type → standard type mapping (display layer) ──
// Maps old session_type values, PPL names, and AI-generated names to standard display
const OLD_TO_NEW: Record<string, string> = {
  // DB session_type values
  'push_a': 'pectoraux', 'push_b': 'pectoraux',
  'pull_a': 'dos', 'pull_b': 'dos',
  'legs_a': 'jambes', 'legs_b': 'jambes',
  'hiit': 'cardio', 'liss': 'cardio',
  'rest': 'repos', 'custom': 'libre',

  // PPL title names (from scheduled_sessions.title or buildWeekSessions)
  'push a': 'pectoraux', 'push b': 'pectoraux',
  'pull a': 'dos', 'pull b': 'dos',
  'legs a': 'jambes', 'legs b': 'jambes',
  'legs quads': 'jambes', 'legs ischio': 'jambes',
  'lower quads': 'jambes', 'lower ischio': 'jambes',

  // AI-generated names
  'push': 'pectoraux', 'chest': 'pectoraux', 'poitrine': 'pectoraux',
  'pull': 'dos', 'back': 'dos', 'dorsal': 'dos',
  'legs': 'jambes', 'lower': 'bas',
  'upper': 'haut', 'upper a': 'haut', 'upper b': 'haut',
  'upper isolations': 'epaules',
  'glutes': 'jambes', 'glutes & ischio': 'jambes',
  'glutes & core': 'jambes',
  'quads': 'jambes', 'quads & mollets': 'jambes',
  'cardio hiit': 'cardio', 'cardio liss': 'cardio',
  'full body': 'full_body', 'full body a': 'full_body', 'full body b': 'full_body',
  'repos': 'repos',
  'séance libre': 'libre', 'seance libre': 'libre',

  // French muscle groups that might appear as session names
  'pectoraux & triceps': 'pectoraux',
  'pectoraux & epaules': 'pectoraux', 'poitrine & epaules': 'pectoraux',
  'dos & biceps': 'dos', 'dos large': 'dos', 'dos epais': 'dos',
  'epaules & trapezes': 'epaules',
  'quadriceps & mollets': 'jambes',
  'ischio-jambiers': 'jambes', 'fessiers & ischio': 'jambes',
  'haut du corps': 'haut', 'bas du corps': 'bas',
}

/**
 * Resolve a session name/type to a standard SessionTypeInfo.
 * Checks exact match first, then normalized substring match.
 */
export function resolveSessionType(nameOrType: string | null | undefined): SessionTypeInfo {
  if (!nameOrType) return SESSION_TYPES.find(t => t.key === 'libre')!

  const norm = nameOrType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  // Exact match on old→new map
  if (OLD_TO_NEW[norm]) {
    return SESSION_TYPES.find(t => t.key === OLD_TO_NEW[norm])!
  }

  // Partial match — check if any old key is contained in the input
  for (const [oldKey, newKey] of Object.entries(OLD_TO_NEW)) {
    if (norm.includes(oldKey)) {
      return SESSION_TYPES.find(t => t.key === newKey)!
    }
  }

  // Direct match on standard type keys
  const directMatch = SESSION_TYPES.find(t => t.key === norm || t.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === norm)
  if (directMatch) return directMatch

  // Fallback
  return SESSION_TYPES.find(t => t.key === 'libre')!
}

/**
 * Get display label for a session — uses original name if available,
 * falls back to standard type label.
 */
export function getSessionDisplayName(title: string | null | undefined, sessionType?: string): string {
  if (title && title !== 'Repos' && title !== 'rest') return title
  const info = resolveSessionType(sessionType || title)
  return info.label
}

/**
 * HISTORIQUE filter definitions using standard types
 */
export const HISTORY_FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'pectoraux', label: 'Pectoraux' },
  { key: 'dos', label: 'Dos' },
  { key: 'epaules', label: 'Épaules' },
  { key: 'jambes', label: 'Jambes' },
  { key: 'full_body', label: 'Full Body' },
  { key: 'haut', label: 'Haut' },
  { key: 'bas', label: 'Bas' },
  { key: 'cardio', label: 'Cardio' },
]
