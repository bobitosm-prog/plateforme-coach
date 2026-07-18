# Design — Intégration Seedance (génération des vidéos d'exercices manquantes)

**Date :** 2026-07-18
**Auteur :** Marco Ferreira (via Claude Code)
**Statut :** Design validé, prêt pour plan d'implémentation

## Objectif

Générer, depuis un panel admin de MoovX, les vidéos de démonstration manquantes
des exercices de `exercises_db`, via l'API Seedance 2.0 (fournisseur
`seedance2.ai`). Priorité : **qualité technique** des démos (le mouvement doit
être correct), pas coût ni vitesse — ce sont des assets de bibliothèque générés
une seule fois et réutilisés par tous les utilisateurs.

Résultat attendu : un exo sans vidéo → génération → validation à l'œil →
publication dans le bucket `exercise-videos` → `exercises_db.video_url` renseigné
→ vidéo visible dans l'app.

## Contexte existant

- Table `exercises_db` avec colonnes `name`, `video_url`, `gif_url`.
- Bucket Supabase `exercise-videos`, structure de chemin `{slug}/{slug}.mp4`.
- Pipeline manuel existant : `scripts/enrich-parent-exercises.mjs` (upload +
  update DB, versioning par `?v=timestamp`).
- Admin : pages sous `app/admin/`, routes sous `app/api/admin/`, auth via
  `verifyAdmin(req)` + client `supabaseAdmin` (service_role, bypass RLS).
- `ANTHROPIC_API_KEY` déjà présent (génération de prompt via Claude possible).

## Contrat API Seedance (vérifié le 2026-07-18)

- **Base URL :** `https://api.seedance2.ai`
- **Créer une tâche :** `POST /v1/videos/generations`
  - Auth : header `Authorization: Bearer sk_live_…`
  - Body :
    ```json
    {
      "model": "seedance-2-0",
      "input": {
        "prompt": "…",
        "generation_type": "image-to-video | text-to-video",
        "image_urls": ["https://…"],
        "duration": 5,
        "aspect_ratio": "9:16",
        "resolution": "1080p",
        "seed": -1
      }
    }
    ```
  - Réponse : `{ "taskId": "…", "credits": <int> }`
