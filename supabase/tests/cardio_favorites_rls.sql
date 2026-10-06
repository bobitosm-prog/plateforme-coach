-- Integration check: needs two existing accounts, rolls all test writes back.
begin;
do $$ declare a uuid; b uuid; begin
  select id into a from auth.users order by id limit 1;
  select id into b from auth.users where id <> a order by id limit 1;
  if a is null or b is null then raise exception 'Two test accounts are required'; end if;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('qa.owner',a::text,true);
  perform set_config('qa.other',b::text,true);
  if has_table_privilege('anon','public.cardio_favorites','SELECT') then raise exception 'Anonymous access allowed'; end if;
end $$;
set local role authenticated;
do $$ begin
  insert into public.cardio_favorites(user_id,workout_id) values(auth.uid(),'__qa_isolation__');
  if not exists(select 1 from public.cardio_favorites where workout_id='__qa_isolation__') then raise exception 'Own read failed'; end if;
  begin
    insert into public.cardio_favorites(user_id,workout_id) values(current_setting('qa.other')::uuid,'__qa_isolation__');
    raise exception 'Cross-user insert allowed';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',current_setting('qa.other'),true);
  if exists(select 1 from public.cardio_favorites where workout_id='__qa_isolation__') then raise exception 'Cross-user read allowed'; end if;
  delete from public.cardio_favorites where workout_id='__qa_isolation__';
  if found then raise exception 'Cross-user delete allowed'; end if;
  perform set_config('request.jwt.claim.sub',current_setting('qa.owner'),true);
  delete from public.cardio_favorites where workout_id='__qa_isolation__';
  if not found then raise exception 'Own delete failed'; end if;
end $$;
reset role;
rollback;
