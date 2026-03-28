-- User badges / gamification
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_type)
);
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own badges" ON user_badges
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
