-- ============================================================
-- MASTER RLS FIX v2 — Crée les tables manquantes, active RLS,
-- crée les policies. 100% idempotent (IF NOT EXISTS partout).
--
-- COLONNES VÉRIFIÉES DANS LE CODE SOURCE :
--   profiles        → id (PK = auth.uid())
--   exercise_feedback → client_id + coach_id (PAS user_id)
--   training_programs → coach_id (PAS created_by)
--   messages        → sender_id + receiver_id
--   coach_clients   → coach_id + client_id
--   coach_notes     → coach_id + client_id
--   client_programs → coach_id + client_id
--   client_meal_plans → coach_id + client_id
--   payments        → coach_id + client_id
--   activity_feed   → user_id + coach_id
--   scheduled_sessions → user_id (client) + coach_id + client_id (coach)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLES MANQUANTES
-- ────────────────────────────────────────────────────────────

-- client_programs (programme assigné par le coach)
CREATE TABLE IF NOT EXISTS client_programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  program jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- client_meal_plans (plan nutrition assigné par le coach)
CREATE TABLE IF NOT EXISTS client_meal_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- coach_clients (lien coach ↔ client)
CREATE TABLE IF NOT EXISTS coach_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, client_id)
);

-- training_programs (templates — coach_id, pas created_by)
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  program jsonb NOT NULL DEFAULT '{}',
  is_template boolean DEFAULT false,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- user_programs (programme actif d'un utilisateur)
CREATE TABLE IF NOT EXISTS user_programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  training_program_id uuid REFERENCES training_programs(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- custom_programs
CREATE TABLE IF NOT EXISTS custom_programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  days jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT false,
  source text DEFAULT 'manual'
);

-- custom_exercises
CREATE TABLE IF NOT EXISTS custom_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  muscle_group text,
  equipment text,
  description text,
  sets int DEFAULT 3,
  reps int DEFAULT 10,
  rest_seconds int DEFAULT 90,
  image_url text,
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- workout_sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  completed boolean DEFAULT false,
  duration_minutes int,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- workout_sets
CREATE TABLE IF NOT EXISTS workout_sets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES workout_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  set_number int NOT NULL,
  weight numeric(10,2),
  reps int,
  completed boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- weight_logs
CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  poids numeric(5,1) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- body_measurements
CREATE TABLE IF NOT EXISTS body_measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  chest numeric(5,1),
  waist numeric(5,1),
  hips numeric(5,1),
  biceps numeric(5,1),
  thighs numeric(5,1),
  calves numeric(5,1),
  created_at timestamptz DEFAULT now()
);

-- progress_photos
CREATE TABLE IF NOT EXISTS progress_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  view_type text DEFAULT 'front',
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- exercises_db (table de référence — pas de user_id)
CREATE TABLE IF NOT EXISTS exercises_db (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  muscle_group text,
  equipment text,
  description text,
  gif_url text,
  video_url text,
  variant_group text,
  created_at timestamptz DEFAULT now()
);

-- coach_notes (coach_id + client_id, PAS user_id)
CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- exercise_feedback (client_id + coach_id, PAS user_id)
CREATE TABLE IF NOT EXISTS exercise_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  video_url text,
  feedback text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- saved_meals
CREATE TABLE IF NOT EXISTS saved_meals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  meal_type text,
  foods jsonb NOT NULL DEFAULT '[]',
  total_calories numeric,
  total_protein numeric,
  total_carbs numeric,
  total_fat numeric,
  created_at timestamptz DEFAULT now()
);

-- custom_foods
CREATE TABLE IF NOT EXISTS custom_foods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  barcode text,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  serving_size_g numeric DEFAULT 100,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- meal_tracking
CREATE TABLE IF NOT EXISTS meal_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL,
  food_name text,
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  quantity_g numeric DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- meal_plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  plan jsonb NOT NULL DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- daily_habits
CREATE TABLE IF NOT EXISTS daily_habits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  habits jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- food_items (table de référence — pas de user_id)
CREATE TABLE IF NOT EXISTS food_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  brand text,
  source text,
  barcode text,
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  serving_size_g numeric DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- achievements (table de référence — pas de user_id)
CREATE TABLE IF NOT EXISTS achievements (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text,
  condition_type text,
  condition_value int DEFAULT 0,
  xp_reward int DEFAULT 10,
  icon text,
  sort_order int DEFAULT 0
);

-- user_achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text REFERENCES achievements(id),
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- activity_feed (user_id + coach_id)
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- payments (client_id + coach_id, PAS user_id)
CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'CHF',
  status text DEFAULT 'pending',
  stripe_id text,
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. ENABLE RLS SUR TOUTES LES TABLES
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exercises_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exercise_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meal_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS body_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS water_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cardio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS community_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS body_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_xp ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 3A. POLICIES — tables avec user_id
-- ────────────────────────────────────────────────────────────

