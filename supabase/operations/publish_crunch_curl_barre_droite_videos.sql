-- Apply only after both static assets are live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (
    select 1 from public.exercises_db
    where id = '25235bd5-a710-4d00-b200-d0e3588f7d23'::uuid
      and lower(name) = 'crunch'
  ) then
    raise exception 'The canonical Crunch exercise was not found';
  end if;

  if not exists (
    select 1 from public.exercises_db
    where id = '99c3d411-0252-4135-ad68-25d420497fc6'::uuid
      and lower(name) = 'curl barre droite'
  ) then
    raise exception 'The canonical Curl barre droite exercise was not found';
  end if;
end
$$;

update public.exercises_db
set video_url = '/videos/exercises/crunch.mp4?v=1'
where id = '25235bd5-a710-4d00-b200-d0e3588f7d23'::uuid
  and lower(name) = 'crunch'
  and video_url is distinct from '/videos/exercises/crunch.mp4?v=1';

update public.exercises_db
set video_url = '/videos/exercises/curl-barre-droite.mp4?v=1'
where id = '99c3d411-0252-4135-ad68-25d420497fc6'::uuid
  and lower(name) = 'curl barre droite'
  and video_url is distinct from '/videos/exercises/curl-barre-droite.mp4?v=1';
