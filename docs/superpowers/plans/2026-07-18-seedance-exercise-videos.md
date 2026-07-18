# Seedance Exercise Video Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer, depuis un panel admin MoovX, les vidéos de démonstration manquantes des exercices via l'API Seedance 2.0, avec validation humaine avant publication dans le bucket `exercise-videos`.

**Architecture:** Un module serveur `lib/seedance/client.ts` encapsule les 2 appels HTTP Seedance (createTask/getTask). Quatre routes `app/api/admin/seedance/*` (protégées `verifyAdmin`) orchestrent : génération de prompt (Claude), création de tâche, polling de statut, publication (download → upload bucket → update DB). Une table `seedance_jobs` trace chaque génération. Une page admin `app/admin/exercises-videos` (polling côté navigateur) pilote le flux.

**Tech Stack:** Next.js App Router (route handlers), TypeScript, Supabase (`supabaseAdmin` service_role, Storage), `@anthropic-ai/sdk`, Vitest.

## Global Constraints

- Auth admin : chaque route `app/api/admin/seedance/*` appelle `verifyAdmin(req)` EN PREMIER, catch via `handleAdminAuthError(e)`. Verbatim depuis `lib/admin/auth.ts`.
- Accès DB dans les routes admin : client `supabaseAdmin` de `@/lib/supabase/admin` (bypass RLS, `import 'server-only'`).
- Clé Seedance : `SEEDANCE_API_KEY` (`sk_live_…`), base `SEEDANCE_BASE_URL` défaut `https://api.seedance2.ai`. JAMAIS exposée au navigateur — aucun import de `lib/seedance/*` côté client.
- Fetch client admin : helper `adminFetch<T>(path, init)` de `@/lib/admin/api-client` (ajoute `Authorization: Bearer <access_token>`).
- Bucket cible : `exercise-videos`, chemin `{slug}/{slug}.mp4`, `video_url = publicUrl + '?v=' + Date.now()` (pattern `scripts/enrich-parent-exercises.mjs`).
- Défauts génération : modèle `seedance-2-0`, `resolution: '1080p'`, `aspect_ratio: '9:16'`, `duration: 5`, `seed: -1`.
- UI : tokens de `@/lib/design-tokens` (`cardStyle`, `titleStyle`+`titleLineStyle`, `btnPrimary`, `labelStyle`, `mutedStyle`), mobile-first, pas d'icône Trophy/Award. Convention page admin : `page.tsx` client + `_hooks/` + `_components/` + `PageHeader`.
- Tests : `npx vitest run <file>`. Fichiers dans `tests/unit/`.
- Commits : préfixes feat/fix/chore/docs/refactor, messages multi-lignes.

---

### Task 1: Module client Seedance (`lib/seedance/client.ts`)

**Files:**
- Create: `lib/seedance/client.ts`
- Test: `tests/unit/seedance-client.test.ts`

**Interfaces:**
- Consumes: env `SEEDANCE_API_KEY`, `SEEDANCE_BASE_URL`; global `fetch`.
- Produces:
  ```ts
  export type SeedanceModel = 'seedance-2-0' | 'seedance-2-0-fast' | 'seedance-2-0-mini'
  export type SeedanceGenerationType = 'text-to-video' | 'image-to-video'
  export type SeedanceStatus = 'queued' | 'generating' | 'completed' | 'failed'
  export interface SeedanceInput {
    prompt: string
    generation_type: SeedanceGenerationType
    image_urls?: string[]
    duration: number
    aspect_ratio: string
    resolution: string
    seed?: number
  }
  export interface CreateTaskResult { taskId: string; credits: number }
  export interface TaskResult {
    status: SeedanceStatus
    videoUrl: string | null
    expiresAt: string | null
    failedReason: string | null
  }
  export function createTask(model: SeedanceModel, input: SeedanceInput): Promise<CreateTaskResult>
  export function getTask(taskId: string): Promise<TaskResult>
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seedance-client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTask, getTask } from '@/lib/seedance/client'

const OLD_ENV = process.env

beforeEach(() => {
  process.env = { ...OLD_ENV, SEEDANCE_API_KEY: 'sk_test_abc', SEEDANCE_BASE_URL: 'https://api.seedance2.ai' }
})
afterEach(() => {
  process.env = OLD_ENV
  vi.restoreAllMocks()
})

describe('createTask', () => {
  it('POSTs to /v1/videos/generations with Bearer auth and returns taskId + credits', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ taskId: 'task_123', credits: 40 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await createTask('seedance-2-0', {
      prompt: 'demo', generation_type: 'text-to-video',
      duration: 5, aspect_ratio: '9:16', resolution: '1080p', seed: -1,
    })

    expect(res).toEqual({ taskId: 'task_123', credits: 40 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.seedance2.ai/v1/videos/generations')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer sk_test_abc')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('seedance-2-0')
    expect(body.input.prompt).toBe('demo')
  })

  it('throws when the API responds non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ error: 'bad key' }),
    }))
    await expect(createTask('seedance-2-0', {
      prompt: 'x', generation_type: 'text-to-video',
      duration: 5, aspect_ratio: '9:16', resolution: '1080p',
    })).rejects.toThrow('Seedance createTask failed (401)')
  })

  it('throws when SEEDANCE_API_KEY is missing', async () => {
    delete process.env.SEEDANCE_API_KEY
    await expect(createTask('seedance-2-0', {
      prompt: 'x', generation_type: 'text-to-video',
      duration: 5, aspect_ratio: '9:16', resolution: '1080p',
    })).rejects.toThrow('SEEDANCE_API_KEY is not configured')
  })
})

describe('getTask', () => {
  it('maps a completed task to videoUrl + expiresAt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'completed',
        data: { results: ['https://cdn.seedance2.ai/v/abc.mp4'], video_expires_at: '2026-07-19T00:00:00Z' },
      }),
    }))
    const res = await getTask('task_123')
    expect(res).toEqual({
      status: 'completed',
      videoUrl: 'https://cdn.seedance2.ai/v/abc.mp4',
      expiresAt: '2026-07-19T00:00:00Z',
      failedReason: null,
    })
  })

  it('maps a failed task to failedReason with null videoUrl', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'failed', failed_reason: 'content policy' }),
    }))
    const res = await getTask('task_123')
    expect(res).toEqual({ status: 'failed', videoUrl: null, expiresAt: null, failedReason: 'content policy' })
  })

  it('maps an in-progress task to null videoUrl', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ status: 'generating' }),
    }))
    const res = await getTask('task_123')
    expect(res.status).toBe('generating')
    expect(res.videoUrl).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seedance-client.test.ts`
