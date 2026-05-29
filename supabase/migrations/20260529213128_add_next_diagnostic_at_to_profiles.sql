-- ============================================================================
-- Migration : Add next_diagnostic_at column to profiles
-- Date      : 2026-05-29
-- Context   : F4d.10a — Architecture B Cron individualisé Weekly Diagnostic
--             Permet que chaque user reçoive son diag à 7 jours STRICT
--             de son dernier (manuel ou auto), pas un dimanche fixe pour tous.
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS next_diagnostic_at timestamptz;

-- Backfill : pour les clients existants, planifier le prochain diag à dimanche 18h UTC
-- (= comportement actuel, pas de régression pour les users en place)
UPDATE profiles
SET next_diagnostic_at = (
  DATE_TRUNC('week', NOW()) + INTERVAL '6 days 18 hours'  -- Dimanche 18h UTC de cette semaine
)
WHERE role = 'client' 
  AND onboarding_completed = true
  AND next_diagnostic_at IS NULL;

-- Pour les nouveaux users : initialiser à création + 7 jours (vraie semaine de data avant 1er diag)
-- Note : géré côté application au moment de l'onboarding, pas via DEFAULT
--        car DEFAULT s'applique avant qu'on connaisse le contexte du user.

COMMENT ON COLUMN profiles.next_diagnostic_at IS 
  'Quand le prochain diagnostic IA doit être généré pour ce user. F4d.10a Architecture B cron individualisé.';

-- Index pour optimiser la query du cron (filter "users à traiter")
CREATE INDEX IF NOT EXISTS idx_profiles_next_diagnostic_at
  ON profiles (next_diagnostic_at)
  WHERE role = 'client' AND onboarding_completed = true;
