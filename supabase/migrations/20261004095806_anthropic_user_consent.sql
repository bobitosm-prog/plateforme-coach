-- No existing user is opted in. An absent row is a refusal at the provider gate.
create table if not exists public.ai_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'anthropic' check (provider = 'anthropic'),
  version text not null,
  granted boolean not null default false,
  changed_at timestamptz not null default now()
);
alter table public.ai_consents enable row level security;
revoke all on public.ai_consents from public, anon, authenticated, service_role;
grant select on public.ai_consents to authenticated;
grant insert (user_id, version, granted), update (version, granted) on public.ai_consents to authenticated;
grant select on public.ai_consents to service_role;

drop policy if exists ai_consents_read_own on public.ai_consents;
create policy ai_consents_read_own on public.ai_consents for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists ai_consents_insert_own on public.ai_consents;
create policy ai_consents_insert_own on public.ai_consents for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists ai_consents_update_own on public.ai_consents;
create policy ai_consents_update_own on public.ai_consents for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.stamp_ai_consent()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.changed_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.stamp_ai_consent() from public, anon, authenticated;
drop trigger if exists stamp_ai_consent on public.ai_consents;
create trigger stamp_ai_consent before insert or update on public.ai_consents
  for each row execute function public.stamp_ai_consent();

create or replace function public.set_ai_consent(p_granted boolean, p_version text, p_expected_user_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_expected_user_id then
    raise exception 'account_changed' using errcode = '42501';
  end if;
  if p_version is distinct from 'anthropic-2026-10-04-v1' or p_granted is null then
    raise exception 'invalid_consent' using errcode = '22023';
  end if;
  insert into public.ai_consents(user_id, version, granted)
    values (auth.uid(), p_version, p_granted)
    on conflict (user_id) do update set version = excluded.version, granted = excluded.granted;
end;
$$;
revoke all on function public.set_ai_consent(boolean, text, uuid) from public, anon;
grant execute on function public.set_ai_consent(boolean, text, uuid) to authenticated;