Expected: FAIL — `Cannot find module '@/lib/seedance/client'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/seedance/client.ts`:

```ts
import 'server-only'

export type SeedanceModel = 'seedance-2-0' | 'seedance-2-0-fast' | 'seedance-2-0-mini'
export type SeedanceGenerationType = 'text-to-video' | 'image-to-video'
export type SeedanceStatus = 'queued' | 'generating' | 'completed' | 'failed'

export interface SeedanceInput {
  prompt: string
  generation_type: SeedanceGenerationType
  image_urls?: string[]
  duration: number
  aspect_ratio: string
  resolution: string
  seed?: number
}

export interface CreateTaskResult { taskId: string; credits: number }

export interface TaskResult {
  status: SeedanceStatus
  videoUrl: string | null
  expiresAt: string | null
  failedReason: string | null
}

function config() {
  const apiKey = process.env.SEEDANCE_API_KEY?.trim()
  if (!apiKey) throw new Error('SEEDANCE_API_KEY is not configured')
  const baseUrl = (process.env.SEEDANCE_BASE_URL?.trim() || 'https://api.seedance2.ai').replace(/\/$/, '')
  return { apiKey, baseUrl }
}

export async function createTask(model: SeedanceModel, input: SeedanceInput): Promise<CreateTaskResult> {
  const { apiKey, baseUrl } = config()
  const res = await fetch(`${baseUrl}/v1/videos/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Seedance createTask failed (${res.status}): ${body?.error || res.statusText}`)
  }
  const data = await res.json()
  return { taskId: data.taskId, credits: data.credits ?? 0 }
}

export async function getTask(taskId: string): Promise<TaskResult> {
  const { apiKey, baseUrl } = config()
  const res = await fetch(`${baseUrl}/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Seedance getTask failed (${res.status}): ${body?.error || res.statusText}`)
  }
  const data = await res.json()
  return {
    status: data.status,
    videoUrl: data.data?.results?.[0] ?? null,
    expiresAt: data.data?.video_expires_at ?? null,
    failedReason: data.failed_reason ?? null,
  }
}
```

Note : le test mocke `fetch` avant l'import effectif ; `import 'server-only'` est aliasé en no-op par la config Vitest existante (déjà utilisé par d'autres modules serveur testés). Si le test échoue sur `server-only`, ajouter `vi.mock('server-only', () => ({}))` en tête du fichier de test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/seedance-client.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/seedance/client.ts tests/unit/seedance-client.test.ts
git commit -m "feat(seedance): typed API client for createTask/getTask"
```

---

### Task 2: Helper slug + migration `seedance_jobs`

**Files:**
- Create: `lib/seedance/slug.ts`
- Test: `tests/unit/seedance-slug.test.ts`
- Create: `supabase/migrations/20260718150000_seedance_jobs.sql`

**Interfaces:**
- Produces: `export function slugify(str: string): string` (mêmes règles que `scripts/enrich-parent-exercises.mjs`).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seedance-slug.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { slugify } from '@/lib/seedance/slug'

describe('slugify', () => {
  it('lowercases, strips accents, hyphenates', () => {
    expect(slugify('Développé Couché Barre')).toBe('developpe-couche-barre')
  })
  it('trims leading/trailing separators and collapses runs', () => {
    expect(slugify('  Leg  Press!! ')).toBe('leg-press')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seedance-slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/seedance/slug.ts`:

```ts
export function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/seedance-slug.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/20260718150000_seedance_jobs.sql`:

```sql
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
```

- [ ] **Step 6: Apply + verify the migration (Supabase SQL Editor)**

Coller le contenu de la migration dans le SQL Editor Supabase (projet CoachPlatform) et exécuter. Puis vérifier :

```sql
-- 1. table créée + RLS active
select relname, relrowsecurity from pg_class where relname = 'seedance_jobs';
-- attendu : seedance_jobs | t

-- 2. insert via service_role fonctionne (dans le SQL editor = service_role)
insert into public.seedance_jobs (exercise_name, prompt, model, generation_type, task_id)
values ('TEST', 'p', 'seedance-2-0', 'text-to-video', 'task_test') returning id;

-- 3. cleanup
delete from public.seedance_jobs where exercise_name = 'TEST';
```

- [ ] **Step 7: Regenerate Supabase types**

Régénérer `lib/supabase/types.ts` (ou `database.types.ts`) pour inclure `seedance_jobs`, via la commande de génération de types du projet (voir `package.json` scripts, ex. `supabase gen types typescript`). Si aucune commande automatisée, ajouter le type `seedance_jobs` à la main dans `lib/supabase/types.ts` en suivant la forme des tables existantes.

- [ ] **Step 8: Commit**

```bash
git add lib/seedance/slug.ts tests/unit/seedance-slug.test.ts supabase/migrations/20260718150000_seedance_jobs.sql lib/supabase/types.ts
git commit -m "feat(seedance): slugify helper + seedance_jobs table migration"
```

---

### Task 3: Route prompt Claude (`POST /api/admin/seedance/prompt`)

**Files:**
- Create: `app/api/admin/seedance/prompt/route.ts`
- Test: `tests/unit/seedance-prompt-route.test.ts`

