create table public.personal_records(id uuid primary key default gen_random_uuid(),user_id uuid,exercise_name text,record_type text,value numeric,
 constraint personal_records_user_id_exercise_name_record_type_key unique(user_id,exercise_name,record_type));
insert into public.personal_records(user_id,exercise_name,record_type,value) values('10000000-0000-0000-0000-000000000001','Bench','1rm',80);
