-- Apply only after the static asset is live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (
    select 1 from public.exercises_db
    where id = '196f4ce9-98ba-4119-a705-b1ca509bba59'::uuid
      and lower(name) = 'ab roller'
  ) then
    raise exception 'The canonical Ab Roller exercise was not found';
  end if;
end
$$;

update public.exercises_db
set video_url = '/videos/exercises/ab-roller.mp4?v=1'
where id = '196f4ce9-98ba-4119-a705-b1ca509bba59'::uuid
  and lower(name) = 'ab roller'
  and video_url is distinct from '/videos/exercises/ab-roller.mp4?v=1';