**Interfaces:**
- Consumes: `verifyAdmin` (`@/lib/admin/auth`), `Anthropic` (`@anthropic-ai/sdk`).
- Produces: `POST` — body `{ exerciseName: string; muscleGroup?: string; equipment?: string }` → `{ prompt: string }`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seedance-prompt-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
  AdminAuthError: class extends Error {},
}))

const createMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: createMock } },
}))

import { POST } from '@/app/api/admin/seedance/prompt/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
})

function req(body: unknown) {
  return new Request('http://x/api/admin/seedance/prompt', {
    method: 'POST', body: JSON.stringify(body),
  })
}

it('rejects non-admin', async () => {
  ;(verifyAdmin as any).mockRejectedValueOnce(new Error('forbidden'))
  const res = await POST(req({ exerciseName: 'Squat' }))
  expect(res.status).toBe(401)
})

it('returns a Claude-generated prompt for an authed admin', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createMock.mockResolvedValueOnce({ content: [{ type: 'text', text: 'Démo fitness du Squat, plan large...' }] })
  const res = await POST(req({ exerciseName: 'Squat', muscleGroup: 'Jambes' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.prompt).toContain('Squat')
  expect(createMock).toHaveBeenCalledOnce()
})

it('400 when exerciseName missing', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  const res = await POST(req({}))
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seedance-prompt-route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Write minimal implementation**

Create `app/api/admin/seedance/prompt/route.ts`:

```ts
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const body = await req.json().catch(() => ({}))
  const exerciseName = typeof body.exerciseName === 'string' ? body.exerciseName.trim() : ''
  if (!exerciseName) {
    return NextResponse.json({ error: 'exerciseName requis' }, { status: 400 })
  }
  const muscleGroup = typeof body.muscleGroup === 'string' ? body.muscleGroup : ''
  const equipment = typeof body.equipment === 'string' ? body.equipment : ''

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Tu écris un prompt en anglais pour un modèle de génération vidéo (Seedance) qui doit produire une démonstration d'un exercice de musculation.
Exercice : "${exerciseName}" (groupe musculaire : ${muscleGroup || 'non précisé'}, équipement : ${equipment || 'non précisé'}).
Le prompt doit décrire : un athlète réaliste exécutant UNE répétition lente et correcte du mouvement, salle de sport moderne épurée, éclairage neutre, plan qui montre bien la forme (angle de côté ou 3/4), fond simple, pas de texte à l'écran.
Réponds UNIQUEMENT avec le prompt en anglais, une seule ligne, sans guillemets ni préambule.`,
    }],
  })

  const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : ''
  if (!text) {
    return NextResponse.json({ error: 'Génération du prompt vide' }, { status: 502 })
  }
  return NextResponse.json({ prompt: text })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/seedance-prompt-route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/seedance/prompt/route.ts tests/unit/seedance-prompt-route.test.ts
git commit -m "feat(seedance): admin route to generate video prompt via Claude"
```

---

### Task 4: Route generate (`POST /api/admin/seedance/generate`)

**Files:**
- Create: `app/api/admin/seedance/generate/route.ts`
- Test: `tests/unit/seedance-generate-route.test.ts`

**Interfaces:**
- Consumes: `verifyAdmin`, `createTask` (Task 1), `supabaseAdmin` (`@/lib/supabase/admin`).
- Produces: `POST` — body `{ exerciseId?: string; exerciseName: string; prompt: string; model: SeedanceModel; generationType: SeedanceGenerationType; referenceImageUrl?: string; params: { duration: number; aspectRatio: string; resolution: string; seed?: number } }` → `{ jobId: string; taskId: string }`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seedance-generate-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))
const createTaskMock = vi.fn()
vi.mock('@/lib/seedance/client', () => ({ createTask: createTaskMock }))

const insertSingle = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({ insert: () => ({ select: () => ({ single: insertSingle }) }) }),
  },
}))

import { POST } from '@/app/api/admin/seedance/generate/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => vi.clearAllMocks())

function req(body: unknown) {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}
const validBody = {
  exerciseName: 'Squat', prompt: 'demo', model: 'seedance-2-0',
  generationType: 'text-to-video',
  params: { duration: 5, aspectRatio: '9:16', resolution: '1080p', seed: -1 },
}

it('rejects non-admin', async () => {
  ;(verifyAdmin as any).mockRejectedValueOnce(new Error('no'))
  const res = await POST(req(validBody))
  expect(res.status).toBe(401)
})

it('creates a Seedance task, inserts a job, returns ids', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createTaskMock.mockResolvedValueOnce({ taskId: 'task_9', credits: 40 })
  insertSingle.mockResolvedValueOnce({ data: { id: 'job_1' }, error: null })

  const res = await POST(req(validBody))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ jobId: 'job_1', taskId: 'task_9' })

  const [model, input] = createTaskMock.mock.calls[0]
  expect(model).toBe('seedance-2-0')
  expect(input.generation_type).toBe('text-to-video')
  expect(input.aspect_ratio).toBe('9:16')
})

it('passes image_urls for image-to-video', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createTaskMock.mockResolvedValueOnce({ taskId: 'task_9', credits: 40 })
  insertSingle.mockResolvedValueOnce({ data: { id: 'job_1' }, error: null })
  await POST(req({ ...validBody, generationType: 'image-to-video', referenceImageUrl: 'https://img/a.jpg' }))
  const [, input] = createTaskMock.mock.calls[0]
  expect(input.image_urls).toEqual(['https://img/a.jpg'])
})

it('400 on missing prompt', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  const res = await POST(req({ ...validBody, prompt: '' }))
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seedance-generate-route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Write minimal implementation**

Create `app/api/admin/seedance/generate/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createTask, type SeedanceInput, type SeedanceModel, type SeedanceGenerationType } from '@/lib/seedance/client'

export const dynamic = 'force-dynamic'

const MODELS: SeedanceModel[] = ['seedance-2-0', 'seedance-2-0-fast', 'seedance-2-0-mini']

