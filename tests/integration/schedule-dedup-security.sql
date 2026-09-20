do $$ begin
 if (select count(*) from public.scheduled_sessions) <> 5
 or (select count(*) from public.scheduled_sessions where completed) <> 5
 or (select count(*) from public.scheduled_session_duplicate_archive) <> 3
 then raise exception 'Calendar repair lost history or failed'; end if;
 if has_table_privilege('authenticated','public.scheduled_session_duplicate_archive','SELECT')
 or has_table_privilege('anon','public.scheduled_session_duplicate_archive','SELECT')
 then raise exception 'Private repair archive exposed'; end if;
end $$;
