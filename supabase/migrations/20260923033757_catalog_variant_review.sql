begin;
alter table public.workout_sets drop constraint if exists workout_sets_load_mode_check;
alter table public.workout_sets add constraint workout_sets_load_mode_check check(load_mode is null or load_mode in ('barbell_total','total','two_dumbbells','one_dumbbell','unilateral_both','external_only','band','unquantified','legacy'));
alter table public.personal_records drop constraint if exists personal_records_load_mode_check;
alter table public.personal_records add constraint personal_records_load_mode_check check(load_mode in ('barbell_total','total','two_dumbbells','one_dumbbell','unilateral_both','external_only','band','unquantified','legacy'));
alter table public.exercises_db add column if not exists catalog_review_note text;
alter table public.exercises_db drop constraint if exists exercises_db_equipment_check;
alter table public.exercises_db add constraint exercises_db_equipment_check
 check(equipment in ('barbell','dumbbell','kettlebell','band','bodyweight','machine_gym','ab_wheel','battle_rope'));
update public.exercises_db set equipment='ab_wheel' where name='Ab Roller' and equipment='band' and created_by is null and not coalesce(is_custom,false);
update public.exercises_db set equipment='battle_rope' where name='Battle Ropes' and equipment='band' and created_by is null and not coalesce(is_custom,false);
-- These are different movements, not interchangeable members of one family.
with corrections(name,old_group,new_group) as (values
 ('Adduction Machine','abduction','adduction'),
 ('Reverse pec deck','ecarte','oiseau'),
 ('Soulevé de terre jambes tendues','rdl','stiff_leg_deadlift'),
 ('Rowing Ergomètre','rowing','rowing_cardio')
)
update public.exercises_db e set variant_group=c.new_group from corrections c
where e.name=c.name and e.variant_group=c.old_group and e.created_by is null and not coalesce(e.is_custom,false);
-- Quarantine from NEW selections only. Historical IDs, names, media and sets remain.
update public.exercises_db set catalog_review_note='Position, prise ou matériel à préciser avant réutilisation dans un nouveau programme.'
where name in ('Développé Militaire','Développé Militaire Barre','Face Pulls','Rowing Barre','Rowing Haltère','Extension Triceps Poulie','Triceps Poulie Corde','Oiseau / Reverse Fly','Soulevé de Terre Roumain','Glute Bridge','Russian Twist','Torsion Russe Lestée')
and created_by is null and not coalesce(is_custom,false) and catalog_review_note is null;
-- Views expand * at creation time. Keep existing column order, append new field.
create or replace view public.exercises_catalog with(security_invoker=true) as
select * from public.exercises_db where canonical_exercise_id is null and catalog_review_note is null;
revoke all on public.exercises_catalog from public,anon,authenticated;
grant select on public.exercises_catalog to anon,authenticated,service_role;
commit;