export async function POST(req: Request) {
  let admin: { userId: string; email: string }
  try {
    admin = await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const body = await req.json().catch(() => ({}))
  const exerciseName = typeof body.exerciseName === 'string' ? body.exerciseName.trim() : ''
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  const model: SeedanceModel = MODELS.includes(body.model) ? body.model : 'seedance-2-0'
  const generationType: SeedanceGenerationType = body.generationType === 'image-to-video' ? 'image-to-video' : 'text-to-video'
  const p = body.params || {}
  const referenceImageUrl = typeof body.referenceImageUrl === 'string' ? body.referenceImageUrl : undefined

  if (!exerciseName || !prompt) {
    return NextResponse.json({ error: 'exerciseName et prompt requis' }, { status: 400 })
  }
  if (generationType === 'image-to-video' && !referenceImageUrl) {
    return NextResponse.json({ error: 'referenceImageUrl requis pour image-to-video' }, { status: 400 })
  }

  const input: SeedanceInput = {
    prompt,
    generation_type: generationType,
    duration: Number(p.duration) || 5,
    aspect_ratio: typeof p.aspectRatio === 'string' ? p.aspectRatio : '9:16',
    resolution: typeof p.resolution === 'string' ? p.resolution : '1080p',
    seed: typeof p.seed === 'number' ? p.seed : -1,
  }
  if (generationType === 'image-to-video' && referenceImageUrl) {
    input.image_urls = [referenceImageUrl]
  }

  let taskId: string
  try {
    const created = await createTask(model, input)
    taskId = created.taskId
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Seedance createTask failed' }, { status: 502 })
  }

  const { data, error } = await supabaseAdmin
    .from('seedance_jobs')
    .insert({
      created_by: admin.userId,
      exercise_id: typeof body.exerciseId === 'string' ? body.exerciseId : null,
      exercise_name: exerciseName,
      prompt,
      model,
      generation_type: generationType,
      params: input,
      reference_image_url: referenceImageUrl ?? null,
      task_id: taskId,
      status: 'queued',
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Insert job failed', taskId }, { status: 500 })
  }
  return NextResponse.json({ jobId: data.id, taskId })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/seedance-generate-route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/seedance/generate/route.ts tests/unit/seedance-generate-route.test.ts
git commit -m "feat(seedance): admin route to create generation task + track job"
```

---

### Task 5: Route status (`GET /api/admin/seedance/status`)

**Files:**
- Create: `app/api/admin/seedance/status/route.ts`
- Test: `tests/unit/seedance-status-route.test.ts`

**Interfaces:**
- Consumes: `verifyAdmin`, `getTask` (Task 1), `supabaseAdmin`.
- Produces: `GET` — query `?taskId=…` → `{ status: SeedanceStatus; videoUrl: string | null }`. Effet de bord : met à jour `seedance_jobs` (status, video_url_remote, error) via `.eq('task_id', taskId)`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seedance-status-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))
const getTaskMock = vi.fn()
vi.mock('@/lib/seedance/client', () => ({ getTask: getTaskMock }))

const updateEq = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: () => ({ update: () => ({ eq: updateEq }) }) },
}))

import { GET } from '@/app/api/admin/seedance/status/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => vi.clearAllMocks())
const url = (taskId?: string) =>
  new Request(`http://x/api/admin/seedance/status${taskId ? `?taskId=${taskId}` : ''}`)

it('rejects non-admin', async () => {
  ;(verifyAdmin as any).mockRejectedValueOnce(new Error('no'))
  const res = await GET(url('task_1'))
  expect(res.status).toBe(401)
})

it('400 when taskId missing', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  const res = await GET(url())
  expect(res.status).toBe(400)
})

it('returns status + videoUrl and updates the job on completed', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  getTaskMock.mockResolvedValueOnce({ status: 'completed', videoUrl: 'https://v/a.mp4', expiresAt: null, failedReason: null })
  const res = await GET(url('task_1'))
  expect(await res.json()).toEqual({ status: 'completed', videoUrl: 'https://v/a.mp4' })
  expect(updateEq).toHaveBeenCalledWith('task_id', 'task_1')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seedance-status-route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Write minimal implementation**

Create `app/api/admin/seedance/status/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTask } from '@/lib/seedance/client'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const taskId = new URL(req.url).searchParams.get('taskId')?.trim()
  if (!taskId) {
    return NextResponse.json({ error: 'taskId requis' }, { status: 400 })
  }

  let result
  try {
    result = await getTask(taskId)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Seedance getTask failed' }, { status: 502 })
  }

  await supabaseAdmin
    .from('seedance_jobs')
    .update({
      status: result.status,
      video_url_remote: result.videoUrl,
      error: result.failedReason,
    })
    .eq('task_id', taskId)

  return NextResponse.json({ status: result.status, videoUrl: result.videoUrl })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/seedance-status-route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/seedance/status/route.ts tests/unit/seedance-status-route.test.ts
git commit -m "feat(seedance): admin route to poll task status + sync job"
```

---

### Task 6: Route publish (`POST /api/admin/seedance/publish`)

**Files:**
- Create: `app/api/admin/seedance/publish/route.ts`
- Test: `tests/unit/seedance-publish-route.test.ts`

**Interfaces:**
- Consumes: `verifyAdmin`, `supabaseAdmin` (`.from('seedance_jobs')`, `.from('exercises_db')`, `.storage.from('exercise-videos')`), `slugify` (Task 2), global `fetch` (download).
- Produces: `POST` — body `{ jobId: string }` → `{ publishedVideoUrl: string }`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seedance-publish-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))

// Chainable supabaseAdmin mock
const jobSingle = vi.fn()
const exercisesUpdateEq = vi.fn().mockResolvedValue({ error: null })
const jobsUpdateEq = vi.fn().mockResolvedValue({ error: null })
const uploadMock = vi.fn().mockResolvedValue({ error: null })
const getPublicUrlMock = vi.fn().mockReturnValue({ data: { publicUrl: 'https://bucket/squat/squat.mp4' } })

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'seedance_jobs') {
        return {
          select: () => ({ eq: () => ({ single: jobSingle }) }),
          update: () => ({ eq: jobsUpdateEq }),
        }
      }
      // exercises_db
      return { update: () => ({ eq: exercisesUpdateEq }) }
    },
    storage: { from: () => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }) },
  },
}))

