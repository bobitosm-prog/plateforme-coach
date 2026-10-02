-- Apply only after all four static assets are live. Safe to run repeatedly.
do $$
begin
  if to_regclass('public.exercises_db') is null then
    raise exception 'public.exercises_db is required';
  end if;

  if not exists (select 1 from public.exercises_db where id = '15e5650c-a821-46a9-bf28-f1cfd859da38'::uuid and lower(name) = 'curl barre ez') then
    raise exception 'The canonical Curl barre EZ exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = '9be17796-5c34-4a82-bd91-7959f6350848'::uuid and lower(name) = 'curl haltères simultané') then
    raise exception 'The canonical Curl Haltères Simultané exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = '78f75306-d2b9-4457-8f1f-b2d45209ba67'::uuid and lower(name) = 'curl incliné') then
    raise exception 'The canonical Curl Incliné exercise was not found';
  end if;
  if not exists (select 1 from public.exercises_db where id = '88f3b1be-0a5e-4bf0-b501-8f42f3d85a3e'::uuid and lower(name) = 'curl à la machine') then
    raise exception 'The canonical Curl à la Machine exercise was not found';
  end if;
end
$$;

update public.exercises_db set video_url = '/videos/exercises/curl-barre-ez.mp4?v=1'
where id = '15e5650c-a821-46a9-bf28-f1cfd859da38'::uuid and lower(name) = 'curl barre ez'
  and video_url is distinct from '/videos/exercises/curl-barre-ez.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/curl-halteres-simultane.mp4?v=1'
where id = '9be17796-5c34-4a82-bd91-7959f6350848'::uuid and lower(name) = 'curl haltères simultané'
  and video_url is distinct from '/videos/exercises/curl-halteres-simultane.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/curl-incline.mp4?v=1'
where id = '78f75306-d2b9-4457-8f1f-b2d45209ba67'::uuid and lower(name) = 'curl incliné'
  and video_url is distinct from '/videos/exercises/curl-incline.mp4?v=1';

update public.exercises_db set video_url = '/videos/exercises/curl-machine.mp4?v=1'
where id = '88f3b1be-0a5e-4bf0-b501-8f42f3d85a3e'::uuid and lower(name) = 'curl à la machine'
  and video_url is distinct from '/videos/exercises/curl-machine.mp4?v=1';
