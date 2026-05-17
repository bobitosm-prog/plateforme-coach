-- Table de dédup des events Stripe pour idempotence
-- Stripe peut envoyer le même event.id plusieurs fois (retries jusqu'à 3 jours)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB,
  processing_status TEXT NOT NULL DEFAULT 'success' CHECK (processing_status IN ('success', 'failed', 'skipped')),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON public.stripe_webhook_events(processed_at DESC);

-- RLS: seul le service role peut lire/écrire (webhook = côté serveur uniquement)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Dédup des events Stripe webhook. event_id est UNIQUE pour garantir idempotence.';
