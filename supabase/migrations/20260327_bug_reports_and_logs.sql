-- Bug reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  user_role text,
  type text NOT NULL CHECK (type IN ('bug', 'amelioration', 'autre')),
  title text NOT NULL,
  description text NOT NULL,
  screenshot_url text,
  page_url text,
  status text DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en_cours', 'resolu', 'rejete')),
  priority text DEFAULT 'normal' CHECK (priority IN ('basse', 'normal', 'haute', 'critique')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert bug reports" ON bug_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own bug reports" ON bug_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin full access bug reports" ON bug_reports FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- App logs table
CREATE TABLE IF NOT EXISTS app_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  message text NOT NULL,
  details jsonb,
  user_id uuid,
  user_email text,
  page_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view logs" ON app_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Anyone can insert logs" ON app_logs FOR INSERT TO authenticated WITH CHECK (true);
