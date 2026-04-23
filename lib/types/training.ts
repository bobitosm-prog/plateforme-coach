/**
 * Types du module Training.
 *
 * ⚠️ Ces types sont TOLERANTS : ils refletent la realite actuelle du
 * code, qui utilise plusieurs variantes pour les memes champs (consequence
 * d'une evolution sans gardien de schema).
 *
 * Ils servent de :
 * - Documentation vivante du schema reel
 * - Fondation pour une migration progressive vers des types stricts
 * - Garde-fou minimal pour les nouveaux developpements
 *
 * Le refactor vers des types stricts est documente dans AUDIT-TRAINING.md
 * section "CHAOS SCHEMATIQUE".
 */

// ════════════════════════════════════════════════════════════
// EXERCICE — toutes les variantes de champs vues dans le code
// ════════════════════════════════════════════════════════════

/**
 * Represente un exercice, avec tous les champs possibles observes.
 * La plupart sont optionnels car differents contextes les utilisent :
 * - Exercices de la bibliotheque (exercises_db) : name, muscle_group, video_url...
 * - Exercices personnalises (custom_exercises) : rest_seconds, sets...
 * - Exercices generes par IA : name OU custom_name, rest_seconds en string...
 * - Exercices en cours de seance (runtime) : weight, notes, completed...
 */
export type Exercise = {
  // Identite
  id?: string;
  exercise_id?: string;

  // Noms (4 variantes coexistent dans le code)
  name?: string;
  exercise_name?: string;
  custom_name?: string;
  exerciseName?: string;          // runtime local, camelCase dans les components

  // Muscle cible (3 variantes)
  muscle_group?: string;
  muscle_primary?: string;
  muscle?: string;

  // Media (2 variantes)
  gif_url?: string | null;
  video_url?: string | null;
  image_url?: string | null;

  // Parametres d'entrainement
  sets?: number;
  reps?: string | number;          // '8-12' ou 10
  tempo?: string;                  // '2-0-2'

  // Repos (2 variantes, gerees par getRestSeconds)
  rest?: number | string | null;
  rest_seconds?: number | string | null;

  // Technique
  technique?: string | null;
  technique_details?: string | null;
  notes?: string | null;

  // Organisation
  order?: number;
  day_number?: number;

  // Marqueurs
  _custom?: boolean;

  // Runtime / seance
  weight?: number;
  focus?: string;
  phases?: Phase[];
};

// ════════════════════════════════════════════════════════════
// JOUR
// ════════════════════════════════════════════════════════════

export type Day = {
  name?: string;
  day_name?: string;              // variante API generate-program
  weekday?: string;
  focus?: string;
  is_rest?: boolean;
  exercises?: Exercise[];
  muscle_groups?: string[];       // variante API custom-program
  day_number?: number;
};

// ════════════════════════════════════════════════════════════
// PHASE (periodisation multi-semaines)
// ════════════════════════════════════════════════════════════

export type Phase = {
  week_start?: number;
  week_end?: number;
  name?: string;
  sets?: number;
  reps?: string | number;
  rest_seconds?: number | string;
  tempo?: string;
  technique?: string | null;
  technique_details?: string | null;
};

// ════════════════════════════════════════════════════════════
// PROGRAMME
// ════════════════════════════════════════════════════════════

export type Program = {
  id?: string;
  name?: string;
  program_name?: string;           // variante
  days?: Day[];
  source?: 'ai' | 'manual' | 'template' | string;
  is_active?: boolean;
  scheduled?: boolean | string;
  start_date?: string | null;
  total_weeks?: number;
  current_week?: number;
  phases?: Phase[];
};

// ════════════════════════════════════════════════════════════
// HELPERS — valeurs de type primitives hetereogenes
// ════════════════════════════════════════════════════════════

/**
 * Une valeur de repos peut etre :
 * - number : 120
 * - string : "120", "120s", "2min", "1m30"
 * - null / undefined
 * Utilise getRestSeconds() de lib/utils/exercise pour la parser.
 */
export type RestValue = number | string | null | undefined;

/**
 * Une valeur de reps peut etre :
 * - number : 10
 * - string range : "8-12", "6-8", "AMRAP"
 */
export type RepsValue = number | string | null | undefined;
