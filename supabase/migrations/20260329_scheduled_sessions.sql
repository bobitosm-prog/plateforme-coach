-- ═══════════════════════════════════════
-- Scheduled Sessions (Calendar + Reminders)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS scheduled_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('push_a', 'push_b', 'pull_a', 'pull_b', 'legs_a', 'legs_b', 'hiit', 'liss', 'rest', 'custom')),
  scheduled_date date NOT NULL,
  scheduled_time time DEFAULT '08:00',
  duration_min int DEFAULT 60,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  reminder_enabled boolean DEFAULT true,
  reminder_minutes_before int DEFAULT 30,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions" ON scheduled_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_scheduled_sessions_user_date ON scheduled_sessions(user_id, scheduled_date);

-- Profile columns for training preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_training_time time DEFAULT '08:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_minutes_before int DEFAULT 30;
