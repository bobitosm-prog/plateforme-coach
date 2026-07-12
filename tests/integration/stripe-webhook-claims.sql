\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  result text;
  finalized boolean;
  row_state record;
BEGIN
  result := public.claim_stripe_webhook_event('evt_rpc_claim', 'checkout.session.completed', '{"id":"cs_1"}'::jsonb);
  ASSERT result = 'claimed', format('expected claimed, got %s', result);

  result := public.claim_stripe_webhook_event('evt_rpc_claim', 'checkout.session.completed', '{"id":"cs_1"}'::jsonb);
  ASSERT result = 'already_processing', format('expected already_processing, got %s', result);

  finalized := public.finalize_stripe_webhook_event('evt_rpc_claim', 'failed', 'transient');
  ASSERT finalized;

  result := public.claim_stripe_webhook_event('evt_rpc_claim', 'checkout.session.completed', '{"id":"cs_1"}'::jsonb);
  ASSERT result = 'claimed_retry', format('expected claimed_retry, got %s', result);

  SELECT processing_status, attempt_count INTO row_state
  FROM public.stripe_webhook_events WHERE event_id = 'evt_rpc_claim';
  ASSERT row_state.processing_status = 'processing';
  ASSERT row_state.attempt_count = 2;

  finalized := public.finalize_stripe_webhook_event('evt_rpc_claim', 'success', NULL);
  ASSERT finalized;
  result := public.claim_stripe_webhook_event('evt_rpc_claim', 'checkout.session.completed', '{}'::jsonb);
  ASSERT result = 'already_success', format('expected already_success, got %s', result);

  result := public.claim_stripe_webhook_event('evt_rpc_skipped', 'payment_intent.created', '{}'::jsonb);
  ASSERT result = 'claimed';
  finalized := public.finalize_stripe_webhook_event('evt_rpc_skipped', 'skipped', NULL);
  ASSERT finalized;
  result := public.claim_stripe_webhook_event('evt_rpc_skipped', 'payment_intent.created', '{}'::jsonb);
  ASSERT result = 'already_skipped', format('expected already_skipped, got %s', result);

  ASSERT NOT public.finalize_stripe_webhook_event('evt_rpc_claim', 'failed', 'late writer');
END
$$;

ROLLBACK;