-- profiles (PK = auth.uid(), colonne "id" pas "user_id")
DO $$ BEGIN CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- weight_logs (user_id)
DO $$ BEGIN CREATE POLICY "weight_logs_own" ON weight_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- workout_sessions (user_id)
DO $$ BEGIN CREATE POLICY "workout_sessions_own" ON workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- workout_sets (user_id)
DO $$ BEGIN CREATE POLICY "workout_sets_own" ON workout_sets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- body_measurements (user_id)
DO $$ BEGIN CREATE POLICY "body_measurements_own" ON body_measurements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- progress_photos (user_id)
DO $$ BEGIN CREATE POLICY "progress_photos_own" ON progress_photos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_programs (user_id)
DO $$ BEGIN CREATE POLICY "user_programs_own" ON user_programs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- custom_programs (user_id)
DO $$ BEGIN CREATE POLICY "custom_programs_own" ON custom_programs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- custom_exercises (user_id)
DO $$ BEGIN CREATE POLICY "custom_exercises_own" ON custom_exercises FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- saved_meals (user_id)
DO $$ BEGIN CREATE POLICY "saved_meals_own" ON saved_meals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- custom_foods (user_id)
DO $$ BEGIN CREATE POLICY "custom_foods_own" ON custom_foods FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- meal_tracking (user_id)
DO $$ BEGIN CREATE POLICY "meal_tracking_own" ON meal_tracking FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- meal_plans (user_id for client, created_by for coach)
DO $$ BEGIN CREATE POLICY "meal_plans_own" ON meal_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "meal_plans_coach" ON meal_plans FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- daily_habits (user_id)
DO $$ BEGIN CREATE POLICY "daily_habits_own" ON daily_habits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_achievements (user_id)
DO $$ BEGIN CREATE POLICY "user_achievements_own" ON user_achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- activity_feed (user_id OR coach_id)
DO $$ BEGIN CREATE POLICY "activity_feed_own" ON activity_feed FOR SELECT USING (auth.uid() = user_id OR auth.uid() = coach_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "activity_feed_insert" ON activity_feed FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = coach_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- body_assessments (user_id)
DO $$ BEGIN CREATE POLICY "body_assessments_own" ON body_assessments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- push_subscriptions (user_id)
DO $$ BEGIN CREATE POLICY "push_subscriptions_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- bug_reports (user_id)
DO $$ BEGIN CREATE POLICY "bug_reports_own" ON bug_reports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- water_intake (user_id)
DO $$ BEGIN CREATE POLICY "water_intake_own" ON water_intake FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_badges (user_id)
DO $$ BEGIN CREATE POLICY "user_badges_own" ON user_badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- recipes (user_id + public)
DO $$ BEGIN CREATE POLICY "recipes_own" ON recipes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "recipes_public_read" ON recipes FOR SELECT USING (is_public = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- cardio_sessions (user_id)
DO $$ BEGIN CREATE POLICY "cardio_sessions_own" ON cardio_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- personal_records (user_id)
DO $$ BEGIN CREATE POLICY "personal_records_own" ON personal_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- daily_food_logs (user_id)
DO $$ BEGIN CREATE POLICY "daily_food_logs_own" ON daily_food_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- body_analyses (user_id)
DO $$ BEGIN CREATE POLICY "body_analyses_own" ON body_analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_xp (user_id)
DO $$ BEGIN CREATE POLICY "user_xp_own" ON user_xp FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- scheduled_sessions (user_id)
DO $$ BEGIN CREATE POLICY "scheduled_sessions_own" ON scheduled_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- 3B. POLICIES — tables coach/client (PAS de user_id)
-- ────────────────────────────────────────────────────────────

-- client_programs (client_id + coach_id)
DO $$ BEGIN CREATE POLICY "client_programs_client_read" ON client_programs FOR SELECT USING (auth.uid() = client_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "client_programs_coach_all" ON client_programs FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- client_meal_plans (client_id + coach_id)
DO $$ BEGIN CREATE POLICY "client_meal_plans_client_read" ON client_meal_plans FOR SELECT USING (auth.uid() = client_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "client_meal_plans_coach_all" ON client_meal_plans FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- coach_clients (coach_id + client_id)
DO $$ BEGIN CREATE POLICY "coach_clients_read" ON coach_clients FOR SELECT USING (auth.uid() = coach_id OR auth.uid() = client_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "coach_clients_manage" ON coach_clients FOR INSERT WITH CHECK (auth.uid() = coach_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- coach_notes (coach_id + client_id)
DO $$ BEGIN CREATE POLICY "coach_notes_coach_all" ON coach_notes FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "coach_notes_client_read" ON coach_notes FOR SELECT USING (auth.uid() = client_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- exercise_feedback (client_id + coach_id — PAS user_id !)
DO $$ BEGIN CREATE POLICY "exercise_feedback_client" ON exercise_feedback FOR ALL USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "exercise_feedback_coach" ON exercise_feedback FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payments (client_id + coach_id)
DO $$ BEGIN CREATE POLICY "payments_client_read" ON payments FOR SELECT USING (auth.uid() = client_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "payments_coach_all" ON payments FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- messages (sender_id + receiver_id — PAS user_id !)
DO $$ BEGIN CREATE POLICY "messages_read_own" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "messages_send" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "messages_mark_read" ON messages FOR UPDATE USING (auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- training_programs (coach_id — lecture publique des templates)
DO $$ BEGIN CREATE POLICY "training_programs_read_templates" ON training_programs FOR SELECT USING (is_template = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "training_programs_coach_all" ON training_programs FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- 3C. POLICIES — tables de référence (lecture publique)
-- ────────────────────────────────────────────────────────────

-- exercises_db (tout le monde peut lire)
DO $$ BEGIN CREATE POLICY "exercises_db_read_all" ON exercises_db FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- badges (tout le monde peut lire)
DO $$ BEGIN CREATE POLICY "badges_read_all" ON badges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- achievements (tout le monde peut lire)
DO $$ BEGIN CREATE POLICY "achievements_read_all" ON achievements FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- food_items (tout le monde peut lire)
DO $$ BEGIN CREATE POLICY "food_items_read_all" ON food_items FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- community_foods (tout le monde peut lire, auth peut insérer)
DO $$ BEGIN CREATE POLICY "community_foods_read_all" ON community_foods FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "community_foods_insert_auth" ON community_foods FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- app_logs (tout le monde peut insérer)
DO $$ BEGIN CREATE POLICY "app_logs_insert_all" ON app_logs FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- 4. VÉRIFICATION
-- ────────────────────────────────────────────────────────────
-- Exécuter après pour vérifier :
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
