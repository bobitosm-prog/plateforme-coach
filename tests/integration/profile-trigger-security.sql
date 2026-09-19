-- Synthetic runtime checks only; no persistent test rows.
BEGIN;
INSERT INTO public.profiles(id,role,calorie_goal,updated_at) VALUES
 ('00000000-0000-4000-8000-000000000091','client',2000,'2000-01-01');

-- A caller-controlled function must not shadow the timestamp implementation.
CREATE SCHEMA synthetic_shadow;
CREATE FUNCTION synthetic_shadow.now() RETURNS timestamptz LANGUAGE sql AS $$
 SELECT '1900-01-01'::timestamptz
$$;
GRANT USAGE ON SCHEMA synthetic_shadow TO authenticated;
SET LOCAL ROLE authenticated;
SET LOCAL search_path = synthetic_shadow, public, pg_catalog;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000091"}',true);
DO $$
DECLARE
 column_name text;
 value_text text;
 affected integer;
BEGIN
 FOR column_name, value_text IN SELECT * FROM (VALUES
   ('role','super_admin'), ('status','active'),
   ('subscription_type','lifetime'), ('subscription_status','active'),
   ('subscription_end_date','2099-01-01'), ('subscription_price','0'),
   ('trial_ends_at','2099-01-01')
 ) AS protected_fields(column_name,value_text)
 LOOP
   BEGIN
     EXECUTE format('UPDATE public.profiles SET %I = %L WHERE id = %L',
       column_name,value_text,'00000000-0000-4000-8000-000000000091');
     RAISE EXCEPTION 'PROTECTED_FIELD_ACCEPTED: %', column_name;
   EXCEPTION WHEN insufficient_privilege THEN
     IF SQLERRM <> 'Colonne protégée non modifiable: ' || column_name THEN RAISE; END IF;
   END;
 END LOOP;
 UPDATE public.profiles SET calorie_goal=2100 WHERE id='00000000-0000-4000-8000-000000000091';
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected <> 1 OR NOT EXISTS (
   SELECT 1 FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000091'
   AND calorie_goal=2100 AND role='client' AND updated_at=pg_catalog.now()
 ) THEN RAISE EXCEPTION 'SAFE_PROFILE_UPDATE_OR_TIMESTAMP_FAILED'; END IF;
END $$;
RESET ROLE;
-- Existing trusted backend behavior is intentionally preserved.
UPDATE public.profiles SET subscription_status='active'
 WHERE id='00000000-0000-4000-8000-000000000091';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles
   WHERE id='00000000-0000-4000-8000-000000000091' AND subscription_status='active')
 THEN RAISE EXCEPTION 'TRUSTED_UPDATE_FAILED'; END IF;
 IF EXISTS (SELECT 1 FROM pg_proc WHERE oid IN (
   'public.guard_profile_sensitive_columns()'::regprocedure,
   'public.update_profiles_updated_at()'::regprocedure
 ) AND (prosecdef OR NOT coalesce(proconfig @> ARRAY['search_path=""'],false)))
 THEN RAISE EXCEPTION 'TRIGGER_SECURITY_CONFIGURATION_FAILED'; END IF;
END $$;
ROLLBACK;
