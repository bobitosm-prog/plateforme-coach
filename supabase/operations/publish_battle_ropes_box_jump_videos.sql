-- Apply only after both static assets are live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (
    select 1 from public.exercises_db
    where id = 'd97e1cbe-2e68-4969-b610-6d7278f1c742'::uuid
      and lower(name) = 'battle ropes'
  ) then
    raise exception 'The canonical Battle Ropes exercise was not found';
  end if;

  if not exists (
    select 1 from public.exercises_db
    where id = '38923678-4a81-40a7-8555-565eb1cac5a6'::uuid
      and lower(name) = 'box jump'
  ) then
    raise exception 'The canonical Box Jump exercise was not found';
  end if;
end
$$;

update public.exercises_db
set video_url = '/videos/exercises/battle-ropes.mp4?v=1'
where id = 'd97e1cbe-2e68-4969-b610-6d7278f1c742'::uuid
  and lower(name) = 'battle ropes'
  and video_url is distinct from '/videos/exercises/battle-ropes.mp4?v=1';

update public.exercises_db
set video_url = '/videos/exercises/box-jump.mp4?v=1'
where id = '38923678-4a81-40a7-8555-565eb1cac5a6'::uuid
  and lower(name) = 'box jump'
  and video_url is distinct from '/videos/exercises/box-jump.mp4?v=1';
