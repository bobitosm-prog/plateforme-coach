begin;
create table if not exists public.cardio_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null check (char_length(workout_id) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, workout_id)
);
alter table public.cardio_favorites enable row level security;
revoke all on public.cardio_favorites from public, anon, authenticated;
grant select, insert, delete on public.cardio_favorites to authenticated;
drop policy if exists cardio_favorites_own_read on public.cardio_favorites;
create policy cardio_favorites_own_read on public.cardio_favorites for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists cardio_favorites_own_insert on public.cardio_favorites;
create policy cardio_favorites_own_insert on public.cardio_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists cardio_favorites_own_delete on public.cardio_favorites;
create policy cardio_favorites_own_delete on public.cardio_favorites for delete to authenticated using ((select auth.uid()) = user_id);
commit;
