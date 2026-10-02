-- Apply only after both static assets are live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (
    select 1 from public.exercises_db
    where id = '11c7bf0e-26b1-48cc-b699-96093c05fcc8'::uuid
      and lower(name) = 'burpees'
  ) then
    raise exception 'The canonical Burpees exercise was not found';
  end if;

  if not exists (
    select 1 from public.exercises_db
    where id = 'cd519c55-db25-43f8-b548-dcc47905a83f'::uuid
      and lower(name) = 'cable crunch'
  ) then
    raise exception 'The canonical Cable Crunch exercise was not found';
  end if;
end
$$;

update public.exercises_db
set video_url = '/videos/exercises/burpees.mp4?v=1'
where id = '11c7bf0e-26b1-48cc-b699-96093c05fcc8'::uuid
  and lower(name) = 'burpees'
  and video_url is distinct from '/videos/exercises/burpees.mp4?v=1';

update public.exercises_db
set video_url = '/videos/exercises/cable-crunch.mp4?v=1'
where id = 'cd519c55-db25-43f8-b548-dcc47905a83f'::uuid
  and lower(name) = 'cable crunch'
  and video_url is distinct from '/videos/exercises/cable-crunch.mp4?v=1';
