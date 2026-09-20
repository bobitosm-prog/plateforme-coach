create table public.scheduled_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 scheduled_date date not null, session_type text not null, title text not null,
 completed boolean default false, completed_at timestamptz, created_at timestamptz default now()
);
alter table public.scheduled_sessions enable row level security;
create policy owner_schedule on public.scheduled_sessions for all to authenticated
 using (user_id = auth.uid()) with check (user_id = auth.uid());
grant all on public.scheduled_sessions to service_role;
grant select, insert, update, delete on public.scheduled_sessions to authenticated;
insert into public.profiles(id) values ('10000000-0000-4000-8000-000000000099');
insert into public.scheduled_sessions(user_id,scheduled_date,session_type,title,completed)
select '10000000-0000-4000-8000-000000000099',d::date,'custom','Day '||d,true
from unnest(array['2026-09-14','2026-09-15','2026-09-17','2026-09-18','2026-09-20']) d;
insert into public.scheduled_sessions(user_id,scheduled_date,session_type,title,completed)
select '10000000-0000-4000-8000-000000000099',d::date,'custom','Day '||d,false
from unnest(array['2026-09-14','2026-09-15','2026-09-17']) d;
