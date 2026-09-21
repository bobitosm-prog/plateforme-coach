begin;
alter table public.workout_sets add column if not exists technique text;
alter table public.workout_sets add column if not exists parent_set_number integer;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.workout_sets'::regclass and conname='workout_sets_technique_check') then
  alter table public.workout_sets add constraint workout_sets_technique_check check(technique is null or technique in ('dropset','fst7','restpause','superset','mechanical'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.workout_sets'::regclass and conname='workout_sets_drop_parent_check') then
  alter table public.workout_sets add constraint workout_sets_drop_parent_check check(parent_set_number is null or (technique='dropset' and parent_set_number>0 and parent_set_number<set_number));
 end if;
end $$;
commit;
