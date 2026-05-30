-- ============================================================
-- Backfill week_start : dim 2026-05-24 → lun 2026-05-25
-- ============================================================
-- Appliqué en prod : 30 mai 2026 (via Supabase SQL Editor)
-- Tracé ici pour reproductibilité (db reset / nouvel env)
--
-- Bug TD-1 : 4 diags générés avec week_start = dimanche
-- Cause racine : calcul JS getDay()/setHours() + toISOString() en TZ Geneva
-- "minuit lundi local" (Geneva +02:00) = "22h dimanche UTC"
-- toISOString().slice(0,10) renvoyait alors le dimanche.
--
-- Fix code : commit séparé sur lib/weekly-diagnostic/generator.ts
-- (calcul via Intl.DateTimeFormat en TZ Europe/Zurich)
--
-- Stratégie data :
--   1. DELETE 1 doublon (user fd3f4544 avait 2 diags pour la même semaine
--      réelle, un dim 24 buggé et un lun 25 correct par cron Vercel)
--   2. UPDATE les 3 diags restants : week_start + 1 jour
--
-- Idempotent : filtre WHERE ISODOW = 7 (dimanche) → si re-run
-- après fix, aucune ligne ne match plus.
-- ============================================================

DO $$
DECLARE
  v_deleted INT := 0;
  v_updated INT := 0;
BEGIN
  -- 1. Supprimer le doublon dim 24 (l'user a déjà son diag lun 25 correct)
  DELETE FROM weekly_diagnostics
  WHERE id = 'c2da570f-b22d-4a0a-b76f-4db90cda78d7'
    AND week_start = '2026-05-24'
    AND EXTRACT(ISODOW FROM week_start) = 7;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- 2. Backfill : décaler les 3 autres dim → lun
  UPDATE weekly_diagnostics
  SET week_start = (week_start + INTERVAL '1 day')::date
  WHERE EXTRACT(ISODOW FROM week_start) = 7;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RAISE NOTICE 'Backfill week_start : deleted=% / updated=%', v_deleted, v_updated;
END $$;
