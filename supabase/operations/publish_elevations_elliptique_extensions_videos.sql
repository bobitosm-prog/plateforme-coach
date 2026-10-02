-- Apply only after all five static assets are live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (select 1 from public.exercises_db where id = 'de4666ec-b699-4836-8788-37452d64caac'::uuid and lower(name) = 'élévations frontales disque') then raise exception 'Canonical Élévations frontales disque not found'; end if;
  if not exists (select 1 from public.exercises_db where id = '42858a6c-b6b2-4797-976d-11942d57c78f'::uuid and lower(name) = 'élévations latérales haltères') then raise exception 'Canonical Élévations latérales haltères not found'; end if;
  if not exists (select 1 from public.exercises_db where id = '7c4a85df-d287-42f1-8876-c9a0371c0666'::uuid and lower(name) = 'elliptique') then raise exception 'Canonical Elliptique not found'; end if;
  if not exists (select 1 from public.exercises_db where id = '95063cbd-ca22-4ec4-b2f5-49c32d0ecbfd'::uuid and lower(name) = 'leg extension') then raise exception 'Canonical Leg extension not found'; end if;
  if not exists (select 1 from public.exercises_db where id = '3a2df83f-7a09-4379-8cc1-4728e713abb8'::uuid and lower(name) = 'extension jambes machine' and canonical_exercise_id = '95063cbd-ca22-4ec4-b2f5-49c32d0ecbfd'::uuid) then raise exception 'Extension Jambes Machine alias not found'; end if;
  if not exists (select 1 from public.exercises_db where id = 'a5b3962a-d0f1-4c93-88e0-573474700521'::uuid and lower(name) = 'extension nuque haltère') then raise exception 'Canonical Extension nuque haltère not found'; end if;
end
$$;

update public.exercises_db set video_url = '/videos/exercises/elevations-frontales-disque.mp4?v=1'
where id = 'de4666ec-b699-4836-8788-37452d64caac'::uuid and lower(name) = 'élévations frontales disque' and video_url is distinct from '/videos/exercises/elevations-frontales-disque.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/elevations-laterales-halteres.mp4?v=1'
where id = '42858a6c-b6b2-4797-976d-11942d57c78f'::uuid and lower(name) = 'élévations latérales haltères' and video_url is distinct from '/videos/exercises/elevations-laterales-halteres.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/elliptique.mp4?v=1'
where id = '7c4a85df-d287-42f1-8876-c9a0371c0666'::uuid and lower(name) = 'elliptique' and video_url is distinct from '/videos/exercises/elliptique.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/extension-jambes-machine.mp4?v=1'
where id = '95063cbd-ca22-4ec4-b2f5-49c32d0ecbfd'::uuid and lower(name) = 'leg extension' and video_url is distinct from '/videos/exercises/extension-jambes-machine.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/extension-jambes-machine.mp4?v=1'
where id = '3a2df83f-7a09-4379-8cc1-4728e713abb8'::uuid and canonical_exercise_id = '95063cbd-ca22-4ec4-b2f5-49c32d0ecbfd'::uuid and video_url is distinct from '/videos/exercises/extension-jambes-machine.mp4?v=1';
update public.exercises_db set video_url = '/videos/exercises/extension-nuque-haltere.mp4?v=1'
where id = 'a5b3962a-d0f1-4c93-88e0-573474700521'::uuid and lower(name) = 'extension nuque haltère' and video_url is distinct from '/videos/exercises/extension-nuque-haltere.mp4?v=1';
