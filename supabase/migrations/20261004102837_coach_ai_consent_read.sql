-- Read only: client decisions remain writable exclusively by their owner.
-- Uses existing relationship RLS and its unique active-client index.
drop policy if exists ai_consents_read_active_client on public.ai_consents;
create policy ai_consents_read_active_client on public.ai_consents
for select to authenticated using (
  exists (
    select 1 from public.coach_clients r
    where r.client_id = ai_consents.user_id
      and r.coach_id = (select auth.uid())
      and r.status = 'active' and r.source in ('invitation', 'admin')
  )
);
