-- Apply only after both static assets are live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (
    select 1 from public.exercises_db
    where id = '07e3148b-894b-4fc9-b81e-efae6167037e'::uuid
      and lower(name) = 'abduction machine'
  ) then
    raise exception 'The canonical Abduction Machine exercise was not found';
  end if;

  if not exists (
    select 1 from public.exercises_db
    where id = '0f57f2ec-0401-4892-b857-f0a9dc9efb74'::uuid
      and lower(name) = 'adduction machine'
  ) then
    raise exception 'The canonical Adduction Machine exercise was not found';
  end if;
end
$$;

update public.exercises_db
set video_url = '/videos/exercises/abduction-machine.mp4?v=1'
where id = '07e3148b-894b-4fc9-b81e-efae6167037e'::uuid
  and lower(name) = 'abduction machine'
  and video_url is distinct from '/videos/exercises/abduction-machine.mp4?v=1';

update public.exercises_db
set video_url = '/videos/exercises/adduction-machine.mp4?v=1'
where id = '0f57f2ec-0401-4892-b857-f0a9dc9efb74'::uuid
  and lower(name) = 'adduction machine'
  and video_url is distinct from '/videos/exercises/adduction-machine.mp4?v=1';