import { POST } from '@/app/api/admin/seedance/publish/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, arrayBuffer: async () => new ArrayBuffer(8),
  }))
})
const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

it('rejects non-admin', async () => {
  ;(verifyAdmin as any).mockRejectedValueOnce(new Error('no'))
  expect((await POST(req({ jobId: 'j1' }))).status).toBe(401)
})

it('downloads remote video, uploads to bucket, updates exercise, returns url', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  jobSingle.mockResolvedValueOnce({
    data: { id: 'j1', exercise_id: 'ex1', exercise_name: 'Squat', status: 'completed', video_url_remote: 'https://cdn/x.mp4' },
    error: null,
  })
  const res = await POST(req({ jobId: 'j1' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.publishedVideoUrl).toContain('https://bucket/squat/squat.mp4')
  expect(uploadMock).toHaveBeenCalledWith('squat/squat.mp4', expect.anything(), { contentType: 'video/mp4', upsert: true })
  expect(exercisesUpdateEq).toHaveBeenCalledWith('id', 'ex1')
})

it('409 when job not completed or has no remote url', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  jobSingle.mockResolvedValueOnce({ data: { id: 'j1', status: 'generating', video_url_remote: null }, error: null })
  expect((await POST(req({ jobId: 'j1' }))).status).toBe(409)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seedance-publish-route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Write minimal implementation**

Create `app/api/admin/seedance/publish/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { slugify } from '@/lib/seedance/slug'

export const dynamic = 'force-dynamic'
const BUCKET = 'exercise-videos'

export async function POST(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const body = await req.json().catch(() => ({}))
  const jobId = typeof body.jobId === 'string' ? body.jobId : ''
  if (!jobId) return NextResponse.json({ error: 'jobId requis' }, { status: 400 })

  const { data: job, error: jobErr } = await supabaseAdmin
    .from('seedance_jobs')
    .select('id, exercise_id, exercise_name, status, video_url_remote')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: 'Job introuvable' }, { status: 404 })
  if (job.status !== 'completed' || !job.video_url_remote) {
    return NextResponse.json({ error: 'Job non prêt à publier' }, { status: 409 })
  }

  // 1. Download remote video (URL expirable)
  const dl = await fetch(job.video_url_remote)
  if (!dl.ok) {
    return NextResponse.json({ error: `Download échoué (${dl.status}) — URL peut-être expirée` }, { status: 502 })
  }
  const bytes = new Uint8Array(await dl.arrayBuffer())

  // 2. Upload to bucket at {slug}/{slug}.mp4
  const slug = slugify(job.exercise_name)
  const storagePath = `${slug}/${slug}.mp4`
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: 'video/mp4', upsert: true })
  if (upErr) return NextResponse.json({ error: `Upload échoué : ${upErr.message}` }, { status: 500 })

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
  const publishedVideoUrl = `${pub.publicUrl}?v=${Date.now()}`

  // 3. Update exercises_db.video_url (si l'exo est lié)
  if (job.exercise_id) {
    const { error: exErr } = await supabaseAdmin
      .from('exercises_db')
      .update({ video_url: publishedVideoUrl })
      .eq('id', job.exercise_id)
    if (exErr) return NextResponse.json({ error: `Update exercice échoué : ${exErr.message}` }, { status: 500 })
  }

  // 4. Mark job published
  await supabaseAdmin
    .from('seedance_jobs')
    .update({ published_video_url: publishedVideoUrl })
    .eq('id', jobId)

  return NextResponse.json({ publishedVideoUrl })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/seedance-publish-route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/seedance/publish/route.ts tests/unit/seedance-publish-route.test.ts
git commit -m "feat(seedance): admin route to publish generated video to bucket + DB"
```

---

### Task 7: Hook orchestrateur UI (`useSeedanceStudio`)

**Files:**
- Create: `app/admin/exercises-videos/_hooks/useSeedanceStudio.ts`
- Test: `tests/unit/use-seedance-studio.test.ts`

**Interfaces:**
- Consumes: `adminFetch` (`@/lib/admin/api-client`).
- Produces:
  ```ts
  export type StudioPhase = 'idle' | 'generating' | 'preview' | 'publishing' | 'published' | 'error'
  export interface StudioState {
    phase: StudioPhase
    videoUrl: string | null
    error: string | null
  }
  export function useSeedanceStudio(): {
    state: StudioState
    generate(input: GenerateInput): Promise<void>
    publish(): Promise<void>
    reset(): void
  }
  export interface GenerateInput {
    exerciseId?: string
    exerciseName: string
    prompt: string
    model: string
    generationType: 'text-to-video' | 'image-to-video'
    referenceImageUrl?: string
    params: { duration: number; aspectRatio: string; resolution: string; seed?: number }
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/unit/use-seedance-studio.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const adminFetch = vi.fn()
vi.mock('@/lib/admin/api-client', () => ({ adminFetch: (...a: any[]) => adminFetch(...a) }))

import { useSeedanceStudio } from '@/app/admin/exercises-videos/_hooks/useSeedanceStudio'

beforeEach(() => vi.clearAllMocks())

const input = {
  exerciseId: 'ex1', exerciseName: 'Squat', prompt: 'demo', model: 'seedance-2-0',
  generationType: 'text-to-video' as const,
  params: { duration: 5, aspectRatio: '9:16', resolution: '1080p', seed: -1 },
}

it('generate → polls until completed → preview phase with videoUrl', async () => {
  adminFetch
    .mockResolvedValueOnce({ jobId: 'j1', taskId: 't1' })       // generate
    .mockResolvedValueOnce({ status: 'generating', videoUrl: null }) // poll 1
    .mockResolvedValueOnce({ status: 'completed', videoUrl: 'https://v/a.mp4' }) // poll 2

  const { result } = renderHook(() => useSeedanceStudio())
  await act(async () => { await result.current.generate(input) })

  await waitFor(() => expect(result.current.state.phase).toBe('preview'), { timeout: 3000 })
  expect(result.current.state.videoUrl).toBe('https://v/a.mp4')
})

it('publish → published phase', async () => {
  adminFetch
    .mockResolvedValueOnce({ jobId: 'j1', taskId: 't1' })
    .mockResolvedValueOnce({ status: 'completed', videoUrl: 'https://v/a.mp4' })
    .mockResolvedValueOnce({ publishedVideoUrl: 'https://bucket/x.mp4?v=1' })

  const { result } = renderHook(() => useSeedanceStudio())
  await act(async () => { await result.current.generate(input) })
  await waitFor(() => expect(result.current.state.phase).toBe('preview'))
  await act(async () => { await result.current.publish() })
  expect(result.current.state.phase).toBe('published')
})

it('failed task → error phase', async () => {
  adminFetch
    .mockResolvedValueOnce({ jobId: 'j1', taskId: 't1' })
    .mockResolvedValueOnce({ status: 'failed', videoUrl: null })

  const { result } = renderHook(() => useSeedanceStudio())
  await act(async () => { await result.current.generate(input) })
  await waitFor(() => expect(result.current.state.phase).toBe('error'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/use-seedance-studio.test.ts`
Expected: FAIL — hook module not found.

- [ ] **Step 3: Write minimal implementation**

Create `app/admin/exercises-videos/_hooks/useSeedanceStudio.ts`:

```ts
'use client'
import { useCallback, useRef, useState } from 'react'
import { adminFetch } from '@/lib/admin/api-client'

export type StudioPhase = 'idle' | 'generating' | 'preview' | 'publishing' | 'published' | 'error'

export interface StudioState { phase: StudioPhase; videoUrl: string | null; error: string | null }

export interface GenerateInput {
  exerciseId?: string
  exerciseName: string
  prompt: string
  model: string
  generationType: 'text-to-video' | 'image-to-video'
  referenceImageUrl?: string
  params: { duration: number; aspectRatio: string; resolution: string; seed?: number }
}

const POLL_MS = 10_000
const MAX_POLLS = 30 // ~5 min

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

export function useSeedanceStudio() {
  const [state, setState] = useState<StudioState>({ phase: 'idle', videoUrl: null, error: null })
  const jobIdRef = useRef<string | null>(null)

  const generate = useCallback(async (input: GenerateInput) => {
    setState({ phase: 'generating', videoUrl: null, error: null })
    try {
      const { jobId, taskId } = await adminFetch<{ jobId: string; taskId: string }>(
        '/api/admin/seedance/generate',
        { method: 'POST', body: JSON.stringify(input) },
      )
      jobIdRef.current = jobId

      for (let i = 0; i < MAX_POLLS; i++) {
        const s = await adminFetch<{ status: string; videoUrl: string | null }>(
          `/api/admin/seedance/status?taskId=${encodeURIComponent(taskId)}`,
        )
        if (s.status === 'completed' && s.videoUrl) {
          setState({ phase: 'preview', videoUrl: s.videoUrl, error: null })
          return
        }
        if (s.status === 'failed') {
          setState({ phase: 'error', videoUrl: null, error: 'La génération a échoué' })
          return
        }
        await sleep(POLL_MS)
      }
      setState({ phase: 'error', videoUrl: null, error: 'Timeout : génération trop longue' })
    } catch (e: any) {
      setState({ phase: 'error', videoUrl: null, error: e.message || 'Erreur de génération' })
    }
  }, [])

  const publish = useCallback(async () => {
    if (!jobIdRef.current) return
    setState((s) => ({ ...s, phase: 'publishing', error: null }))
    try {
      await adminFetch('/api/admin/seedance/publish', {
        method: 'POST', body: JSON.stringify({ jobId: jobIdRef.current }),
      })
      setState((s) => ({ ...s, phase: 'published' }))
    } catch (e: any) {
      setState((s) => ({ ...s, phase: 'error', error: e.message || 'Publication échouée' }))
    }
  }, [])

  const reset = useCallback(() => {
    jobIdRef.current = null
    setState({ phase: 'idle', videoUrl: null, error: null })
  }, [])

  return { state, generate, publish, reset }
}
```

Note : le test mocke `setTimeout` implicitement via des résolutions rapides ; `POLL_MS` reste réel mais le 2e poll renvoie `completed` donc `sleep` n'est atteint qu'une fois (10s). Pour accélérer le test, ajouter en tête du fichier de test `vi.useFakeTimers()` + avancer les timers, OU réduire l'attente en injectant `POLL_MS` via env de test. Version simple acceptée : garder le timeout de test à 15s (`{ timeout: 15000 }`) sur le 1er `waitFor` si les timers réels sont utilisés.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/use-seedance-studio.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/admin/exercises-videos/_hooks/useSeedanceStudio.ts tests/unit/use-seedance-studio.test.ts
git commit -m "feat(seedance): studio hook (generate→poll→preview→publish state machine)"
```

---

### Task 8: Route liste des exos sans vidéo (`GET /api/admin/seedance/exercises`)

**Files:**
- Create: `app/api/admin/seedance/exercises/route.ts`
- Test: `tests/unit/seedance-exercises-route.test.ts`

**Interfaces:**
- Consumes: `verifyAdmin`, `supabaseAdmin`.
- Produces: `GET` → `{ exercises: Array<{ id: string; name: string; muscle_group: string | null; equipment: string | null; gif_url: string | null }> }` (uniquement les exos où `video_url IS NULL`).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seedance-exercises-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))

const orderMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ is: () => ({ order: orderMock }) }) }),
  },
}))

import { GET } from '@/app/api/admin/seedance/exercises/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => vi.clearAllMocks())
const req = () => new Request('http://x/api/admin/seedance/exercises')

it('rejects non-admin', async () => {
  ;(verifyAdmin as any).mockRejectedValueOnce(new Error('no'))
  expect((await GET(req())).status).toBe(401)
})

it('returns exercises with null video_url', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  orderMock.mockResolvedValueOnce({
    data: [{ id: 'ex1', name: 'Squat', muscle_group: 'Jambes', equipment: 'Barre', gif_url: 'https://img/s.jpg' }],
    error: null,
  })
  const res = await GET(req())
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.exercises).toHaveLength(1)
  expect(json.exercises[0].name).toBe('Squat')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seedance-exercises-route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Write minimal implementation**

Create `app/api/admin/seedance/exercises/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const { data, error } = await supabaseAdmin
    .from('exercises_db')
    .select('id, name, muscle_group, equipment, gif_url')
    .is('video_url', null)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ exercises: data ?? [] })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/seedance-exercises-route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/seedance/exercises/route.ts tests/unit/seedance-exercises-route.test.ts
