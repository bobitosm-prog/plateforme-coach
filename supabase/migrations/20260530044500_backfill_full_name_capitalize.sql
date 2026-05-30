-- ============================================================
-- Backfill full_name capitalization (TD-3)
-- ============================================================
-- Appliqué en prod : 30 mai 2026 (via Supabase SQL Editor)
-- Tracé ici pour reproductibilité (db reset / nouvel env)
--
-- Bug : 2 users sur 8 ont full_name mal capitalisé (`raki`, `JEan`)
-- Cause : aucun helper capitalize côté code, juste .trim() parfois
-- Fix code : commit séparé (lib/utils/capitalize-name.ts + 5 write points patchés)
--
-- Backfill DB : INITCAP gère les espaces mais pas apostrophes/tirets.
-- Suffisant pour nos 2 cas (prénoms simples sans caractères spéciaux).
-- Pour les futurs noms avec apostrophes/tirets, le helper JS prendra
-- le relais et la DB recevra du data déjà propre.
--
-- Idempotent : filtre WHERE full_name != INITCAP(LOWER(full_name))
-- → si re-run, 0 ligne ne match plus.
-- ============================================================

DO $$
DECLARE
  v_updated INT := 0;
BEGIN
  UPDATE profiles
  SET full_name = INITCAP(LOWER(full_name))
  WHERE full_name IS NOT NULL
    AND full_name != ''
    AND full_name != INITCAP(LOWER(full_name));
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RAISE NOTICE 'Backfill full_name : updated=%', v_updated;
END $$;
