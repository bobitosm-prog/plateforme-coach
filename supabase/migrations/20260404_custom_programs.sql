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

ALTER TABLE custom_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own programs" ON custom_programs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own exercises" ON custom_exercises FOR ALL USING (auth.uid() = user_id);
