begin;
alter table public.custom_programs add column if not exists archived_at timestamptz;
create table if not exists public.training_program_changes (
 id uuid primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 program_id uuid not null references public.custom_programs(id) on delete cascade,
 action text not null check(action in ('save','activate','archive','restore')),
 request jsonb not null,
 previous_program jsonb,
 result jsonb not null,
 created_at timestamptz not null default now()
);
create index if not exists training_program_changes_owner_idx on public.training_program_changes(user_id,created_at desc);
create index if not exists training_program_changes_program_idx on public.training_program_changes(program_id);
alter table public.training_program_changes enable row level security;
revoke all on public.training_program_changes from public,anon,authenticated;
grant select on public.training_program_changes to authenticated;
grant all on public.training_program_changes to service_role;
drop policy if exists program_changes_owner on public.training_program_changes;
create policy program_changes_owner on public.training_program_changes for select to authenticated using((select auth.uid())=user_id);
drop policy if exists program_changes_service on public.training_program_changes;
create policy program_changes_service on public.training_program_changes for all to service_role using(true) with check(true);

create or replace function public.edit_training_program_v1(p_user_id uuid,p_operation_id uuid,p_request jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 target public.custom_programs%rowtype; previous jsonb; saved public.training_program_changes%rowtype;
 action text:=p_request->>'action'; program_id uuid:=(p_request->>'programId')::uuid;
 active_id uuid; active_count integer; result jsonb; candidate jsonb; owner_profile jsonb;
 today date:=(now() at time zone 'Europe/Zurich')::date; monday date; d jsonb; idx integer; slot date;
begin
 select to_jsonb(p) into owner_profile from public.profiles p where id=p_user_id for update;
 if not found then raise exception 'OWNER_UNAVAILABLE' using errcode='PT404'; end if;
 select * into saved from public.training_program_changes where id=p_operation_id;
 if found then
   if saved.user_id<>p_user_id or saved.request is distinct from p_request then raise exception 'RETRY_CHANGED' using errcode='PT409'; end if;
   return saved.result;
 end if;
 if action not in ('save','activate','archive','restore') or action is null then raise exception 'INVALID_ACTION' using errcode='PT422'; end if;
 if (select count(*) from public.coach_clients where client_id=p_user_id and status='active' and source in ('invitation','admin'))>1
 or exists(select 1 from public.coach_clients c join public.client_programs p on p.client_id=c.client_id and p.coach_id=c.coach_id
   where c.client_id=p_user_id and c.status='active' and c.source in ('invitation','admin') and jsonb_typeof(p.program) in ('object','array'))
 then raise exception 'COACH_MANAGED' using errcode='42501'; end if;
 perform id from public.custom_programs where user_id=p_user_id order by id for update;
 select count(*),(array_agg(id order by id))[1] into active_count,active_id from public.custom_programs where user_id=p_user_id and is_active;
 if active_count>1 then raise exception 'MULTIPLE_ACTIVE' using errcode='PT409'; end if;
 if program_id is not null then
   select * into target from public.custom_programs where id=program_id and user_id=p_user_id;
   if not found then raise exception 'PROGRAM_UNAVAILABLE' using errcode='PT404'; end if;
   previous:=to_jsonb(target);
   if previous is distinct from p_request->'expected' then raise exception 'PROGRAM_CHANGED' using errcode='PT409'; end if;
 elsif action<>'save' then raise exception 'PROGRAM_REQUIRED' using errcode='PT422'; end if;
 if action='activate' then
   if active_id is distinct from (p_request->>'activeProgramId')::uuid then raise exception 'ACTIVE_CHANGED' using errcode='PT409'; end if;
   if target.archived_at is not null then raise exception 'ARCHIVED' using errcode='PT409'; end if;
   if not coalesce(target.is_active,false) then
     update public.custom_programs set is_active=false,updated_at=clock_timestamp() where user_id=p_user_id and is_active;
     update public.custom_programs set is_active=true,scheduled=false,start_date=today,current_week=1,updated_at=clock_timestamp() where id=program_id returning * into target;
   end if;
 elsif action='archive' then
   if target.is_active then raise exception 'ACTIVE_PROTECTED' using errcode='PT409'; end if;
   update public.custom_programs set archived_at=clock_timestamp(),scheduled=false,updated_at=clock_timestamp() where id=program_id returning * into target;
 elsif action='restore' and p_request->>'versionId' is null then
   update public.custom_programs set archived_at=null,updated_at=clock_timestamp() where id=program_id returning * into target;
 else
   if action='restore' then
     select previous_program into candidate from public.training_program_changes where id=(p_request->>'versionId')::uuid and user_id=p_user_id and training_program_changes.program_id=target.id;
     if candidate is null then raise exception 'VERSION_UNAVAILABLE' using errcode='PT404'; end if;
   else candidate:=p_request->'candidate'; end if;
   if jsonb_typeof(candidate->'days') is distinct from 'array' or jsonb_array_length(candidate->'days') not between 1 and 7
     or length(btrim(coalesce(candidate->>'name','')))=0 then raise exception 'INVALID_PROGRAM' using errcode='PT422'; end if;
   if program_id is null then
     insert into public.custom_programs(user_id,name,description,days,source,is_active,scheduled,total_weeks,phases)
     values(p_user_id,candidate->>'name',coalesce(candidate->>'description',''),candidate->'days',coalesce(candidate->>'source','manual'),false,false,(candidate->>'total_weeks')::integer,candidate->'phases') returning * into target;
     program_id:=target.id;
   else
     if target.archived_at is not null then raise exception 'ARCHIVED' using errcode='PT409'; end if;
     update public.custom_programs set name=candidate->>'name',days=candidate->'days',updated_at=clock_timestamp() where id=program_id returning * into target;
   end if;
 end if;
 if target.is_active then
   -- Only pending program slots: never delete cardio, past slots or completed history.
   delete from public.scheduled_sessions where user_id=p_user_id and session_type='custom' and completed=false and scheduled_date>=today;
   monday:=today-(extract(isodow from today)::integer-1);
   for d,idx in select value,ordinality::integer-1 from jsonb_array_elements(target.days) with ordinality loop
     slot:=monday+idx;
     if slot<today or coalesce((d->>'is_rest')::boolean,false) or coalesce((d->>'repos')::boolean,false) or jsonb_array_length(coalesce(d->'exercises','[]'))=0 then continue; end if;
     if not exists(select 1 from public.scheduled_sessions where user_id=p_user_id and session_type='custom' and scheduled_date=slot) then
       insert into public.scheduled_sessions(user_id,title,session_type,scheduled_date,scheduled_time,duration_min,completed,reminder_enabled,reminder_minutes_before)
       values(p_user_id,coalesce(nullif(d->>'name',''),d->>'weekday','Séance'),'custom',slot,coalesce(nullif(owner_profile->>'preferred_training_time',''),'08:00')::time,60,false,coalesce((owner_profile->>'reminder_enabled')::boolean,true),coalesce((owner_profile->>'reminder_minutes_before')::integer,30))
       on conflict(user_id,scheduled_date,session_type,title) do nothing;
     end if;
   end loop;
 end if;
 result:=jsonb_build_object('program',to_jsonb(target));
 insert into public.training_program_changes(id,user_id,program_id,action,request,previous_program,result)
 values(p_operation_id,p_user_id,program_id,action,p_request,previous,result);
 return result;
end $$;
revoke all on function public.edit_training_program_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.edit_training_program_v1(uuid,uuid,jsonb) to service_role;
commit;
