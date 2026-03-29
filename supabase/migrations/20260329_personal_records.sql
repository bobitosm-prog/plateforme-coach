-- ═══════════════════════════════════════
-- Personal Records (PR tracking)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS personal_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  record_type text NOT NULL CHECK (record_type IN ('1rm', 'max_reps', 'max_weight', 'best_volume')),
  value numeric(10,2) NOT NULL,
  unit text DEFAULT 'kg',
  achieved_at date DEFAULT CURRENT_DATE,
  previous_value numeric(10,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own records" ON personal_records
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_personal_records_unique ON personal_records(user_id, exercise_name, record_type);
