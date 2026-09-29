BEGIN;
-- Durable receipt only; no entitlement side effects. Deploy behind disabled flags.
CREATE TABLE IF NOT EXISTS public.apple_notification_inbox (
  environment text NOT NULL CHECK (environment IN ('Production','Sandbox')),
  notification_id uuid NOT NULL,
  notification_type text NOT NULL CHECK (notification_type ~ '^[A-Z0-9_]{1,64}$'),
  subtype text CHECK (subtype ~ '^[A-Z0-9_]{1,64}$'),
  signed_ms bigint NOT NULL CHECK (signed_ms > 0 AND signed_ms < 8640000000000000),
  signed_payload text NOT NULL CHECK (octet_length(signed_payload) BETWEEN 1 AND 131072),
  received_at timestamptz NOT NULL DEFAULT now(),
  processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','test_received')),
  PRIMARY KEY (environment, notification_id),
  CHECK ((notification_type = 'TEST' AND processing_status = 'test_received')
    OR (notification_type <> 'TEST' AND processing_status = 'pending'))
);
CREATE INDEX IF NOT EXISTS apple_notification_inbox_pending_idx
  ON public.apple_notification_inbox(environment, received_at) WHERE processing_status = 'pending';
ALTER TABLE public.apple_notification_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apple_notification_inbox FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.apple_notification_inbox FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.apple_notification_inbox TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_apple_notification(
  p_environment text, p_notification_id uuid, p_notification_type text,
  p_subtype text, p_signed_ms bigint, p_signed_payload text
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_inserted integer;
  v_existing public.apple_notification_inbox%ROWTYPE;
BEGIN
  INSERT INTO public.apple_notification_inbox(environment, notification_id, notification_type,
    subtype, signed_ms, signed_payload, processing_status)
  VALUES (p_environment, p_notification_id, p_notification_type, p_subtype, p_signed_ms, p_signed_payload,
    CASE WHEN p_notification_type = 'TEST' THEN 'test_received' ELSE 'pending' END)
  ON CONFLICT (environment, notification_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 1 THEN RETURN 'inserted'; END IF;
  SELECT * INTO STRICT v_existing FROM public.apple_notification_inbox
    WHERE environment = p_environment AND notification_id = p_notification_id;
  IF v_existing.signed_payload IS DISTINCT FROM p_signed_payload
    OR v_existing.notification_type IS DISTINCT FROM p_notification_type
    OR v_existing.subtype IS DISTINCT FROM p_subtype
    OR v_existing.signed_ms IS DISTINCT FROM p_signed_ms THEN
    RAISE EXCEPTION 'APPLE_NOTIFICATION_CONFLICT';
  END IF;
  RETURN 'duplicate';
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_apple_notification(text,uuid,text,text,bigint,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_apple_notification(text,uuid,text,text,bigint,text) TO service_role;
COMMIT;
