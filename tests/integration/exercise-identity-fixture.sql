create table public.exercises_db(id uuid primary key default gen_random_uuid(),name text,equipment text,is_custom boolean default false,created_by uuid);
alter table public.exercises_db enable row level security;
create policy fixture_catalog_read on public.exercises_db for select using(created_by is null);
grant select on public.exercises_db to anon,authenticated,service_role;
insert into public.exercises_db(name,equipment) values
 ('Développé Couché','barbell'),('Développé Couché Barre','barbell'),('Développé couché haltères','dumbbell'),
 ('Kickbacks poulie','dumbbell'),('Kickbacks machine','dumbbell'),('Extensions mollets debout barre','machine_gym'),('Extensions mollets debout poids du corps','machine_gym');
insert into public.exercises_db(name,equipment,is_custom,created_by) values('Développé Couché','barbell',true,'10000000-0000-0000-0000-000000000001');