- **Récupérer le résultat (poll) :** `GET /v1/tasks/{taskId}`
  - Réponse : `status` (`queued|generating|completed|failed`),
    `data.results` (tableau d'URL vidéo), `data.video_expires_at`,
    `failed_reason`.
- **Async :** création → `taskId` immédiat → poll ≤ 1×/10s jusqu'à état terminal.
- ⚠️ **L'URL vidéo expire** (`video_expires_at`) → il faut télécharger et
  re-héberger dans le bucket, pas stocker le lien distant.

## Décisions de design (arbitrées)

| Sujet | Décision | Raison |
|-------|----------|--------|
| Où / qui | Panel admin `app/admin/exercises-videos`, `verifyAdmin` only | « visible directement ici », usage ponctuel par Marco |
| Async | Polling côté navigateur (pas de webhook en v1) | Zéro infra webhook, appels serverless courts, usage one-shot |
| Prompt | Auto via Claude, éditable avant génération | Meilleure qualité/cohérence, `ANTHROPIC_API_KEY` déjà là |
| Type de génération | **image→vidéo** si l'exo a une image de référence, sinon upload manuel, sinon **texte→vidéo** (fallback) | Image→vidéo = mouvement bien plus fiable qu'un humain inventé |
| Modèle / réso | `seedance-2-0` (pro) / `1080p` | Asset unique réutilisé par tous → qualité maximale |
| Ratio / durée | `9:16` portrait / `5s` | Cohérent mobile (vraie cible) |
| Garde-fou | Preview obligatoire + « Régénérer » avant publication | Les démos IA doivent être validées à l'œil avant exposition client |

## Architecture

### Secrets (env, jamais commités)
- `SEEDANCE_API_KEY` = `sk_live_…`
- `SEEDANCE_BASE_URL` = `https://api.seedance2.ai` (défaut, overridable)

La clé n'est **jamais** exposée au navigateur : tous les appels Seedance passent
par les routes serveur.

### Module `lib/seedance/client.ts`
Encapsule et type les deux appels HTTP :
- `createTask(input): Promise<{ taskId, credits }>`
- `getTask(taskId): Promise<{ status, videoUrl | null, expiresAt | null, failedReason | null }>`

Responsabilité unique : parler à Seedance. Testable en isolation (fetch mické).
Aucune dépendance à Supabase ni à Next.

### Table `seedance_jobs`
Traçabilité + reprise si l'onglet est fermé pendant la génération.

```
id                   uuid pk default gen_random_uuid()
created_at           timestamptz default now()
created_by           uuid            -- admin uid
exercise_id          uuid null       -- fk exercises_db (nullable)
exercise_name        text
prompt               text
model                text
generation_type      text            -- image-to-video | text-to-video
params               jsonb           -- duration, aspect_ratio, resolution, seed…
reference_image_url  text null       -- image de départ (thumbnail ou upload)
task_id              text
status               text            -- queued|generating|completed|failed
video_url_remote     text null       -- URL Seedance (expire)
published_video_url  text null       -- URL bucket après publication
error                text null
```

RLS : lecture/écriture réservées `super_admin` (cohérent avec le pattern MoovX ;
safety check via `auth.uid()` + rôle). Accès applicatif via `supabaseAdmin`
(service_role) dans les routes déjà protégées par `verifyAdmin`.

### Routes API (toutes `verifyAdmin` + `supabaseAdmin`)

1. `POST /api/admin/seedance/prompt`
   - In : `{ exerciseName, muscleGroup? }`
   - Out : `{ prompt }` — Claude produit un prompt de démo fitness (angle
     caméra, mouvement, 1 répétition lente, fond neutre). Réutilise le pattern
     de `generate-exercise-instructions`.

2. `POST /api/admin/seedance/generate`
   - In : `{ exerciseId?, exerciseName, prompt, model, params, generationType, referenceImageUrl? }`
   - Action : `createTask(...)`, insert `seedance_jobs` (status initial), retour.
   - Out : `{ jobId, taskId }`

3. `GET /api/admin/seedance/status?taskId=…`
   - Action : `getTask(taskId)`, met à jour le job (`status`,
     `video_url_remote`, `error`).
   - Out : `{ status, videoUrl }`

4. `POST /api/admin/seedance/publish`
   - In : `{ jobId }`
   - Action : télécharge `video_url_remote` → upload
     `exercise-videos/{slug}/{slug}.mp4` → `exercises_db.video_url =
     publicUrl?v=timestamp` → marque le job publié (`published_video_url`).
   - Out : `{ publishedVideoUrl }`
   - Le `slug` est dérivé du nom de l'exo (même `slugify` que le script enrich).

### Flux complet

```
Liste exos sans video_url
  └─ choix d'un exo
      ├─ [Prompt auto Claude]  → champ éditable
      ├─ image de référence : thumbnail auto | upload manuel | aucune (→ texte→vidéo)
      ├─ [Générer]  → POST generate → { jobId, taskId }
      │     └─ poll GET status /10s jusqu'à completed|failed (timeout ~5 min)
      ├─ completed → <video> preview
      │     ├─ [Régénérer]  (nouvelle seed) → retour Générer
      │     └─ [Publier]   → POST publish → download + upload bucket + update DB
      └─ ✅ video_url renseigné → visible dans l'app
```

## Gestion d'erreurs

- Seedance `failed` → afficher `failed_reason`, job en `failed`, régénération
  possible.
- Timeout génération (> ~5 min sans état terminal) → arrêt du poll + message ;
  `task_id` conservé → reprise du poll possible plus tard.
- Échec download/upload à la publication → job reste `completed` non publié,
  re-publiable tant que `video_url_remote` n'a pas expiré ; sinon régénérer.
- Erreur clé / HTTP Seedance → 500 propre côté route, log via le système
  `log-error` existant. La clé n'apparaît jamais dans une réponse.

## Tests

- `lib/seedance/client.ts` : tests unitaires (fetch mické) — `createTask`,
  `getTask`, mapping des statuts, gestion des erreurs HTTP.
- Routes : test d'auth (usurpation non-admin rejetée) + happy path mické.
- E2E manuel sur compte admin en prod : générer 1 exo test → régénérer →
  publier → vérifier lecture sur iPhone (vraie cible).

## UI / Design system

- Tokens `lib/design-tokens.ts` : `cardStyle`, `titleStyle` (tiny GOLD
  letter-spaced au-dessus de la card + `titleLineStyle`), `btnPrimary`,
  `labelStyle`. Mobile-first. Pas d'icône Trophy/Award.
- Liste : cards des exos sans vidéo.
- Panel génération : prompt éditable, zone image de référence
  (thumbnail/upload), selects (modèle / durée / résolution / ratio),
  `<video>` de preview, boutons Régénérer / Publier.

## Hors périmètre (v1)

- Webhook Seedance (`callback_url`) — polling suffit pour un usage admin ponctuel.
- Génération exposée aux clients/coachs (quota, coût par user, modération).
- Génération par lot automatique (batch) — v1 est exo par exo avec validation
  humaine.

## Risques connus

- **Qualité anatomique** du texte→vidéo : mitigé par image→vidéo par défaut +
  garde-fou humain (preview avant publication). Reste le risque principal.
- **Coût crédits** Seedance par génération (`credits` dans la réponse) : à
  surveiller ; hors quota v1 car usage admin maîtrisé.
- **Expiration** des URL distantes : mitigée par publication (re-hébergement)
  immédiate ; job re-publiable tant que non expiré.
