-- Canoniser profiles.objective sur cut/mass/maintain (3 valeurs canoniques).
-- 4 conventions historiques + texte libre coexistaient en base.
-- Idempotent : le WHERE NOT IN rend le 2e run no-op.
-- Appliquée en prod le 2026-07-03.

DO $canon$
DECLARE
  v_count integer;
BEGIN
  UPDATE profiles SET objective = CASE
    WHEN objective IN ('weight_loss', 'seche', 'perte de poids') THEN 'cut'
    WHEN objective IN ('Prendre du muscle', 'bulk', 'prise de masse') THEN 'mass'
    WHEN objective IN ('maintenance', 'maintien') THEN 'maintain'
    ELSE objective
  END
  WHERE objective IS NOT NULL
    AND objective NOT IN ('cut', 'mass', 'maintain');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'canonicalize_profiles_objective: % rows migrated', v_count;

  -- CHECK constraint intentionnellement NON ajoutée pour l'instant :
  -- bloquerait un insert legacy résiduel non identifié. À envisager après R4b.
  -- ALTER TABLE profiles ADD CONSTRAINT profiles_objective_canonical
  --   CHECK (objective IS NULL OR objective IN ('cut', 'mass', 'maintain'));
END;
$canon$;
