-- Apply only after all five static assets are live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (select 1 from public.exercises_db where id = '00dbdad6-b94d-43a5-8463-6b2ba849cc18'::uuid and lower(name) = 'curl poulie basse') then
    raise exception 'The canonical Curl Poulie Basse exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = 'b3a84e09-ed26-43f8-b17f-4b8ab4f7c23f'::uuid and lower(name) = 'curl pupitre') then
    raise exception 'The canonical Curl pupitre exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = 'b2eaccb5-9b91-475e-aeba-9d081709d54d'::uuid and lower(name) = 'curl spider') then
    raise exception 'The canonical Curl spider exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = '9a14c0cd-a9db-48f0-9016-ee59a1e096db'::uuid and lower(name) = 'développé couché barre') then
    raise exception 'The canonical Développé Couché Barre exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = '8afa0acd-d198-47b6-b0b1-de10abfb27fb'::uuid and lower(name) = 'développé couché machine') then
    raise exception 'The canonical Développé couché machine exercise was not found';
  end if;
end
$$;

update public.exercises_db set video_url = '/videos/exercises/curl-poulie-basse.mp4?v=1'
where id = '00dbdad6-b94d-43a5-8463-6b2ba849cc18'::uuid and lower(name) = 'curl poulie basse'
  and video_url is distinct from '/videos/exercises/curl-poulie-basse.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/curl-pupitre.mp4?v=1'
where id = 'b3a84e09-ed26-43f8-b17f-4b8ab4f7c23f'::uuid and lower(name) = 'curl pupitre'
  and video_url is distinct from '/videos/exercises/curl-pupitre.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/curl-spider.mp4?v=1'
where id = 'b2eaccb5-9b91-475e-aeba-9d081709d54d'::uuid and lower(name) = 'curl spider'
  and video_url is distinct from '/videos/exercises/curl-spider.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/developpe-couche-barre.mp4?v=1'
where id = '9a14c0cd-a9db-48f0-9016-ee59a1e096db'::uuid and lower(name) = 'développé couché barre'
  and video_url is distinct from '/videos/exercises/developpe-couche-barre.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/developpe-couche-machine.mp4?v=1'
where id = '8afa0acd-d198-47b6-b0b1-de10abfb27fb'::uuid and lower(name) = 'développé couché machine'
  and video_url is distinct from '/videos/exercises/developpe-couche-machine.mp4?v=1';
