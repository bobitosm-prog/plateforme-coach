begin;
-- Preserve every old record in its own legacy convention. No value is converted.
alter table public.personal_records add column if not exists load_mode text not null default 'legacy';
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.personal_records'::regclass and conname='personal_records_load_mode_check') then
  alter table public.personal_records add constraint personal_records_load_mode_check check(load_mode in ('barbell_total','total','two_dumbbells','one_dumbbell','unilateral_both','external_only','band','legacy'));
 end if;
end $$;
create unique index if not exists personal_records_load_unique on public.personal_records(user_id,exercise_name,record_type,load_mode);
alter table public.personal_records drop constraint if exists personal_records_user_id_exercise_name_record_type_key;
drop index if exists public.idx_personal_records_unique;
-- Older clients can still save workouts, but their old PR upsert fails closed.
commit;
