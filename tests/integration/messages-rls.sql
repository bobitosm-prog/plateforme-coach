\set ON_ERROR_STOP on
\set client '71000000-0000-4000-8000-000000000001'
\set coach '71000000-0000-4000-8000-000000000002'
\set invited '71000000-0000-4000-8000-000000000003'
\set second_client '71000000-0000-4000-8000-000000000006'
\set second_coach '71000000-0000-4000-8000-000000000007'
BEGIN;
CREATE SCHEMA IF NOT EXISTS test;
CREATE OR REPLACE FUNCTION test.message_assert(actual bigint, expected bigint, scenario text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'MESSAGES_RLS_FAILED [%]: expected %, got %',scenario,expected,actual; END IF; RAISE NOTICE 'MESSAGES_RLS_OK [%]',scenario; END $$;
CREATE OR REPLACE FUNCTION test.message_exec(statement text) RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER AS $$ DECLARE affected bigint; BEGIN EXECUTE statement; GET DIAGNOSTICS affected=ROW_COUNT; RETURN affected; END $$;
CREATE OR REPLACE FUNCTION test.message_denied(statement text, scenario text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege OR check_violation OR unique_violation OR foreign_key_violation THEN RAISE NOTICE 'MESSAGES_RLS_OK [%]',scenario; RETURN; END; RAISE EXCEPTION 'MESSAGES_RLS_FAILED [%]: unexpectedly succeeded',scenario; END $$;
GRANT USAGE ON SCHEMA test TO anon,authenticated,service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test TO anon,authenticated,service_role;
SELECT test.seed_personas();
SELECT test.set_persona_relation('coach','client','active');
SELECT test.set_persona_relation('secondCoach','secondClient','inactive');
INSERT INTO public.coach_clients(coach_id,client_id,status) VALUES (:'coach',:'invited','active');
INSERT INTO public.messages(id,sender_id,receiver_id,content,image_url) VALUES ('75000000-0000-4000-8000-000000000001',:'coach',:'client','fixture','messages/fixture.jpg'),('75000000-0000-4000-8000-000000000002',:'second_coach',:'second_client','inactive',NULL);
SELECT test.message_assert((SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='messages'),3,'catalog/exact-three-policies');
SELECT test.message_assert((SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND cmd='ALL'),0,'catalog/no-for-all');
SELECT test.message_assert(has_table_privilege('anon','public.messages','SELECT')::int,0,'catalog/anon-no-access');
SELECT test.message_assert(has_table_privilege('authenticated','public.messages','DELETE')::int,0,'catalog/auth-no-delete');
SELECT test.message_assert(has_column_privilege('authenticated','public.messages','read','UPDATE')::int,1,'catalog/read-update');
SELECT test.message_assert(has_column_privilege('authenticated','public.messages','content','UPDATE')::int,0,'catalog/immutable-columns');
SET LOCAL ROLE anon; SELECT test.message_denied('SELECT id FROM public.messages','anon/read'); RESET ROLE;
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub',:'client',true);
SELECT test.message_assert((SELECT count(*) FROM public.messages),1,'client/read-active');
SELECT test.message_assert(test.message_exec('INSERT INTO public.messages(sender_id,receiver_id,content) VALUES ('''||:'client'||''','''||:'coach'||''',''client-coach'')'),1,'client/insert-active');
SELECT test.message_denied('INSERT INTO public.messages(sender_id,receiver_id,content) VALUES ('''||:'client'||''','''||:'second_client'||''',''client-client'')','client/client-pair-denied');
SELECT test.message_denied('INSERT INTO public.messages(sender_id,receiver_id,content) VALUES ('''||:'coach'||''','''||:'client'||''',''injected'')','client/sender-injected');
SELECT test.message_denied('INSERT INTO public.messages(sender_id,receiver_id,content) VALUES ('''||:'client'||''','''||:'second_coach'||''',''foreign'')','client/foreign-receiver');
SELECT test.message_assert(test.message_exec('UPDATE public.messages SET read=true WHERE id=''75000000-0000-4000-8000-000000000001'''),1,'client/mark-read');
SELECT test.message_denied('UPDATE public.messages SET content=''changed'' WHERE id=''75000000-0000-4000-8000-000000000001''','client/content-immutable');
SELECT test.message_denied('UPDATE public.messages SET image_url=''changed'' WHERE id=''75000000-0000-4000-8000-000000000001''','client/image-immutable');
SELECT test.message_denied('UPDATE public.messages SET sender_id='''||:'client'||''' WHERE id=''75000000-0000-4000-8000-000000000001''','client/sender-immutable');
SELECT test.message_denied('UPDATE public.messages SET receiver_id='''||:'coach'||''' WHERE id=''75000000-0000-4000-8000-000000000001''','client/receiver-immutable');
SELECT test.message_denied('UPDATE public.messages SET created_at=now() WHERE id=''75000000-0000-4000-8000-000000000001''','client/timestamp-immutable');
SELECT test.message_denied('DELETE FROM public.messages','client/delete-denied'); RESET ROLE;
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub',:'coach',true);
SELECT test.message_assert((SELECT count(*) FROM public.messages),2,'coach/read-active');
SELECT test.message_assert(test.message_exec('INSERT INTO public.messages(sender_id,receiver_id,content) VALUES ('''||:'coach'||''','''||:'client'||''',''coach-client'')'),1,'coach/insert-active');
SELECT test.message_denied('INSERT INTO public.messages(sender_id,receiver_id,content) VALUES ('''||:'coach'||''','''||:'second_coach'||''',''coach-coach'')','coach/coach-pair-denied');
SELECT test.message_assert(test.message_exec('UPDATE public.messages SET read=true WHERE sender_id='''||:'coach'||''' AND receiver_id='''||:'client'||''''),0,'coach/sender-cannot-mark-read'); RESET ROLE;
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub',:'second_coach',true);
SELECT test.message_assert((SELECT count(*) FROM public.messages),0,'inactive/read-denied');
SELECT test.message_denied('INSERT INTO public.messages(sender_id,receiver_id,content) VALUES ('''||:'second_coach'||''','''||:'second_client'||''',''inactive'')','inactive/insert-denied'); RESET ROLE;
SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub',:'invited',true);
SELECT test.message_assert((SELECT count(*) FROM public.messages),0,'invited/read-denied');
SELECT test.message_denied('INSERT INTO public.messages(sender_id,receiver_id,content) VALUES ('''||:'invited'||''','''||:'coach'||''',''invited'')','invited/insert-denied'); RESET ROLE;
SET LOCAL ROLE service_role;
SELECT test.message_assert(test.message_exec('INSERT INTO public.messages(sender_id,receiver_id,content) VALUES ('''||:'second_coach'||''','''||:'second_client'||''',''server'')'),1,'service/insert');
SELECT test.message_assert(test.message_exec('UPDATE public.messages SET content=''server-updated'' WHERE content=''server'''),1,'service/update');
SELECT test.message_assert(test.message_exec('DELETE FROM public.messages WHERE content=''server-updated'''),1,'service/delete'); RESET ROLE;
ROLLBACK;
SELECT 'Messages RLS matrix completed' AS result;
