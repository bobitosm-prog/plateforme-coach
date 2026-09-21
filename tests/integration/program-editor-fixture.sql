alter table public.custom_programs add column if not exists scheduled boolean default false;
create table if not exists public.client_programs(id uuid primary key default gen_random_uuid(),client_id uuid,coach_id uuid,program jsonb);
grant all on public.client_programs to service_role;
alter table public.scheduled_sessions add column if not exists scheduled_time time;
alter table public.scheduled_sessions add column if not exists duration_min integer;
alter table public.scheduled_sessions add column if not exists reminder_enabled boolean;
alter table public.scheduled_sessions add column if not exists reminder_minutes_before integer;
alter table public.profiles add column if not exists preferred_training_time time;
alter table public.profiles add column if not exists reminder_enabled boolean;
alter table public.profiles add column if not exists reminder_minutes_before integer;
create function public.synthetic_calendar_failure() returns trigger language plpgsql as $$
begin
 if new.title='SYNTHETIC_CALENDAR_FAILURE' then raise exception 'synthetic calendar failure'; end if;
 return new;
end $$;
create trigger synthetic_calendar_failure before insert on public.scheduled_sessions for each row execute function public.synthetic_calendar_failure();
