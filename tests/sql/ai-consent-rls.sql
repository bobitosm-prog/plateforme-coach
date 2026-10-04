-- Run only against an isolated fixture database with two synthetic auth users.
-- All writes are rolled back. Tests exercise Postgres permissions, not mocks.
begin;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001"}', true);
select public.set_ai_consent(true, 'anthropic-2026-10-04-v1', '00000000-0000-4000-8000-000000000001');
do $$ begin
 if not (select granted from public.ai_consents) then raise exception 'acceptance lost'; end if;
 if (select count(*) from public.ai_consents) <> 1 then raise exception 'own row unreadable'; end if;
 begin
   perform public.set_ai_consent(true, 'anthropic-2026-10-04-v1', '00000000-0000-4000-8000-000000000002');
   raise exception 'other user accepted';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.ai_consents(user_id, version, granted) values ('00000000-0000-4000-8000-000000000002', 'anthropic-2026-10-04-v1', true);
   raise exception 'RLS insert bypass';
 exception when insufficient_privilege then null; end;
 begin
   update public.ai_consents set changed_at = '2000-01-01';
   raise exception 'forged timestamp';
 exception when insufficient_privilege then null; end;
 begin
   update public.ai_consents set user_id = '00000000-0000-4000-8000-000000000002';
   raise exception 'ownership reassigned';
 exception when insufficient_privilege then null; end;
 begin
   perform public.set_ai_consent(true, 'obsolete-version', '00000000-0000-4000-8000-000000000001');
   raise exception 'obsolete policy accepted';
 exception when invalid_parameter_value then null; end;
end $$;
select public.set_ai_consent(false, 'anthropic-2026-10-04-v1', '00000000-0000-4000-8000-000000000001');
do $$ begin
 if (select granted from public.ai_consents) then raise exception 'withdrawal lost'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002"}', true);
do $$ declare affected integer; begin
 if (select count(*) from public.ai_consents) <> 0 then raise exception 'other consent leaked'; end if;
 update public.ai_consents set granted = true where user_id = '00000000-0000-4000-8000-000000000001';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'other consent changed'; end if;
end $$;
set local role anon;
do $$ begin
 begin
   perform * from public.ai_consents;
   raise exception 'anon read allowed';
 exception when insufficient_privilege then null; end;
 begin
   perform public.set_ai_consent(true, 'anthropic-2026-10-04-v1', '00000000-0000-4000-8000-000000000001');
   raise exception 'anon grant allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
do $$ begin
 if (select count(*) from public.ai_consents) <> 1 then raise exception 'cron cannot read consent'; end if;
 if (select granted from public.ai_consents) then raise exception 'cron sees stale consent'; end if;
end $$;
rollback;
