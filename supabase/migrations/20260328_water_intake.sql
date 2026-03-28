-- Water intake tracking
CREATE TABLE IF NOT EXISTS water_intake (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml int NOT NULL,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own water" ON water_intake
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Streak and water goal fields on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_current int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_best int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_last_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS water_goal int DEFAULT 3000;
