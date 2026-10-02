-- Apply only after all five static assets are live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (select 1 from public.exercises_db where id = 'e38482e6-f20a-4552-b307-ceb60d974e3a'::uuid and lower(name) = 'développé militaire') then
    raise exception 'The canonical Développé Militaire exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = '7691cf60-503b-402d-a2c2-149f6112c542'::uuid and lower(name) = 'squat barre') then
    raise exception 'The canonical Squat Barre exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = '1031f4de-c6b2-4fe2-8b3f-d396b8ef4224'::uuid and lower(name) = 'développé assis haltères') then
    raise exception 'The canonical Développé assis haltères exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = '4b420e0b-08aa-441b-94ea-43de1031e7ac'::uuid and lower(name) = 'arnold press') then
    raise exception 'The canonical Arnold press exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = '1843e6ea-e387-4cde-84de-25d7db2b2e40'::uuid and lower(name) = 'curl concentré') then
    raise exception 'The canonical Curl Concentré exercise was not found';
  end if;
end
$$;

update public.exercises_db set video_url = '/videos/exercises/developpe-militaire.mp4?v=1'
where id = 'e38482e6-f20a-4552-b307-ceb60d974e3a'::uuid and lower(name) = 'développé militaire'
  and video_url is distinct from '/videos/exercises/developpe-militaire.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/squat-barre.mp4?v=1'
where id = '7691cf60-503b-402d-a2c2-149f6112c542'::uuid and lower(name) = 'squat barre'
  and video_url is distinct from '/videos/exercises/squat-barre.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/developpe-assis-halteres.mp4?v=1'
where id = '1031f4de-c6b2-4fe2-8b3f-d396b8ef4224'::uuid and lower(name) = 'développé assis haltères'
  and video_url is distinct from '/videos/exercises/developpe-assis-halteres.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/arnold-press.mp4?v=1'
where id = '4b420e0b-08aa-441b-94ea-43de1031e7ac'::uuid and lower(name) = 'arnold press'
  and video_url is distinct from '/videos/exercises/arnold-press.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/curl-concentre.mp4?v=1'
where id = '1843e6ea-e387-4cde-84de-25d7db2b2e40'::uuid and lower(name) = 'curl concentré'
  and video_url is distinct from '/videos/exercises/curl-concentre.mp4?v=1';
