begin;
alter table public.workout_sets drop constraint if exists workout_sets_drop_parent_check;
alter table public.workout_sets add constraint workout_sets_drop_parent_check
  check (parent_set_number is null or (
    technique is not null and technique in ('dropset', 'restpause')
    and parent_set_number > 0 and parent_set_number < set_number
  ));
commit;
