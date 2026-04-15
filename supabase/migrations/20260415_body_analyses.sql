-- Body AI analyses table
CREATE TABLE IF NOT EXISTS body_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  body_fat_estimate FLOAT,
  lean_mass_estimate FLOAT,
  strengths TEXT[],
  improvements TEXT[],
  symmetry_score INT,
  summary TEXT,
  photos_used INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE body_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own analyses" ON body_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON body_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
