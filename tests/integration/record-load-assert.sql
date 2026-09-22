insert into public.personal_records(user_id,exercise_name,record_type,value,load_mode) values('10000000-0000-0000-0000-000000000001','Bench','1rm',40,'two_dumbbells')
on conflict(user_id,exercise_name,record_type,load_mode) do update set value=excluded.value;
do $$ begin
 if (select value from public.personal_records where load_mode='legacy')<>80 then raise exception 'Historical record overwritten'; end if;
 if (select count(*) from public.personal_records)<>2 then raise exception 'Load conventions not isolated'; end if;
 begin
  insert into public.personal_records(user_id,exercise_name,record_type,value,load_mode) values('10000000-0000-0000-0000-000000000001','Bench','1rm',40,'invalid');
  raise exception 'Invalid convention accepted';
 exception when check_violation then null;
 end;
end $$;
