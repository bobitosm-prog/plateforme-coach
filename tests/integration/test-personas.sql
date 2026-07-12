-- Generated from tests/fixtures/personas.json. Do not edit manually.
CREATE SCHEMA IF NOT EXISTS test;
DROP TABLE IF EXISTS test.personas;
CREATE TABLE test.personas (
  id uuid PRIMARY KEY, email text UNIQUE NOT NULL, role text NOT NULL,
  subscription_type text, subscription_status text, onboarding_completed boolean NOT NULL,
  is_admin boolean NOT NULL, persona_name text UNIQUE NOT NULL
);
INSERT INTO test.personas VALUES
  ('71000000-0000-4000-8000-000000000001'::uuid, 'client@moovx.example.test', 'client', 'client_monthly', 'active', true, false, 'client'),
  ('71000000-0000-4000-8000-000000000002'::uuid, 'coach@moovx.example.test', 'coach', 'coach_monthly', 'active', false, false, 'coach'),
  ('71000000-0000-4000-8000-000000000003'::uuid, 'invited@moovx.example.test', 'client', 'invited', 'active', true, false, 'invited'),
  ('71000000-0000-4000-8000-000000000004'::uuid, 'lifetime@moovx.example.test', 'client', 'lifetime', 'lifetime', true, false, 'lifetime'),
  ('71000000-0000-4000-8000-000000000005'::uuid, 'admin@moovx.example.test', 'client', 'client_monthly', 'active', true, true, 'admin'),
  ('71000000-0000-4000-8000-000000000006'::uuid, 'second-client@moovx.example.test', 'client', 'client_monthly', 'active', true, false, 'secondClient'),
  ('71000000-0000-4000-8000-000000000007'::uuid, 'second-coach@moovx.example.test', 'coach', 'coach_monthly', 'active', false, false, 'secondCoach');

CREATE OR REPLACE FUNCTION test.seed_personas() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  SELECT id, email, now(), jsonb_build_object('role', role) FROM test.personas
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  INSERT INTO public.profiles (id, email, full_name, role, subscription_type, subscription_status, onboarding_completed, coach_onboarding_complete)
  SELECT id, email, initcap(persona_name) || ' Fixture', role, subscription_type, subscription_status, onboarding_completed, role = 'coach'
  FROM test.personas
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email, role = EXCLUDED.role, subscription_type = EXCLUDED.subscription_type,
    subscription_status = EXCLUDED.subscription_status, onboarding_completed = EXCLUDED.onboarding_completed,
    coach_onboarding_complete = EXCLUDED.coach_onboarding_complete;
END;
$$;

CREATE OR REPLACE FUNCTION test.set_persona_relation(coach_name text, client_name text, relation_status text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF relation_status NOT IN ('active', 'inactive') THEN RAISE EXCEPTION 'invalid fixture relation status'; END IF;
  INSERT INTO public.coach_clients (coach_id, client_id, status)
  SELECT coach.id, client.id, relation_status
  FROM test.personas coach, test.personas client
  WHERE coach.persona_name = coach_name AND coach.role = 'coach'
    AND client.persona_name = client_name AND client.role = 'client'
  ON CONFLICT (coach_id, client_id) DO UPDATE SET status = EXCLUDED.status;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid fixture persona relation'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION test.cleanup_personas() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.coach_clients WHERE coach_id IN (SELECT id FROM test.personas) OR client_id IN (SELECT id FROM test.personas);
  DELETE FROM public.profiles WHERE id IN (SELECT id FROM test.personas);
  DELETE FROM auth.users WHERE id IN (SELECT id FROM test.personas);
END;
$$;
