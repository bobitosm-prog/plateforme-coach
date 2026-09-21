begin;
create table if not exists public.training_followup_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 enabled boolean not null default false,
 monthly_review boolean not null default false,
 advanced_techniques boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.training_followup_preferences enable row level security;
revoke all on public.training_followup_preferences from public,anon,authenticated;
grant select on public.training_followup_preferences to authenticated;
grant all on public.training_followup_preferences to service_role;
drop policy if exists followup_owner_read on public.training_followup_preferences;
create policy followup_owner_read on public.training_followup_preferences for select to authenticated
 using ((select auth.uid())=user_id);
drop policy if exists followup_service on public.training_followup_preferences;
create policy followup_service on public.training_followup_preferences for all to service_role using(true) with check(true);
commit;
