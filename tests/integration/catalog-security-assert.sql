do $$ declare role_name text; table_name text; privilege_name text; begin
 foreach role_name in array array['anon','authenticated'] loop
  foreach table_name in array array['public.exercises_db','public.exercises_catalog'] loop
   if not has_table_privilege(role_name,table_name,'SELECT') then raise exception 'Catalog read broken'; end if;
   foreach privilege_name in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
    if has_table_privilege(role_name,table_name,privilege_name) then raise exception 'Excess privilege: % % %',role_name,table_name,privilege_name; end if;
   end loop;
  end loop;
 end loop;
 if (select count(*) from public.exercises_db)<>17 then raise exception 'Historical IDs lost'; end if;
 if exists(select 1 from public.exercises_catalog where name in ('Rowing Barre','Soulevé de Terre Roumain')) then raise exception 'Ambiguous variants selectable'; end if;
 if not exists(select 1 from public.exercises_catalog where name='Rowing barre buste penché') then raise exception 'Precise variant hidden'; end if;
 if (select equipment from public.exercises_catalog where name='Ab Roller')<>'ab_wheel' then raise exception 'Wheel treated as elastic band'; end if;
 if (select variant_group from public.exercises_catalog where name='Adduction Machine')<>'adduction' then raise exception 'Opposite movements conflated'; end if;
end $$;
set role authenticated;
do $$ begin
 begin
  insert into public.exercises_db(name,equipment) values('Unauthorized','barbell');
  raise exception 'Authenticated insert unexpectedly succeeded';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.exercises_catalog(name,equipment) values('View bypass','barbell');
  raise exception 'View write unexpectedly succeeded';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Server writes still work; no real-user account or production row is used.
begin;
set local role service_role;
insert into public.exercises_db(name,equipment) values('Synthetic authorized maintenance','barbell');
update public.exercises_db set equipment='dumbbell' where name='Synthetic authorized maintenance';
delete from public.exercises_db where name='Synthetic authorized maintenance';
rollback;
-- Even accidentally regranted browser DML + permissive policies cannot bypass the boundary.
begin;
grant insert,update,delete on public.exercises_db to authenticated;
create policy synthetic_accidental_grant on public.exercises_db for all to authenticated using(true) with check(true);
set local role authenticated;
do $$ declare changed integer; begin
 begin
  insert into public.exercises_db(name,equipment) values('Future grant bypass','barbell');
  raise exception 'Restrictive INSERT boundary bypassed';
 exception when insufficient_privilege then null; end;
 update public.exercises_db set equipment='dumbbell' where name='Développé Couché Barre';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Restrictive UPDATE boundary bypassed'; end if;
 delete from public.exercises_db;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Restrictive DELETE boundary bypassed'; end if;
end $$;
rollback;
