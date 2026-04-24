-- Migration: Add completed_sessions table for tracking workouts
-- Session: Coach-Client flow refactor, 2026-04-24

-- ==============================================================
-- TABLE
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.completed_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.client_programs(id) ON DELETE SET NULL,
  session_index INTEGER NOT NULL,
  session_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================
-- COMMENTS
-- ==============================================================

COMMENT ON TABLE public.completed_sessions IS
  'Tracks individual workout sessions completed by clients. Used to display history and suggest next session in cycle.';

COMMENT ON COLUMN public.completed_sessions.session_index IS
  'Zero-based index of the session in the program array. Day 1 = 0, Day 2 = 1, etc.';

COMMENT ON COLUMN public.completed_sessions.session_name IS
  'Denormalized copy of the session name at completion time (e.g. "Jour 1 - Push"). Preserved even if the program is later modified.';

-- ==============================================================
-- INDEXES
-- ==============================================================

CREATE INDEX IF NOT EXISTS idx_completed_sessions_client
  ON public.completed_sessions(client_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_completed_sessions_program
  ON public.completed_sessions(program_id, completed_at DESC);

-- ==============================================================
-- RLS POLICIES
-- ==============================================================

ALTER TABLE public.completed_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "completed_sessions_client_read" ON public.completed_sessions;
CREATE POLICY "completed_sessions_client_read"
  ON public.completed_sessions FOR SELECT
  USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "completed_sessions_coach_read" ON public.completed_sessions;
CREATE POLICY "completed_sessions_coach_read"
  ON public.completed_sessions FOR SELECT
  USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "completed_sessions_client_insert" ON public.completed_sessions;
CREATE POLICY "completed_sessions_client_insert"
  ON public.completed_sessions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- ==============================================================
-- GRANT
-- ==============================================================

GRANT SELECT, INSERT ON public.completed_sessions TO authenticated;

-- ==============================================================
-- NOTIFY
-- ==============================================================

NOTIFY pgrst, 'reload schema';
