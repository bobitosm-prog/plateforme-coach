-- ============================================================================
-- Migration : Create weekly_diagnostics table for AI coach weekly analysis
-- Date      : 2026-05-29
-- Context   : F4d.2 — Phase 5 Weekly AI Diagnostic feature
--             Stores AI-generated weekly performance analyses for clients
-- Reference : Concurrent direct vs KAI Swiss "diagnostic hebdomadaire"
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  
  -- Server pre-analysis (déterministe, calculé avant l'IA)
  adherence_pct numeric(5,2),
  weight_delta_kg numeric(5,2),
  calorie_avg_real numeric(7,2),
  calorie_avg_target numeric(7,2),
  protein_avg_g numeric(6,2),
  protein_compliance_pct numeric(5,2),
  training_volume_total numeric(10,2),
  sessions_done integer,
  sessions_planned integer,
  
  -- AI output JSON structuré (Opus 4.7 via tool_use)
  score_semaine integer CHECK (score_semaine >= 0 AND score_semaine <= 100),
  points_forts jsonb,
  points_alerte jsonb,
  ajustements jsonb,
  exercice_a_ajouter text,
  objectif_semaine_prochaine text,
  raisonnement text,
  
  -- Metadata
  ai_model text DEFAULT 'claude-opus-4-7',
  ai_tokens_used integer,
  applied_at timestamptz,
  applied_changes jsonb,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_diag_user_week 
  ON weekly_diagnostics(user_id, week_start DESC);

-- RLS : users can only read/update their own diagnostics
ALTER TABLE weekly_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own diagnostics"
ON weekly_diagnostics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users update own diagnostics"
ON weekly_diagnostics
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "service role full access"
ON weekly_diagnostics
FOR ALL
USING (auth.role() = 'service_role');

COMMENT ON TABLE weekly_diagnostics IS 
  'AI-generated weekly performance analyses for clients. F4d.2 — Phase 5 Weekly AI Diagnostic.';

COMMENT ON COLUMN weekly_diagnostics.week_start IS 
  'Lundi de la semaine analysée (toujours un lundi)';

COMMENT ON COLUMN weekly_diagnostics.ajustements IS 
  'JSON suggéré par IA : { calorie_goal_new, protein_goal_new, carbs_goal_new, fat_goal_new, training_volume_delta_pct }';

COMMENT ON COLUMN weekly_diagnostics.applied_changes IS 
  'JSON des changements RÉELLEMENT appliqués par user (subset de ajustements). Null si pas encore cliqué Appliquer.';

-- ─── Fix F4d.4 : missing INSERT policy ───
CREATE POLICY "users insert own diagnostics"
ON weekly_diagnostics
FOR INSERT
WITH CHECK (auth.uid() = user_id);
