alter table public.exercises_db add column if not exists variant_group text;
grant all on public.exercises_db,public.exercises_catalog to anon,authenticated;
create policy "coaches can insert" on public.exercises_db for insert with check(auth.uid() is not null);
create policy "coaches can update own" on public.exercises_db for update using(auth.uid()=created_by);
insert into public.exercises_db(name,equipment,variant_group) values
 ('Ab Roller','band','ab_roller'),('Battle Ropes','band','cardio_epaules'),
 ('Adduction Machine','machine_gym','abduction'),('Reverse pec deck','machine_gym','ecarte'),
 ('Soulevé de terre jambes tendues','barbell','rdl'),('Rowing Ergomètre','machine_gym','rowing'),
 ('Rowing Barre','barbell','rowing'),('Rowing barre buste penché','barbell','rowing'),
 ('Soulevé de Terre Roumain','barbell','rdl');
