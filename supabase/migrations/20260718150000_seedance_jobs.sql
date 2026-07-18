-- seedance_jobs : traçabilité des générations vidéo Seedance (admin only)
create table if not exists public.seedance_jobs (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id) on delete set null,
  exercise_id         uuid references public.exercises_db(id) on delete set null,
  exercise_name       text not null,
  prompt              text not null,
  model               text not null,
  generation_type     text not null,
  params              jsonb not null default '{}'::jsonb,
  reference_image_url text,
  task_id             text not null,
  status              text not null default 'queued',
  video_url_remote    text,
  published_video_url text,
  error               text
);

create index if not exists seedance_jobs_task_id_idx on public.seedance_jobs (task_id);
create index if not exists seedance_jobs_created_at_idx on public.seedance_jobs (created_at desc);

alter table public.seedance_jobs enable row level security;

-- Aucune policy pour les rôles anon/authenticated : accès applicatif uniquement
-- via service_role (supabaseAdmin) dans des routes déjà protégées par verifyAdmin.
-- service_role bypass la RLS ; l'absence de policy verrouille tout le reste.
