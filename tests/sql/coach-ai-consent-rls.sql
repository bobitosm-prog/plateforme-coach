-- Isolated synthetic users only. Test fixture permissions mirror production.
begin;
grant select on public.coach_clients to authenticated;
alter table public.coach_clients enable row level security;
create policy coach_consent_fixture_read on public.coach_clients for select to authenticated
 using (coach_id = auth.uid() or client_id = auth.uid());
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002');
insert into public.ai_consents(user_id,version,granted)
 values ('00000000-0000-4000-8000-000000000002','anthropic-2026-10-04-v1',true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001"}',true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if exists(select from public.ai_consents) then raise exception 'unrelated consent leaked'; end if;
end $$;
reset role;
insert into public.coach_clients(coach_id,client_id,status,source)
 values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','active','invitation');
set local role authenticated;
do $$ declare changed integer; begin
 if (select count(*) from public.ai_consents) <> 1 then raise exception 'authorized coach cannot read'; end if;
 update public.ai_consents set granted=false where user_id='00000000-0000-4000-8000-000000000002';
 get diagnostics changed = row_count;
 if changed<>0 then raise exception 'coach changed client consent'; end if;
 begin
   perform public.set_ai_consent(false,'anthropic-2026-10-04-v1','00000000-0000-4000-8000-000000000002');
   raise exception 'coach used client RPC';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.coach_clients set source='legacy' where client_id='00000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
 if exists(select from public.ai_consents) then raise exception 'legacy relationship leaked consent'; end if;
end $$;
reset role;
update public.coach_clients set source='default' where client_id='00000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
 if exists(select from public.ai_consents) then raise exception 'default relationship leaked consent'; end if;
end $$;
reset role;
update public.coach_clients set source='admin' where client_id='00000000-0000-4000-8000-000000000002';
update public.ai_consents set granted=false where user_id='00000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
 if (select count(*) from public.ai_consents) <> 1 or (select granted from public.ai_consents) then raise exception 'withdrawal not visible'; end if;
end $$;
reset role;
update public.coach_clients set status='ended' where client_id='00000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
 if exists(select from public.ai_consents) then raise exception 'ended relationship leaked consent'; end if;
end $$;
rollback;
