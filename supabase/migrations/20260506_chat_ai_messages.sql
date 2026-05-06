-- ============================================================
-- ChatAI persistance : 1 conversation continue par client.
-- Retention 30 jours auto-purge via pg_cron.
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_ai_messages (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content       text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index principal : charger les derniers messages d'un user
CREATE INDEX IF NOT EXISTS chat_ai_messages_user_created_idx
  ON chat_ai_messages (user_id, created_at DESC);

-- ============================================================
-- RLS : un client ne lit/ecrit QUE ses propres messages
-- ============================================================

ALTER TABLE chat_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own chat ai messages"
ON chat_ai_messages FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users insert own chat ai messages"
ON chat_ai_messages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own chat ai messages"
ON chat_ai_messages FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Pas de UPDATE policy : les messages sont immutables une fois ecrits.

-- ============================================================
-- Auto-purge : retention 30 jours via pg_cron
-- ============================================================
-- pg_cron doit etre active dans le projet Supabase
-- (Database > Extensions > pg_cron). Si pas active, cette commande
-- echouera mais la migration des autres parties reussira.

DO $
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Daily at 3am UTC
    PERFORM cron.schedule(
      'purge-chat-ai-messages',
      '0 3 * * *',
      $job$
        DELETE FROM chat_ai_messages
        WHERE created_at < now() - interval '30 days'
      $job$
    );
  ELSE
    RAISE NOTICE 'pg_cron extension non installee. Skip cron job creation. Active pg_cron dans Supabase Dashboard > Database > Extensions, puis relance manuellement le bloc cron.schedule.';
  END IF;
END $;

-- ============================================================
-- COMMENT pour documenter intent
-- ============================================================

COMMENT ON TABLE chat_ai_messages IS 'Historique conversation ChatAI client solo. 1 conversation continue par user_id. Retention 30j via pg_cron daily.';
COMMENT ON COLUMN chat_ai_messages.role IS 'user = message du client, assistant = reponse IA Anthropic';
