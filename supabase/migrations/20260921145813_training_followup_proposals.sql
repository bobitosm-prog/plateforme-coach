begin;
create table if not exists public.training_followup_proposals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 program_id uuid not null references public.custom_programs(id) on delete cascade,
 kind text not null check(kind in ('monthly','alternative','progression')),
 status text not null default 'pending' check(status in ('pending','applied','declined','expired')),
 baseline_context jsonb not null,
 candidate jsonb not null,
 explanation text not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 applied_at timestamptz,
 result_program_id uuid references public.custom_programs(id) on delete set null
);
create index if not exists training_followup_proposals_owner_idx on public.training_followup_proposals(user_id,created_at desc);
create index if not exists training_followup_proposals_program_idx on public.training_followup_proposals(program_id);
create index if not exists training_followup_proposals_result_idx on public.training_followup_proposals(result_program_id);
create unique index if not exists training_followup_one_monthly_pending_idx on public.training_followup_proposals(user_id,program_id) where kind='monthly' and status='pending';
alter table public.training_followup_proposals enable row level security;
revoke all on public.training_followup_proposals from public,anon,authenticated;
grant select on public.training_followup_proposals to authenticated;
grant all on public.training_followup_proposals to service_role;
drop policy if exists followup_proposal_read on public.training_followup_proposals;
create policy followup_proposal_read on public.training_followup_proposals for select to authenticated using((select auth.uid())=user_id);
drop policy if exists followup_proposal_service on public.training_followup_proposals;
create policy followup_proposal_service on public.training_followup_proposals for all to service_role using(true) with check(true);

create or replace function public.apply_training_followup_v1(p_user_id uuid,p_proposal_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare proposal public.training_followup_proposals%rowtype; result_id uuid; prefs public.training_followup_preferences%rowtype;
begin
 perform id from public.profiles where id=p_user_id for update;
 if not found then raise exception 'PROFILE_UNAVAILABLE' using errcode='PT404'; end if;
 select * into prefs from public.training_followup_preferences where user_id=p_user_id for update;
 if not found or not prefs.enabled then raise exception 'FOLLOWUP_DISABLED' using errcode='PT409'; end if;
 select * into proposal from public.training_followup_proposals where id=p_proposal_id and user_id=p_user_id for update;
 if not found then raise exception 'PROPOSAL_UNAVAILABLE' using errcode='PT404'; end if;
 if proposal.status='applied' then return jsonb_build_object('already_applied',true,'program_id',proposal.result_program_id); end if;
 if proposal.status<>'pending' or proposal.expires_at<=now() then raise exception 'PROPOSAL_EXPIRED' using errcode='PT409'; end if;
 if proposal.kind='monthly' and not prefs.monthly_review then raise exception 'MONTHLY_DISABLED' using errcode='PT409'; end if;
 perform id from public.custom_programs where user_id=p_user_id and is_active order by id for update;
 if public.weekly_adjustment_context_v1(p_user_id) is distinct from proposal.baseline_context then raise exception 'BASELINE_CHANGED' using errcode='PT409'; end if;
 if exists(select 1 from public.coach_clients where client_id=p_user_id and status='active' and source in ('invitation','admin')) then raise exception 'COACH_MANAGED' using errcode='42501'; end if;
 if jsonb_typeof(proposal.candidate->'days') is distinct from 'array' or jsonb_array_length(proposal.candidate->'days') not between 1 and 7 then raise exception 'INVALID_PROGRAM' using errcode='PT422'; end if;
 if proposal.kind='progression' and (select s.session_id::text from public.workout_sets s join public.workout_sessions w on w.id=s.session_id
   where s.user_id=p_user_id and w.user_id=p_user_id and s.completed and w.completed and s.technique is null
   and case when proposal.candidate->>'exercise_id' is not null then s.exercise_id::text=proposal.candidate->>'exercise_id' else s.exercise_name=proposal.candidate->>'exercise_name' end
   order by s.created_at desc,s.id desc limit 1) is distinct from proposal.candidate->>'source_session_id'
 then raise exception 'PERFORMANCE_CHANGED' using errcode='PT409'; end if;
 if not prefs.advanced_techniques and exists(select 1 from jsonb_array_elements(proposal.candidate->'days') d cross join lateral jsonb_array_elements(coalesce(d->'exercises','[]'::jsonb)) e where nullif(e->>'technique','') is not null) then raise exception 'TECHNIQUES_DISABLED' using errcode='PT409'; end if;
 if proposal.kind='monthly' then
  insert into public.custom_programs(user_id,name,description,days,is_active,source,start_date,current_week)
  values(p_user_id,proposal.candidate->>'name',proposal.candidate->>'description',proposal.candidate->'days',false,'athena_monthly',(now() at time zone 'Europe/Zurich')::date,1) returning id into result_id;
  update public.custom_programs set is_active=false where user_id=p_user_id and is_active;
  update public.custom_programs set is_active=true where id=result_id;
 else
  result_id:=proposal.program_id;
  update public.custom_programs set days=proposal.candidate->'days',updated_at=clock_timestamp() where id=result_id and user_id=p_user_id and is_active;
  if not found then raise exception 'BASELINE_CHANGED' using errcode='PT409'; end if;
 end if;
 -- Never rewrite recorded workouts or completed calendar slots.
 if proposal.kind='monthly' then
  delete from public.scheduled_sessions where user_id=p_user_id and completed=false and session_type='custom' and scheduled_date>=(now() at time zone 'Europe/Zurich')::date;
 end if;
 update public.training_followup_proposals set status='applied',applied_at=clock_timestamp(),result_program_id=result_id where id=proposal.id;
 if proposal.kind='progression' then
  update public.progressive_overload_suggestions set status='applied',responded_at=clock_timestamp()
  where id=(proposal.candidate->>'overload_id')::uuid and user_id=p_user_id and status='pending';
  if not found then raise exception 'SUGGESTION_CHANGED' using errcode='PT409'; end if;
 end if;
 return jsonb_build_object('already_applied',false,'program_id',result_id);
end $$;
revoke all on function public.apply_training_followup_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_training_followup_v1(uuid,uuid) to service_role;
commit;
