-- Sprint 3 — Rate limiting endpoints IA coûteux
-- Stocke un log par appel IA pour comptage glissant sur 1 heure.

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL,
  success     boolean     DEFAULT true,
  tokens_in   integer     DEFAULT NULL,
  tokens_out  integer     DEFAULT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_usage_logs IS
  'Log de chaque appel aux endpoints IA pour rate limiting + audit trail. Sprint 3 MoovX.';

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_endpoint_created
  ON public.ai_usage_logs (user_id, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at
  ON public.ai_usage_logs (created_at);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage logs"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI usage logs"
  ON public.ai_usage_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;
