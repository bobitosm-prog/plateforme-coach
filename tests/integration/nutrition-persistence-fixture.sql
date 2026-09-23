-- Disposable local test database ONLY. Not an application migration.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT;
GRANT authenticated TO authenticator;
GRANT service_role, anon TO authenticator;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
$$;
GRANT USAGE ON SCHEMA public, auth TO authenticated;
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, role text, status text, subscription_type text,
  subscription_status text, subscription_end_date timestamptz,
  subscription_price numeric, trial_ends_at timestamptz,
  calorie_goal numeric, protein_goal numeric,
  carbs_goal numeric, fat_goal numeric, tdee numeric,
  current_weight numeric, height numeric, birth_date date,
  gender text, objective text, activity_level text, meal_preferences jsonb,
  updated_at timestamptz DEFAULT clock_timestamp(), dietary_type text, allergies text[]
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_own ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
-- Journal composer fixture: existing production column contract and owner isolation.
CREATE TABLE IF NOT EXISTS public.daily_food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  date date NOT NULL, meal_type text NOT NULL, custom_name text,
  quantity_g numeric, calories numeric, protein numeric, carbs numeric, fat numeric
);
ALTER TABLE public.daily_food_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_logs_own ON public.daily_food_logs;
CREATE POLICY daily_logs_own ON public.daily_food_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_food_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
CREATE TABLE public.ai_usage_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id),
 endpoint text NOT NULL, success boolean DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY usage_own_read ON public.ai_usage_logs FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY usage_own_insert ON public.ai_usage_logs FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id);
GRANT SELECT,INSERT ON public.ai_usage_logs TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ai_usage_logs TO service_role;
CREATE FUNCTION public.get_my_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
CREATE POLICY profiles_select_role ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.get_my_role() = 'super_admin');
-- Match the existing production timestamp trigger, before hardening is applied.
CREATE FUNCTION public.update_profiles_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();
CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_data jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY meal_plans_own ON public.meal_plans FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
CREATE SCHEMA canonical;
GRANT USAGE ON SCHEMA canonical TO authenticated;
CREATE VIEW canonical.profiles WITH (security_invoker=true) AS SELECT * FROM public.profiles;
GRANT SELECT ON canonical.profiles TO authenticated;
CREATE TABLE canonical.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE canonical.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY meal_plans_own ON canonical.meal_plans FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON canonical.meal_plans TO authenticated;
