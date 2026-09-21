alter table public.custom_programs add column if not exists description text;
alter table public.custom_programs add column if not exists source text;
alter table public.custom_programs add column if not exists created_at timestamptz default now();
create table public.workout_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null,completed boolean default false);
create table public.workout_sets(id uuid primary key default gen_random_uuid(),session_id uuid references public.workout_sessions(id),user_id uuid not null,
 exercise_id uuid,exercise_name text,set_number integer,reps integer,weight numeric,rir integer,completed boolean,created_at timestamptz default now());
create table public.progressive_overload_suggestions(id uuid primary key default gen_random_uuid(),user_id uuid not null,status text,responded_at timestamptz);
grant all on public.workout_sessions,public.workout_sets,public.progressive_overload_suggestions to service_role;
