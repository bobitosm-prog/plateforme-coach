-- Apply only after all eight static assets are live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (select 1 from public.exercises_db where id = '21c4f23d-9de8-46ac-8b01-288770114156'::uuid and lower(name) = 'curl haltères') then raise exception 'Canonical Curl haltères not found'; end if;
  if not exists (select 1 from public.exercises_db where id = '6d1481f8-1268-4904-8813-f1489995de77'::uuid and lower(name) = 'développé couché haltères') then raise exception 'Canonical Développé couché haltères not found'; end if;
  if not exists (select 1 from public.exercises_db where id = '16fe52fe-eb99-4c38-81c9-e4a2952db88f'::uuid and lower(name) = 'développé incliné barre') then raise exception 'Canonical Développé Incliné Barre not found'; end if;
  if not exists (select 1 from public.exercises_db where id = 'c7cc2bc5-5fd9-4abb-9b44-4f90e8181174'::uuid and lower(name) = 'développé incliné haltères') then raise exception 'Canonical Développé incliné haltères not found'; end if;
  if not exists (select 1 from public.exercises_db where id = 'd4ed9190-3ea8-4408-9b53-81c52a2cfaba'::uuid and lower(name) = 'dips') then raise exception 'Canonical Dips not found'; end if;
  if not exists (select 1 from public.exercises_db where id = 'fdda49d3-d68b-431b-a3ef-8e970323d9b6'::uuid and lower(name) = 'dips pectoraux') then raise exception 'Canonical Dips pectoraux not found'; end if;
  if not exists (select 1 from public.exercises_db where id = '57a8eb7d-3bf6-48bb-9b61-62761403f647'::uuid and lower(name) = 'dips triceps') then raise exception 'Canonical Dips Triceps not found'; end if;
  if not exists (select 1 from public.exercises_db where id = '6459ea74-cea8-480a-8f6f-463545d9ca2d'::uuid and lower(name) = 'donkey calf raise') then raise exception 'Canonical Donkey Calf Raise not found'; end if;
end
$$;

update public.exercises_db set video_url = '/videos/exercises/curl-halteres.mp4?v=1'
where id = '21c4f23d-9de8-46ac-8b01-288770114156'::uuid and lower(name) = 'curl haltères' and video_url is distinct from '/videos/exercises/curl-halteres.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/developpe-couche-halteres.mp4?v=1'
where id = '6d1481f8-1268-4904-8813-f1489995de77'::uuid and lower(name) = 'développé couché haltères' and video_url is distinct from '/videos/exercises/developpe-couche-halteres.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/developpe-incline-barre.mp4?v=1'
where id = '16fe52fe-eb99-4c38-81c9-e4a2952db88f'::uuid and lower(name) = 'développé incliné barre' and video_url is distinct from '/videos/exercises/developpe-incline-barre.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/developpe-incline-halteres.mp4?v=1'
where id = 'c7cc2bc5-5fd9-4abb-9b44-4f90e8181174'::uuid and lower(name) = 'développé incliné haltères' and video_url is distinct from '/videos/exercises/developpe-incline-halteres.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/dips.mp4?v=1'
where id = 'd4ed9190-3ea8-4408-9b53-81c52a2cfaba'::uuid and lower(name) = 'dips' and video_url is distinct from '/videos/exercises/dips.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/dips-pectoraux.mp4?v=1'
where id = 'fdda49d3-d68b-431b-a3ef-8e970323d9b6'::uuid and lower(name) = 'dips pectoraux' and video_url is distinct from '/videos/exercises/dips-pectoraux.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/dips-triceps.mp4?v=1'
where id = '57a8eb7d-3bf6-48bb-9b61-62761403f647'::uuid and lower(name) = 'dips triceps' and video_url is distinct from '/videos/exercises/dips-triceps.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/donkey-calf-raise.mp4?v=1'
where id = '6459ea74-cea8-480a-8f6f-463545d9ca2d'::uuid and lower(name) = 'donkey calf raise' and video_url is distinct from '/videos/exercises/donkey-calf-raise.mp4?v=1';
