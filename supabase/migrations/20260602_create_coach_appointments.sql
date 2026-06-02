-- ============================================================
-- Create coach_appointments : RDV planifiés par le coach
-- ============================================================
-- Table dédiée aux rendez-vous coach -> client (séances 1:1
-- planifiées depuis le calendrier coach), DISTINCTE de
-- scheduled_sessions (réservée aux séances de programme du
-- client : user_id / scheduled_date / completed).
--
-- Contexte : saveNewSession insérait coach_id/client_id/
-- scheduled_at/duration_minutes/status dans scheduled_sessions
-- — colonnes absentes de cette table. Ces inserts échouaient
-- silencieusement. Cette table porte le bon schéma.
--
-- coach_id / client_id = auth.users.id (= profiles.id).
-- location : lieu d'entraînement en texte libre (nullable).
--
-- RLS : coach gère ses RDV (auth.uid() = coach_id) ; client lit
-- les RDV où il est client (bannière home client).
--
-- Idempotent : CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS
-- avant CREATE POLICY, CREATE INDEX IF NOT EXISTS, DO $verify$.
-- ============================================================

CREATE TABLE IF NOT EXISTS coach_appointments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at      timestamptz NOT NULL,
  duration_minutes  integer NOT NULL DEFAULT 60,
  session_type      text NOT NULL DEFAULT 'Force',
  location          text,
  notes             text,
  status            text NOT NULL DEFAULT 'scheduled',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_appointments_coach ON coach_appointments (coach_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_coach_appointments_client ON coach_appointments (client_id, scheduled_at);

ALTER TABLE coach_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach manages own appointments" ON coach_appointments;
CREATE POLICY "Coach manages own appointments" ON coach_appointments
  FOR ALL TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Client reads own appointments" ON coach_appointments;
CREATE POLICY "Client reads own appointments" ON coach_appointments
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

DO $verify$
DECLARE
  v_table INT;
  v_policies INT;
BEGIN
  SELECT COUNT(*) INTO v_table FROM information_schema.tables WHERE table_name = 'coach_appointments';
  IF v_table != 1 THEN
    RAISE EXCEPTION 'Migration failed: table coach_appointments not created';
  END IF;
  SELECT COUNT(*) INTO v_policies FROM pg_policies WHERE tablename = 'coach_appointments';
  IF v_policies < 2 THEN
    RAISE EXCEPTION 'Migration failed: expected 2 RLS policies, found %', v_policies;
  END IF;
  RAISE NOTICE 'coach_appointments migration successful: table + % policies', v_policies;
END $verify$;
