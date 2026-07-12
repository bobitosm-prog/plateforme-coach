-- Initial application schema baseline.
--
-- The first versioned incremental migration (20260318_messages.sql) already
-- assumed these objects existed. They originated outside the repository's
-- migration history. This additive baseline makes new installations
-- reconstructible while remaining a no-op for existing tables.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text DEFAULT 'client',
  avatar_url text,
  phone text,
  birth_date date,
  gender text,
  height numeric,
  current_weight numeric,
  start_weight numeric,
  target_weight numeric,
  body_fat_pct numeric,
  objective text,
  goal text,
  activity_level text,
  calorie_goal integer,
  protein_goal numeric,
  carbs_goal numeric,
  fat_goal numeric,
  tdee numeric,
  dietary_type text,
  allergies text[],
  liked_foods text[],
  meal_preferences jsonb,
  onboarding_completed boolean NOT NULL DEFAULT false,
  coach_onboarding_complete boolean NOT NULL DEFAULT false,
  coach_speciality text,
  coach_experience_years text,
  subscription_status text,
  subscription_end_date timestamptz,
  stripe_customer_id text,
  stripe_account_id text,
  status text DEFAULT 'active',
  last_workout_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (coach_id, client_id)
);

CREATE TABLE IF NOT EXISTS public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  view_type text DEFAULT 'front',
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meal_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  calories numeric DEFAULT 0,
  proteins numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercises_db (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  muscle_group text,
  equipment text,
  variant_group text,
  created_at timestamptz DEFAULT now()
);

-- Historically created through the Supabase dashboard before the first
-- versioned policy and RPC migrations started depending on it.
CREATE TABLE IF NOT EXISTS public.beta_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  free_days integer NOT NULL CHECK (free_days > 0),
  max_slots integer NOT NULL CHECK (max_slots > 0),
  used_slots integer NOT NULL DEFAULT 0 CHECK (used_slots >= 0),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (used_slots <= max_slots)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_beta_one_active
  ON public.beta_campaigns (is_active)
  WHERE is_active = true;

ALTER TABLE public.beta_campaigns ENABLE ROW LEVEL SECURITY;

-- Financial ledger table also predated its first versioned RLS migration.
-- Its contract is sourced from the canonical REST OpenAPI schema; no rows are seeded.
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES public.profiles(id),
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  completed boolean DEFAULT false,
  duration_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- The two historical scheduled_sessions CREATE TABLE IF NOT EXISTS statements
-- describe different consumers. The baseline carries their compatible union.
CREATE TABLE IF NOT EXISTS public.scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES public.profiles(id),
  client_id uuid REFERENCES public.profiles(id),
  title text,
  session_type text DEFAULT 'Force',
  scheduled_at timestamptz,
  scheduled_date date,
  scheduled_time time DEFAULT '08:00',
  duration_minutes integer DEFAULT 60,
  duration_min integer DEFAULT 60,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  reminder_enabled boolean DEFAULT true,
  reminder_minutes_before integer DEFAULT 30,
  notes text,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  program jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  xp_reward integer NOT NULL DEFAULT 10,
  icon text,
  condition_type text NOT NULL,
  condition_value integer NOT NULL,
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type text,
  badge_id text REFERENCES public.badges(id),
  earned_at timestamptz DEFAULT now(),
  celebrated boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, badge_type)
);

CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  mood text NOT NULL,
  note text,
  sleep_hours numeric(3,1),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type text,
  food_name text,
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  quantity_g numeric DEFAULT 100,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
