-- Migration : beta_campaign_link
-- (1) Re-versionne claim_beta_slot (créée via dashboard, jamais commitée = dette).
-- (2) Ajoute profiles.beta_campaign_id (FK → beta_campaigns.id, ON DELETE SET NULL).
-- (3) La RPC pose ce campaign_id au claim (1 ligne ajoutée dans l'UPDATE profiles).
-- Idempotent : IF NOT EXISTS + CREATE OR REPLACE.

-- ═══ 1. Colonne beta_campaign_id ═══
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beta_campaign_id uuid;

DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_beta_campaign_id_fkey'
      AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_beta_campaign_id_fkey
      FOREIGN KEY (beta_campaign_id) REFERENCES beta_campaigns(id)
      ON DELETE SET NULL;
  END IF;
END;
$fk$;

-- ═══ 2. Re-versionne claim_beta_slot (corps VERBATIM du réel) + 1 ligne ═══
CREATE OR REPLACE FUNCTION public.claim_beta_slot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_campaign_id uuid;
  v_free_days integer;
  v_end_date timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_authenticated');
  END IF;

  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_uid
      AND subscription_type IN ('beta', 'lifetime', 'invited')
  ) THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_has_access');
  END IF;

  UPDATE beta_campaigns
  SET used_slots = used_slots + 1
  WHERE is_active = true
    AND used_slots < max_slots
  RETURNING id, free_days INTO v_campaign_id, v_free_days;

  IF v_campaign_id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_slot');
  END IF;

  v_end_date := now() + (v_free_days || ' days')::interval;
  UPDATE profiles
  SET subscription_type = 'beta',
      subscription_status = 'beta',
      subscription_end_date = v_end_date,
      beta_campaign_id = v_campaign_id
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'claimed', true,
    'free_days', v_free_days,
    'end_date', v_end_date,
    'campaign_id', v_campaign_id
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.claim_beta_slot() TO authenticated;