git commit -m "feat(seedance): admin route listing exercises without a video"
```

---

### Task 9: Page admin + composants + navigation + env

**Files:**
- Create: `app/admin/exercises-videos/page.tsx`
- Create: `app/admin/exercises-videos/_components/SeedanceStudio.tsx`
- Modify: `app/admin/_components/AdminSidebar.tsx` (ajouter le lien nav)
- Modify: `.env.example` (documenter les nouvelles vars)

**Interfaces:**
- Consumes: `useSeedanceStudio` (Task 7), `adminFetch`, la route `GET /api/admin/seedance/exercises` (Task 8), tokens `@/lib/design-tokens`, `PageHeader` (`../_components/PageHeader`).

- [ ] **Step 1: Créer le composant Studio**

Le composant charge la liste des exos sans vidéo (Task 8), laisse l'admin **choisir un exo** (ce qui fournit `exerciseId`, `exerciseName`, et pré-remplit l'URL d'image de référence depuis `gif_url` → image→vidéo automatique quand un thumbnail existe). Un champ image reste éditable pour override/upload d'URL ; vide = fallback texte→vidéo.

Create `app/admin/exercises-videos/_components/SeedanceStudio.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/admin/api-client'
import { cardStyle, labelStyle, mutedStyle, btnPrimary } from '@/lib/design-tokens'
import { useSeedanceStudio } from '../_hooks/useSeedanceStudio'

