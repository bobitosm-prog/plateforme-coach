do $$ begin
 if (select count(*) from public.exercises_db)<>8 then raise exception 'Historical catalog IDs lost'; end if;
 if (select count(*) from public.exercises_db where canonical_exercise_id is not null)<>1 then raise exception 'Wrong identity merge'; end if;
 if exists(select 1 from public.exercises_db where is_custom and canonical_exercise_id is not null) then raise exception 'Custom identity changed'; end if;
 if not exists(select 1 from public.exercises_catalog where name='Développé couché haltères') then raise exception 'Distinct equipment hidden'; end if;
 if exists(select 1 from public.exercises_db where name like 'Kickbacks%' and equipment<>'machine_gym') then raise exception 'Equipment not corrected'; end if;
end $$;
set role anon;
do $$ begin
 if (select count(*) from public.exercises_catalog)<>6 then raise exception 'Invoker view bypasses underlying RLS or duplicate retained'; end if;
end $$;
reset role;
