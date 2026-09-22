begin;
alter table public.workout_sets add column if not exists load_mode text;
alter table public.exercises_db add column if not exists canonical_exercise_id uuid;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.workout_sets'::regclass and conname='workout_sets_load_mode_check') then
  alter table public.workout_sets add constraint workout_sets_load_mode_check check(load_mode is null or load_mode in ('barbell_total','total','two_dumbbells','one_dumbbell','unilateral_both','external_only','band','legacy'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.exercises_db'::regclass and conname='exercises_canonical_fkey') then
  alter table public.exercises_db add constraint exercises_canonical_fkey foreign key(canonical_exercise_id) references public.exercises_db(id);
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.exercises_db'::regclass and conname='exercises_canonical_not_self') then
  alter table public.exercises_db add constraint exercises_canonical_not_self check(canonical_exercise_id is null or canonical_exercise_id<>id);
 end if;
end $$;
create index if not exists exercises_canonical_idx on public.exercises_db(canonical_exercise_id);
-- Keep every original ID/media/history row. Only reviewed shared catalog synonyms are hidden from new pickers.
with aliases(alias,canonical,equipment) as (values
('Développé Couché','Développé Couché Barre','barbell'),
('Développé couché à la barre','Développé Couché Barre','barbell'),
('Curl Barre Droit','Curl barre droite','barbell'),
('Écarté Couché Haltères','Écartés couchés haltères','dumbbell'),
('Hip Thrust','Hip Thrust Barre','barbell'),
('Squat','Squat Barre','barbell'),
('Squat classique back squat','Squat Barre','barbell'),
('Élévations Frontales','Élévations frontales haltères','dumbbell'),
('Élévations Latérales','Élévations latérales haltères','dumbbell'),
('Leg Curl Couché','Leg curl allongé','machine_gym'),
('Extension Jambes Machine','Leg extension','machine_gym'),
('Leg Press','Presse à cuisses','machine_gym'),
('Dips Poitrine','Dips pectoraux','bodyweight')
)
update public.exercises_db old set canonical_exercise_id=target.id
from aliases a join public.exercises_db target on target.name=a.canonical and target.equipment=a.equipment
where old.name=a.alias and old.equipment=a.equipment and old.id<>target.id
and coalesce(old.is_custom,false)=false and old.created_by is null
and coalesce(target.is_custom,false)=false and target.created_by is null
and old.canonical_exercise_id is distinct from target.id;
-- Audited name, description and material agree; do not touch customer exercises or newer edits.
update public.exercises_db set equipment='machine_gym' where name in ('Kickbacks machine','Kickbacks poulie') and equipment='dumbbell' and created_by is null and coalesce(is_custom,false)=false;
update public.exercises_db set equipment='barbell' where name='Extensions mollets debout barre' and equipment='machine_gym' and created_by is null and coalesce(is_custom,false)=false;
update public.exercises_db set equipment='bodyweight' where name='Extensions mollets debout poids du corps' and equipment='machine_gym' and created_by is null and coalesce(is_custom,false)=false;
create or replace view public.exercises_catalog with(security_invoker=true) as select * from public.exercises_db where canonical_exercise_id is null;
grant select on public.exercises_catalog to anon,authenticated,service_role;
commit;
