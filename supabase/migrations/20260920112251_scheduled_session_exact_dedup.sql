-- Recoverable cleanup of exact calendar duplicates, never workout history.
-- Different titles/types are deliberately left alone (potential distinct sessions).
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.scheduled_sessions in share row exclusive mode;

create table if not exists public.scheduled_session_duplicate_archive (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kept_id uuid not null,
  original_row jsonb not null,
  archived_at timestamptz not null default now()
);
alter table public.scheduled_session_duplicate_archive enable row level security;
revoke all on public.scheduled_session_duplicate_archive from public, anon, authenticated;
grant all on public.scheduled_session_duplicate_archive to service_role;
drop policy if exists service_only on public.scheduled_session_duplicate_archive;
create policy service_only on public.scheduled_session_duplicate_archive
  for all to service_role using (true) with check (true);
create index if not exists scheduled_duplicate_archive_user_idx
  on public.scheduled_session_duplicate_archive(user_id);

-- Refuse ambiguous historical completions rather than merging real activity.
do $$ begin
  if exists (
    select 1 from public.scheduled_sessions
    group by user_id, scheduled_date, session_type, title
    having count(*) filter (where completed is true) > 1
  ) then raise exception 'Multiple completed calendar duplicates require manual review'; end if;
end $$;

with ranked as (
  select id, first_value(id) over w as kept_id, row_number() over w as position
  from public.scheduled_sessions
  window w as (partition by user_id, scheduled_date, session_type, title
    order by completed desc nulls last, created_at, id)
)
insert into public.scheduled_session_duplicate_archive(id, user_id, kept_id, original_row)
select s.id, s.user_id, r.kept_id, to_jsonb(s)
from ranked r join public.scheduled_sessions s on s.id = r.id
where r.position > 1
on conflict (id) do nothing;

delete from public.scheduled_sessions s
using public.scheduled_session_duplicate_archive a, public.scheduled_sessions kept
where s.id = a.id and kept.id = a.kept_id
  and to_jsonb(s) = a.original_row and s.completed is not true;

create unique index if not exists scheduled_sessions_exact_slot_unique
  on public.scheduled_sessions(user_id, scheduled_date, session_type, title);
commit;
