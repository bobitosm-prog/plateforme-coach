-- ============================================================
-- Backfill next_diagnostic_at pour les users orphelins
-- ============================================================
-- Appliqué en prod : 30 mai 2026 (via Supabase SQL Editor)
-- Tracé ici pour reproductibilité (db reset / nouvel env)
--
-- Contexte : la Phase 5 Weekly Diagnostic (29 mai 2026) a ajouté
-- la colonne next_diagnostic_at, mais les users onboardés AVANT
-- ont next_diagnostic_at = NULL et sont invisibles du cron
-- (qui filtre WHERE next_diagnostic_at <= NOW()).
--
-- Stratégie D (hybride) :
--   - Marco (admin, test runtime) → next_diagnostic_at = NOW()
--     → reçoit son diag ce soir 18h UTC, valide le flux E2E
--   - Autres orphelins → next_diagnostic_at = NOW() + 7 jours
--     → laisse 1 semaine d'accumulation de data avant 1er diag
--
-- Idempotent : ne touche QUE les users où next_diagnostic_at IS NULL.
-- Re-run safe (les users déjà backfillés ne sont pas re-touchés).
-- ============================================================

DO $$
DECLARE
  v_marco_id UUID := '99de4106-b016-4fe0-947f-52cb2f2851c1';
  v_marco_updated INT := 0;
  v_others_updated INT := 0;
BEGIN
  -- Bucket 1 : Marco → diag immédiat (test runtime end-to-end)
  UPDATE profiles
  SET next_diagnostic_at = NOW()
  WHERE id = v_marco_id
    AND onboarding_completed_at IS NOT NULL
    AND next_diagnostic_at IS NULL;
  
  GET DIAGNOSTICS v_marco_updated = ROW_COUNT;

  -- Bucket 2 : autres orphelins → diag dans 7 jours
  UPDATE profiles
  SET next_diagnostic_at = NOW() + INTERVAL '7 days'
  WHERE id != v_marco_id
    AND onboarding_completed_at IS NOT NULL
    AND next_diagnostic_at IS NULL;
  
  GET DIAGNOSTICS v_others_updated = ROW_COUNT;

  RAISE NOTICE 'Backfill terminé : Marco=% / autres=%', v_marco_updated, v_others_updated;
END $$;
