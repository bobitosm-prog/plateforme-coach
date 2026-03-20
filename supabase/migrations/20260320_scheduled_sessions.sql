create table if not exists scheduled_sessions (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references profiles(id),
  client_id uuid references profiles(id),
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  session_type text default 'Force',
  notes text,
  status text default 'scheduled',
  created_at timestamptz default now()
);

alter table scheduled_sessions enable row level security;

create policy "coaches manage scheduled sessions"
on scheduled_sessions for all to authenticated
using (coach_id = auth.uid())
with check (coach_id = auth.uid());

create policy "clients read own scheduled sessions"
on scheduled_sessions for select to authenticated
using (client_id = auth.uid());