interface ExerciseLite {
  id: string
  name: string
  muscle_group: string | null
  equipment: string | null
  gif_url: string | null
}

export function SeedanceStudio() {
  const { state, generate, publish, reset } = useSeedanceStudio()
  const [exercises, setExercises] = useState<ExerciseLite[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [referenceImageUrl, setReferenceImageUrl] = useState('')
  const [model, setModel] = useState('seedance-2-0')
  const [resolution, setResolution] = useState('1080p')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [duration, setDuration] = useState(5)
  const [promptLoading, setPromptLoading] = useState(false)

  useEffect(() => {
    adminFetch<{ exercises: ExerciseLite[] }>('/api/admin/seedance/exercises')
      .then((d) => setExercises(d.exercises))
      .catch((e) => console.error('[seedance] load exercises', e.message))
  }, [])

  const selected = exercises.find((e) => e.id === selectedId)
  const generationType = referenceImageUrl.trim() ? 'image-to-video' : 'text-to-video'

  function onSelect(id: string) {
    setSelectedId(id)
    const ex = exercises.find((e) => e.id === id)
    setReferenceImageUrl(ex?.gif_url || '')
    setPrompt('')
  }

  async function autoPrompt() {
    if (!selected) return
    setPromptLoading(true)
    try {
      const { prompt: p } = await adminFetch<{ prompt: string }>('/api/admin/seedance/prompt', {
        method: 'POST',
        body: JSON.stringify({ exerciseName: selected.name, muscleGroup: selected.muscle_group, equipment: selected.equipment }),
      })
      setPrompt(p)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPromptLoading(false)
    }
  }

  function onGenerate() {
    if (!selected) return
    generate({
      exerciseId: selected.id,
      exerciseName: selected.name,
      prompt,
      model, generationType,
      referenceImageUrl: referenceImageUrl.trim() || undefined,
      params: { duration, aspectRatio, resolution, seed: -1 },
    })
  }

  const busy = state.phase === 'generating' || state.phase === 'publishing'

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 512, marginLeft: 'auto', marginRight: 'auto' }}>
      <div>
        <label style={labelStyle}>Exercice sans vidéo ({exercises.length})</label>
        <select value={selectedId} onChange={(e) => onSelect(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }}>
          <option value="">— Choisir un exercice —</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}{ex.muscle_group ? ` · ${ex.muscle_group}` : ''}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Image de référence (URL — active image→vidéo)</label>
        <input value={referenceImageUrl} onChange={(e) => setReferenceImageUrl(e.target.value)}
          placeholder="https://… (laisser vide = texte→vidéo)"
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
        <p style={mutedStyle}>Mode : {generationType}{selected?.gif_url ? ' — thumbnail pré-rempli' : ''}</p>
      </div>
      <div>
        <label style={labelStyle}>Prompt</label>
        <button type="button" onClick={autoPrompt} disabled={promptLoading || !selected}
          style={{ ...btnPrimary, marginBottom: 8, opacity: promptLoading || !selected ? 0.6 : 1 }}>
          {promptLoading ? 'Génération…' : 'Générer le prompt (Claude)'}
        </button>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={selectStyle}>
          <option value="seedance-2-0">seedance-2-0 (pro)</option>
          <option value="seedance-2-0-fast">fast</option>
          <option value="seedance-2-0-mini">mini</option>
        </select>
        <select value={resolution} onChange={(e) => setResolution(e.target.value)} style={selectStyle}>
          <option value="1080p">1080p</option>
          <option value="720p">720p</option>
          <option value="480p">480p</option>
        </select>
        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} style={selectStyle}>
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
          <option value="1:1">1:1</option>
        </select>
        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={selectStyle}>
          <option value={5}>5s</option>
          <option value={8}>8s</option>
          <option value={10}>10s</option>
        </select>
      </div>

      <button type="button" onClick={onGenerate} disabled={busy || !selected || !prompt.trim()}
        style={{ ...btnPrimary, opacity: busy || !selected || !prompt.trim() ? 0.6 : 1 }}>
        {state.phase === 'generating' ? 'Génération en cours (30s–2min)…' : 'Générer la vidéo'}
      </button>

      {state.error && <p style={{ color: '#ff6b6b' }}>{state.error}</p>}

      {state.phase === 'preview' && state.videoUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <video src={state.videoUrl} controls style={{ width: '100%', borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onGenerate} style={{ ...btnPrimary, background: '#333' }}>Régénérer</button>
            <button type="button" onClick={publish} style={btnPrimary}>Publier dans le bucket</button>
          </div>
        </div>
      )}

      {state.phase === 'published' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ color: '#4ade80' }}>✅ Publié — la vidéo est visible dans l'app.</p>
          <button type="button" onClick={reset} style={btnPrimary}>Nouvelle vidéo</button>
        </div>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  flex: 1, minWidth: 90, padding: 10, borderRadius: 8,
  border: '1px solid #333', background: '#111', color: '#fff',
}
```

- [ ] **Step 2: Créer la page**

Create `app/admin/exercises-videos/page.tsx`:

```tsx
'use client'
import { PageHeader } from '../_components/PageHeader'
import { SeedanceStudio } from './_components/SeedanceStudio'

