\set ON_ERROR_STOP on
\set client '71000000-0000-4000-8000-000000000001'
\set coach '71000000-0000-4000-8000-000000000002'
\set second_client '71000000-0000-4000-8000-000000000006'
\set invited '71000000-0000-4000-8000-000000000003'

BEGIN;
CREATE SCHEMA IF NOT EXISTS test;
CREATE OR REPLACE FUNCTION test.ai_usage_assert(actual boolean, scenario text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF actual IS NOT TRUE THEN RAISE EXCEPTION 'AI_USAGE_FAILED [%]', scenario; END IF; RAISE NOTICE 'AI_USAGE_OK [%]', scenario; END $$;
CREATE OR REPLACE FUNCTION test.ai_usage_denied(statement text, scenario text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege OR check_violation THEN RAISE NOTICE 'AI_USAGE_OK [%]', scenario; RETURN; END; RAISE EXCEPTION 'AI_USAGE_FAILED [%]: unexpectedly succeeded', scenario; END $$;
GRANT USAGE ON SCHEMA test TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test TO anon, authenticated, service_role;
SELECT test.seed_personas();
DELETE FROM public.ai_usage_logs WHERE user_id IN (:'client', :'coach');

SELECT test.ai_usage_assert(NOT has_table_privilege('anon','public.ai_usage_logs','SELECT'), 'anon/no-table-access');
SELECT test.ai_usage_assert(NOT has_table_privilege('authenticated','public.ai_usage_logs','INSERT'), 'authenticated/no-direct-insert');
SELECT test.ai_usage_assert(NOT has_table_privilege('authenticated','public.ai_usage_logs','UPDATE'), 'authenticated/no-direct-update');
SELECT test.ai_usage_assert(NOT has_table_privilege('authenticated','public.ai_usage_logs','DELETE'), 'authenticated/no-direct-delete');
SELECT test.ai_usage_assert(has_function_privilege('authenticated','public.reserve_ai_usage(text,text,text)','EXECUTE'), 'authenticated/user-reserve-rpc');
SELECT test.ai_usage_assert(NOT has_function_privilege('authenticated','public.reserve_ai_usage_server(uuid,text,text,text,text)','EXECUTE'), 'authenticated/no-server-reserve-rpc');
SELECT test.ai_usage_assert(has_function_privilege('service_role','public.reserve_ai_usage_server(uuid,text,text,text,text)','EXECUTE'), 'service/server-reserve-rpc');

SET LOCAL ROLE anon;
SELECT test.ai_usage_denied('SELECT id FROM public.ai_usage_logs', 'anon/read-denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'client', true);
SELECT test.ai_usage_denied('INSERT INTO public.ai_usage_logs(user_id,endpoint) VALUES ('''||:'client'||''',''chat-ai'')', 'authenticated/direct-insert-denied');
CREATE TEMP TABLE usage_result AS SELECT public.reserve_ai_usage('chat-ai','rpc-sequential-1','anthropic-sonnet-4.6') value;
SELECT test.ai_usage_assert((SELECT value->>'status' = 'allowed' FROM usage_result), 'reserve/allowed');
SELECT test.ai_usage_assert((public.reserve_ai_usage('chat-ai','rpc-sequential-1','anthropic-sonnet-4.6')->>'idempotent')::boolean, 'reserve/idempotent');
SELECT test.ai_usage_assert(public.reserve_ai_usage('suggest-exercise','rpc-sequential-1','anthropic-sonnet-4.6')->>'status' = 'conflict', 'reserve/correlation-conflict');
CREATE TEMP TABLE finalize_result AS
SELECT public.finalize_ai_usage(
  (SELECT (value->>'reservationId')::uuid FROM usage_result), 'rpc-sequential-1', 'chat-ai', 'ai.chat-ai.v1',
  'success', 'completed', 'anthropic-sonnet-4.6', 'claude-sonnet-4-6', 0, 12, 10, 1, 42, 'complete'
) value;
SELECT test.ai_usage_assert((SELECT value->>'status' = 'finalized' FROM finalize_result), 'finalize/success');
SELECT test.ai_usage_assert((public.finalize_ai_usage(
  (SELECT (value->>'reservationId')::uuid FROM usage_result), 'rpc-sequential-1', 'chat-ai', 'ai.chat-ai.v1',
  'success', 'completed', 'anthropic-sonnet-4.6', 'claude-sonnet-4-6', 0, 12, 10, 1, 42, 'complete'
)->>'idempotent')::boolean, 'finalize/idempotent');
SELECT test.ai_usage_assert(public.finalize_ai_usage(
  (SELECT (value->>'reservationId')::uuid FROM usage_result), 'rpc-sequential-1', 'chat-ai', 'ai.chat-ai.v1',
  'failed', 'provider_error', 'anthropic-sonnet-4.6', NULL, NULL, NULL, 10, 1, NULL, 'unavailable'
)->>'status' = 'conflict', 'finalize/contradiction');
RESET ROLE;

SELECT test.ai_usage_assert((SELECT tokens_in = 0 AND tokens_out = 12 AND total_tokens = 12 AND estimated_cost_micros = 42 FROM public.ai_usage_logs WHERE correlation_id='rpc-sequential-1'), 'metadata/zero-distinct-from-null');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'client', true);
CREATE TEMP TABLE failed_reservation AS SELECT public.reserve_ai_usage('generate-recipe','rpc-failed-1','claude-haiku-4-5-20251001') value;
SELECT test.ai_usage_assert(public.finalize_ai_usage((SELECT (value->>'reservationId')::uuid FROM failed_reservation),'rpc-failed-1','generate-recipe','ai.generate-recipe.v1','failed','provider_error','claude-haiku-4-5-20251001',NULL,NULL,NULL,1,1,NULL,'unavailable')->>'status'='finalized','finalize/failed');
CREATE TEMP TABLE cancelled_reservation AS SELECT public.reserve_ai_usage('adapt-workout','rpc-cancelled-1','claude-sonnet-4-6') value;
SELECT test.ai_usage_assert(public.finalize_ai_usage((SELECT (value->>'reservationId')::uuid FROM cancelled_reservation),'rpc-cancelled-1','adapt-workout','ai.adapt-workout.v1','cancelled','client_cancelled','claude-sonnet-4-6',NULL,NULL,NULL,1,1,NULL,'unavailable')->>'status'='finalized','finalize/cancelled');
RESET ROLE;
SELECT test.ai_usage_denied('INSERT INTO public.ai_usage_logs(user_id,endpoint,tokens_in) VALUES ('''||:'client'||''',''invalid'',-1)', 'constraints/negative-token-denied');
SELECT test.ai_usage_assert(public.reserve_ai_usage_internal(:'coach','server','cron.training','weekly-diagnostic-cron','rpc-server-1','anthropic-haiku-4.5')->>'status' = 'allowed', 'service/internal-reserve');
SET LOCAL ROLE service_role;
SELECT test.ai_usage_assert(public.reserve_ai_usage_server(:'coach','cron.training','training-regen','rpc-service-role-1','claude-opus-4-8')->>'status'='allowed','service/reserve');
RESET ROLE;
SELECT test.ai_usage_assert(public.reserve_ai_usage_internal(:'client','user',:'client','chat-ai','rpc-invalid-model',repeat('x',257))->>'status' = 'unavailable', 'validation/bounded-model');

INSERT INTO public.ai_usage_logs(user_id,endpoint,success)
SELECT :'second_client','chat-ai',true FROM generate_series(1,20);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'second_client', true);
SELECT test.ai_usage_assert(public.reserve_ai_usage('chat-ai','rpc-legacy-hourly','claude-sonnet-4-6')->>'status'='denied','legacy/hourly-lines-count');
RESET ROLE;

INSERT INTO public.ai_usage_logs(user_id,endpoint,success)
SELECT :'invited', CASE WHEN i % 2 = 0 THEN 'analyze-body' ELSE 'generate-meal-plan' END, true FROM generate_series(1,6) i;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'invited', true);
CREATE TEMP TABLE monthly_result AS SELECT public.reserve_ai_usage('analyze-progress-photo','rpc-legacy-monthly','claude-opus-4-8') value;
SELECT test.ai_usage_assert((SELECT value->>'reason'='monthly_exhausted' AND (value->>'retryAfterMs')::bigint BETWEEN 1 AND 2592000000 FROM monthly_result),'legacy/monthly-heavy-lines-count-and-reset');
RESET ROLE;

INSERT INTO public.ai_usage_logs(user_id,endpoint,success,correlation_id,feature,policy_id,usage_status,principal_kind,principal_id,reserved_at,expires_at,logical_model)
VALUES (:'client','chat-ai',false,'rpc-expired','chat-ai','ai.chat-ai.v1','reserved','user',:'client',now()-interval '2 hours',now()-interval '1 hour','anthropic-sonnet-4.6');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'client', true);
SELECT test.ai_usage_assert(public.reserve_ai_usage('chat-ai','rpc-after-expiry','anthropic-sonnet-4.6')->>'status' = 'allowed', 'reserve/expired-does-not-count');
RESET ROLE;

ROLLBACK;
SELECT 'AI usage RPC/RLS matrix completed' AS result;
