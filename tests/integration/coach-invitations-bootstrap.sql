\set ON_ERROR_STOP on

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  email_confirmed_at timestamptz
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text,
  status text,
  subscription_type text,
  subscription_status text,
  subscription_end_date timestamptz,
  stripe_subscription_id text,
  trial_ends_at timestamptz
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_own_read
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

GRANT SELECT ON public.profiles TO authenticated;

CREATE TABLE public.coach_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  invited_by_coach boolean NOT NULL DEFAULT false,
  CONSTRAINT coach_clients_coach_client_unique UNIQUE (coach_id, client_id)
);

ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY coach_clients_read
  ON public.coach_clients
  FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid() OR client_id = auth.uid());

GRANT SELECT ON public.coach_clients TO authenticated;

-- Mirrors the deployed protection that the invitation SECURITY DEFINER RPC
-- must bypass while direct authenticated writes remain forbidden.
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
  protected_column text;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  FOREACH protected_column IN ARRAY ARRAY[
    'role', 'status', 'subscription_type', 'subscription_status',
    'subscription_end_date', 'subscription_price', 'trial_ends_at',
    'stripe_customer_id', 'stripe_subscription_id', 'stripe_account_id',
    'stripe_onboarding_complete', 'beta_campaign_id'
  ] LOOP
    IF (new_row -> protected_column) IS DISTINCT FROM (old_row -> protected_column) THEN
      RAISE EXCEPTION 'Colonne protégée non modifiable: %', protected_column USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_sensitive_columns();

CREATE SCHEMA test;

CREATE OR REPLACE FUNCTION test.assert(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERTION_FAILED: %', message;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA test TO authenticated;
GRANT EXECUTE ON FUNCTION test.assert(boolean, text) TO authenticated;
