-- Fix the profile guard without inventing historical optional columns.
-- to_jsonb(record) lets the same trigger protect a key when it exists on an
-- older database while remaining valid on the canonical schema where it does
-- not exist.

CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
  v_column text;
  v_sensitive_columns constant text[] := ARRAY[
    'role',
    'status',
    'subscription_type',
    'subscription_status',
    'subscription_end_date',
    'subscription_price',
    'trial_ends_at',
    'stripe_customer_id',
    'stripe_subscription_id',
    'stripe_account_id',
    'stripe_onboarding_complete',
    'beta_campaign_id'
  ];
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  FOREACH v_column IN ARRAY v_sensitive_columns LOOP
    IF (v_new -> v_column) IS DISTINCT FROM (v_old -> v_column) THEN
      RAISE EXCEPTION 'Colonne protégée non modifiable: %', v_column
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.guard_profile_sensitive_columns() IS
  'Blocks anon/authenticated changes to profile authority, subscription, trial and Stripe fields; optional legacy keys are compared through JSONB.';
