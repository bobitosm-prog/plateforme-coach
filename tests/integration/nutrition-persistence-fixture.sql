-- Disposable local test database ONLY. Not an application migration.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE authenticator LOGIN NOINHERIT;
GRANT authenticated TO authenticator;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
$$;
GRANT USAGE ON SCHEMA public, auth TO authenticated;
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, calorie_goal numeric, protein_goal numeric,
  carbs_goal numeric, fat_goal numeric, tdee numeric,
  current_weight numeric, height numeric, birth_date date,
  gender text, objective text, activity_level text, meal_preferences jsonb
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_own ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
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
