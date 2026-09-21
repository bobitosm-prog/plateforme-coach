begin;
-- Expiry is not a client refusal. Preserve the suggestion and its audit trail.
alter table public.progressive_overload_suggestions drop constraint if exists progressive_overload_suggestions_status_check;
alter table public.progressive_overload_suggestions add constraint progressive_overload_suggestions_status_check
 check(status in ('pending','accepted','declined','applied','expired'));
commit;
