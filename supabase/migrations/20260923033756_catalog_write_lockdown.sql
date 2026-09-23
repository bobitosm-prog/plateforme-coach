begin;
-- The shared catalog has no browser-side write workflow. Custom exercises and
-- coach programs use their own tables; authorized server maintenance is kept.
alter table public.exercises_db enable row level security;
revoke all on public.exercises_db, public.exercises_catalog from public, anon, authenticated;
grant select on public.exercises_db, public.exercises_catalog to anon, authenticated;
grant select, insert, update, delete on public.exercises_db to service_role;
grant select on public.exercises_catalog to service_role;
drop policy if exists "coaches can insert" on public.exercises_db;
drop policy if exists "coaches can update own" on public.exercises_db;
-- Defense in depth if a future migration accidentally restores write grants.
drop policy if exists catalog_browser_insert_denied on public.exercises_db;
create policy catalog_browser_insert_denied on public.exercises_db as restrictive for insert to anon, authenticated with check(false);
drop policy if exists catalog_browser_update_denied on public.exercises_db;
create policy catalog_browser_update_denied on public.exercises_db as restrictive for update to anon, authenticated using(false) with check(false);
drop policy if exists catalog_browser_delete_denied on public.exercises_db;
create policy catalog_browser_delete_denied on public.exercises_db as restrictive for delete to anon, authenticated using(false);
commit;