export default function ExercisesVideosPage() {
  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Vidéos exercices"
        description="Générer les démonstrations manquantes via Seedance"
      />
      <SeedanceStudio />
    </div>
  )
}
```

- [ ] **Step 3: Ajouter le lien dans la sidebar**

Dans `app/admin/_components/AdminSidebar.tsx` :

1. Ajouter `Video` à l'import lucide-react en tête de fichier (là où sont importés `LayoutGrid, Users, DollarSign, MessageSquare, Megaphone, ScrollText`) :

```tsx
import { LayoutGrid, Users, DollarSign, MessageSquare, Megaphone, ScrollText, Video } from 'lucide-react'
```

(Adapter à la ligne d'import réelle — ajouter seulement `, Video` à la liste existante.)

2. Ajouter une entrée dans le tableau `NAV` (après la ligne `{ href: '/admin/logs', label: 'Logs', icon: ScrollText },`) :

```tsx
{ href: '/admin/exercises-videos', label: 'Vidéos', icon: Video },
```

- [ ] **Step 4: Vérifier compilation + lint typecheck**

Run: `npx tsc --noEmit`
Expected: 0 erreur sur les fichiers créés (les erreurs préexistantes non liées sont hors scope).

- [ ] **Step 5: Documenter les env vars**

Modifier `.env.example` (le créer s'il n'existe pas) en ajoutant :

```
# Seedance 2.0 (génération vidéos exercices — admin)
SEEDANCE_API_KEY=sk_live_xxx
SEEDANCE_BASE_URL=https://api.seedance2.ai
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/exercises-videos .env.example app/admin/_components/AdminSidebar.tsx
git commit -m "feat(seedance): admin studio page, nav link, env docs"
```

---

### Task 10: Vérification globale + E2E manuel

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: tous les tests passent (baseline 980 + nouveaux ~25), 0 échec.

- [ ] **Step 2: Configurer les secrets réels**

Ajouter dans `.env.local` (local) ET dans Vercel (Preview + Production) :
- `SEEDANCE_API_KEY=sk_live_…`
- `SEEDANCE_BASE_URL=https://api.seedance2.ai`

- [ ] **Step 3: E2E sur compte admin**

1. Lancer l'app (`npm run dev`), se connecter avec le compte admin.
2. Aller sur `/admin/exercises-videos`.
3. Saisir un exercice de test (ex : « Développé Couché Barre »), cliquer « Générer le prompt (Claude) », vérifier qu'un prompt anglais apparaît et est éditable.
4. Cliquer « Générer la vidéo », vérifier le polling puis l'apparition de la preview `<video>`.
5. Tester « Régénérer » (nouvelle vidéo).
6. Cliquer « Publier », vérifier le message ✅.
7. Vérifier dans Supabase : ligne dans `seedance_jobs` (status `completed`, `published_video_url` renseigné), objet dans le bucket `exercise-videos/{slug}/{slug}.mp4`, `exercises_db.video_url` mis à jour.
8. Vérifier la lecture de la vidéo côté app (fiche exercice) sur iPhone.

- [ ] **Step 4: Commit final (docs vivants)**

Mettre à jour `docs/SESSION_LOG.md`, `ROADMAP.md`, `NEXT.md` (rituel de fin de session MoovX), puis :

```bash
git add docs/SESSION_LOG.md ROADMAP.md NEXT.md
git commit -m "docs(seedance): session log + roadmap update"
```

- [ ] **Step 5: Finaliser la branche**

Utiliser le skill `superpowers:finishing-a-development-branch` pour décider merge / PR vers `main`.

---

## Notes d'implémentation

- **Ordre des tâches** : 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Les tâches 3–6 et 8 (routes) sont indépendantes entre elles une fois 1 et 2 faites ; 7 dépend de 4/5/6 ; 9 (UI) dépend de 7 et 8.
- **`server-only` en test** : si un fichier serveur importé casse un test, ajouter `vi.mock('server-only', () => ({}))` en tête (pattern déjà présent ailleurs dans `tests/unit/`).
- **Sécurité** : la clé Seedance ne transite jamais par le client ; toutes les routes sont `verifyAdmin`. Auditer via l'agent `security-auditor` après la Task 6.
