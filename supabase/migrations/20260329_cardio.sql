-- Cardio sessions tracking
CREATE TABLE IF NOT EXISTS cardio_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('hiit', 'liss')),
  name text NOT NULL,
  duration_min int NOT NULL,
  calories_burned int,
  exercises jsonb,
  notes text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  scheduled_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cardio" ON cardio_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cardio preferences on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cardio_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cardio_frequency int DEFAULT 2;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cardio_preference text DEFAULT 'hiit';
