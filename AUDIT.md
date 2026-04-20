# AUDIT TECHNIQUE — MOOVX

> Date : 2026-04-20 | Branche : `main` | Commit : `5797929`

---

## 1. STACK & ARCHITECTURE

### Framework

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | **Next.js (App Router)** | 16.1.6 |
| Runtime | React | 19.2.3 |
| Langage | TypeScript | 5 |
| Styling | Tailwind CSS (via `@tailwindcss/postcss`) | 4 |
| Base de données | Supabase (PostgreSQL) | supabase-js 2.99.0 |
| Auth | Supabase Auth (`@supabase/ssr` + `auth-helpers-nextjs`) | 0.9.0 / 0.15.0 |
| Paiements | Stripe | 20.4.1 |
| IA | Anthropic Claude (`@anthropic-ai/sdk`) | 0.87.0 |
| Tests | Vitest + Testing Library | 4.1.2 |
| Déploiement | **Vercel** (serverless) + **PWA** (service worker) | — |

### TypeScript strict activé ?

**Oui.** `tsconfig.json` → `"strict": true`, target ES2017, module ESNext, résolution Bundler.

### Styling

Tailwind CSS 4 via `@tailwindcss/postcss`. Pas de config `tailwind.config.*` explicite (Tailwind v4 auto-détecte).
Design tokens centralisés dans `lib/design-tokens.ts` (13 KB) : couleurs, typo, espacements.
4 Google Fonts via `next/font` : Bebas Neue, Barlow Condensed, Outfit, DM Sans.

### State management

**Aucune librairie globale** (ni Redux, ni Zustand, ni Context global).
Pattern : hooks custom par domaine (`useClientDashboard`, `useCoachDashboard`, `useClientDetail`) + cache mémoire (`lib/cache.ts` avec TTL).
LocalStorage uniquement pour persister la session de workout active (`moovx_active_workout`).

### Data layer

Supabase direct via `createBrowserClient()` côté client et `SUPABASE_SERVICE_ROLE_KEY` côté API routes. Pas de Prisma, pas d'ORM.
Cache in-memory avec invalidation manuelle (`lib/profile-service.ts`, `lib/cache.ts`).

### Auth

Supabase Auth (JWT), refresh automatique via `onAuthStateChange()`.
Rôles : `client`, `coach`, `admin`, `super_admin` (stockés dans `profiles.role`).
RLS activé sur toutes les tables de données.
OAuth : Google + Apple configurés.

### Déploiement

- **Vercel** : `vercel.json` avec headers cache pour SW et manifest
- **PWA** : `public/manifest.json` (standalone, portrait, icônes 72→512px) + `public/sw.js` (cache `moovx-v3`, network-first, push notifications)
- Pas de Capacitor

### Top 15 dépendances (production)

| # | Package | Usage |
|---|---------|-------|
| 1 | `next` 16.1.6 | Framework |
| 2 | `react` 19.2.3 | UI |
| 3 | `@supabase/supabase-js` 2.99.0 | BDD + Realtime |
| 4 | `@anthropic-ai/sdk` 0.87.0 | IA (Claude) |
| 5 | `stripe` 20.4.1 | Paiements |
| 6 | `framer-motion` 12.38.0 | Animations |
| 7 | `recharts` 3.8.0 | Graphiques |
| 8 | `zod` 4.3.6 | Validation schemas |
| 9 | `react-hook-form` 7.71.2 | Formulaires |
| 10 | `date-fns` 4.1.0 | Dates |
| 11 | `lucide-react` 0.577.0 | Icônes |
| 12 | `xlsx` 0.18.5 | Import/export Excel |
| 13 | `web-push` 3.6.7 | Push notifications |
| 14 | `nodemailer` 8.0.5 | Emails |
| 15 | `@mediapipe/tasks-vision` 0.10.34 | Pose detection ML |

---

## 2. ARBORESCENCE

```
app/
├── (dashboard)/                    # Route group — dashboard client (layout protégé)
├── admin/                          # Panel admin (super_admin)
├── api/                            # 25 endpoints API (App Router route.ts)
│   ├── adapt-workout/              # Adaptation workout par IA
│   ├── analyze-body/               # Analyse corporelle photo (Claude Vision)
│   ├── analyze-meal-photo/         # Reconnaissance repas photo
│   ├── analyze-progress-photo/     # Comparaison photos progrès
│   ├── assign-coach/               # Lier client ↔ coach
│   ├── chat-ai/                    # Chat coaching IA (streaming)
│   ├── debug-auth/                 # Debug auth (dev)
│   ├── delete-account/             # Suppression compte RGPD
│   ├── food-barcode/               # Lookup code-barres (OpenFoodFacts)
│   ├── food-search/                # Recherche aliments (ANSES)
│   ├── generate-custom-program/    # Programme custom par IA
│   ├── generate-exercise-instructions/ # Guide technique exercice
│   ├── generate-meal-plan/         # Plan nutritionnel IA
│   ├── generate-program/           # Programme depuis template
│   ├── generate-recipe/            # Recette IA
│   ├── invite-client/              # Invitation client par email
│   ├── log-error/                  # Logging erreurs client-side
│   ├── send-notification/          # Dispatch push notification
│   ├── stripe/                     # Sous-routes Stripe
│   │   ├── check-account/          # Statut compte Connect
│   │   ├── checkout/               # Session paiement client
│   │   ├── coach-checkout/         # Abonnement coach
│   │   ├── connect/                # Onboarding Stripe Connect
│   │   ├── setup-products/         # Init produits Stripe
│   │   └── webhook/                # Events Stripe (signature)
│   └── suggest-exercise/           # Suggestion exercice IA
├── auth/
│   └── callback/                   # Callback OAuth Supabase
├── cgu/                            # Conditions générales
├── client/
│   └── [id]/                       # Vue détail client (côté coach)
│       ├── components/             # ClientOverview, ClientProgram, ClientNutrition…
│       └── hooks/                  # useClientDetail
├── coach/                          # Dashboard coach (8 onglets)
│   ├── components/                 # CoachProfile, CoachCalendar, CoachRevenue…
│   └── hooks/                      # useCoachDashboard
├── components/                     # Composants partagés (28 fichiers)
│   ├── modals/                     # WeightModal, MeasureModal, BmrModal…
│   ├── progress/                   # BodyAssessment, AnalysisDisplay
│   ├── tabs/                       # 6 onglets client (Home, Training, Nutrition…)
│   │   ├── nutrition/              # ImportPlanSheet
│   │   ├── profile/                # CoachSection, PaymentHistory, DeleteAccount
│   │   ├── progress/               # AnalysisDisplay, ActionBtn
│   │   └── training/               # ExerciseCard, ActiveBar, DayChips, RestDay…
│   ├── training/                   # ProgramBuilder (1280 lignes)
│   └── ui/                         # MetallicRing, MuscleHeatMap, GoldButton…
├── hooks/                          # 9 hooks custom (useClientDashboard, useMessages…)
├── join/                           # Page d'invitation/referral
├── landing/                        # Site marketing
│   └── components/                 # Hero, Pricing, FAQ, Testimonials…
├── login/                          # Page connexion
├── nutrition/                      # Page nutrition (route)
├── onboarding/                     # Onboarding fitness (6 étapes)
├── onboarding-coach/               # Onboarding coach (Stripe Connect)
├── onboarding-fitness/             # Setup fitness spécifique
├── onboarding-photo/               # Photo corporelle initiale
├── privacy/                        # Politique confidentialité
└── register-client/                # Inscription client par coach
```

**Dossiers hors `app/` :**

```
lib/                                # Logique métier & services (32 fichiers)
├── hooks/                          # useToast
└── utils/                          # food.ts
public/                             # Assets statiques (139 MB — vidéos/images exercices)
supabase/migrations/                # 80+ migrations SQL (2026-03-18 → 2026-04-20)
tests/unit/                         # Tests Vitest (3 fichiers, 139 lignes)
```

---

## 3. MODELE DE DONNÉES

### Tables détectées (45 tables)

#### Utilisateurs & Profils

| Table | Colonnes principales | Relations |
|-------|---------------------|-----------|
| **profiles** | `id` (= auth.uid), `full_name`, `email`, `role` (client/coach/admin/super_admin), `height`, `current_weight`, `target_weight`, `body_fat_pct`, `activity_level`, `tdee`, `calorie_goal`, `protein_goal`, `carbs_goal`, `fat_goal`, `objective`, `dietary_type`, `allergies`, `subscription_type`, `subscription_status`, `stripe_customer_id`, `stripe_account_id`, `coach_bio`, `coach_speciality`, `invited_by_coach`, `streak_current`, `streak_best` | 1:1 → `auth.users` |
| **coach_clients** | `id`, `coach_id`, `client_id`, `created_at` | FK → `auth.users` × 2 |
| **coach_notes** | `id`, `coach_id`, `client_id`, `content` | FK → `auth.users` × 2 |

#### Entraînement

| Table | Colonnes principales | Relations |
|-------|---------------------|-----------|
| **workout_sessions** | `id`, `user_id`, `name`, `notes`, `completed`, `duration_minutes`, `personal_records` (jsonb), `muscles_worked` (text[]) | FK → `auth.users` |
| **workout_sets** | `id`, `session_id`, `user_id`, `exercise_name`, `set_number`, `weight`, `reps`, `completed` | FK → `workout_sessions` |
| **exercises_db** | `id`, `name`, `muscle_group`, `equipment`, `description`, `tips`, `gif_url`, `video_url`, `variant_group`, `difficulty` | Référentiel (pas de user_id) |
| **training_programs** | `id`, `name`, `description`, `program` (jsonb), `is_template`, `coach_id` | FK → `auth.users` (nullable) |
| **user_programs** | `id`, `user_id`, `training_program_id`, `active`, `started_at` | FK → `training_programs` |
| **custom_programs** | `id`, `user_id`, `name`, `days` (jsonb), `is_active`, `source`, `scheduled`, `start_date`, `total_weeks`, `current_week`, `phases` (jsonb) | FK → `auth.users` |
| **client_programs** | `id`, `client_id`, `coach_id`, `program` (jsonb) | FK → `auth.users` × 2 |
| **custom_exercises** | `id`, `user_id`, `name`, `muscle_group`, `equipment`, `sets`, `reps`, `rest_seconds`, `is_private` | FK → `auth.users` |
| **scheduled_sessions** | `id`, `coach_id`, `client_id`, `scheduled_at`, `duration_minutes`, `session_type`, `status`, `completed` | FK → `profiles` × 2 |
| **cardio_sessions** | `id`, `user_id`, `type` (hiit/liss), `name`, `duration_min`, `calories_burned`, `exercises` (jsonb), `scheduled_date` | FK → `auth.users` |
| **personal_records** | `id`, `user_id`, `exercise_name`, `record_type` (1rm/max_reps/max_weight/best_volume), `value`, `unit`, `previous_value` | FK → `auth.users`, UNIQUE(user_id, exercise_name, record_type) |

#### Corps & Suivi

| Table | Colonnes principales | Relations |
|-------|---------------------|-----------|
| **weight_logs** | `id`, `user_id`, **`poids`** (numeric 5,1), `date` | FK → `auth.users`, UNIQUE(user_id, date) |
| **body_measurements** | `id`, `user_id`, `date`, `chest`, `waist`, `hips`, `biceps`, `thighs`, `calves` | FK → `auth.users` |
| **progress_photos** | `id`, `user_id`, `photo_url`, `view_type` (front/back/side), `date`, `ai_analysis`, `adjustments` (jsonb) | FK → `auth.users` |
| **body_assessments** | `id`, `user_id`, `photo_front_url`, `photo_back_url`, `photo_side_url`, `ai_assessment`, `muscle_balance` (jsonb), `weak_zones`, `strong_zones` (text[]) | FK → `auth.users` |
| **body_analyses** | `id`, `user_id`, `body_fat_estimate`, `lean_mass_estimate`, `strengths`, `improvements` (text[]), `symmetry_score`, `summary` | FK → `auth.users` |
| **daily_checkins** | `id`, `user_id`, `date`, `mood`, `note`, `sleep_hours` | FK → `auth.users`, UNIQUE(user_id, date) |

#### Nutrition

| Table | Colonnes principales | Relations |
|-------|---------------------|-----------|
| **food_items** | `id`, `name`, `brand`, `barcode`, `source` (fitness/ANSES), `calories`, `protein`, `carbs`, `fat`, `serving_size_g` | Référentiel |
| **custom_foods** | `id`, `user_id`, `name`, `brand`, `barcode`, **`calories`**, **`protein`**, **`carbs`**, **`fat`**, `serving_size_g`, `scan_count` | FK → `auth.users` |
| **community_foods** | `id`, `name`, `brand`, `barcode` (UNIQUE), **`calories_per_100g`**, **`protein_per_100g`**, **`carbs_per_100g`**, **`fat_per_100g`**, `fiber_per_100g`, `serving_size_g`, `verified`, `uses_count` | FK → `auth.users` (created_by) |
| **daily_food_logs** | `id`, `user_id`, `date`, `meal_type`, `food_id`, `custom_name`, `quantity_g`, `calories`, `protein`, `carbs`, `fat` | FK → `auth.users`, FK → `community_foods` (nullable) |
| **meal_plans** | `id`, `user_id`, `created_by`, `name`, `plan` (jsonb), `active` | FK → `auth.users` × 2 |
| **client_meal_plans** | `id`, `client_id`, `coach_id`, `plan` (jsonb) | FK → `auth.users` × 2 |
| **meal_tracking** | `id`, `user_id`, `date`, `meal_type`, `food_name`, `calories`, `protein`, `carbs`, `fat`, `quantity_g` | FK → `auth.users` |
| **recipes** | `id`, `user_id`, `title`, `category`, `prep_time_min`, `cook_time_min`, `servings`, `calories_per_serving`, `proteins_per_serving`, `carbs_per_serving`, `fat_per_serving`, `ingredients` (jsonb), `instructions` (jsonb), `tags` (text[]), `source` (ai/coach/user) | FK → `auth.users` |
| **saved_meals** | `id`, `user_id`, `name`, `meal_type`, `foods` (jsonb), `total_calories`, `total_protein`, `total_carbs`, `total_fat` | FK → `auth.users` |
| **water_intake** | `id`, `user_id`, `amount_ml`, `date` | FK → `auth.users` |

#### Communication & Gamification

| Table | Colonnes principales | Relations |
|-------|---------------------|-----------|
| **messages** | `id`, `sender_id`, `receiver_id`, `content`, `read` | FK → `profiles` × 2 |
| **exercise_feedback** | `id`, `client_id`, `coach_id`, `exercise_name`, `video_url`, `feedback`, `status` | FK → `auth.users` × 2 |
| **badges** | `id` (TEXT), `name`, `description`, `category`, `xp_reward`, `icon`, `condition_type`, `condition_value` | Référentiel |
| **user_badges** | `id`, `user_id`, `badge_id`, `earned_at`, `celebrated` | FK → `auth.users`, FK → `badges` |
| **user_xp** | `id`, `user_id` (UNIQUE), `total_xp`, `level`, `level_name`, `current_streak` | FK → `auth.users` |
| **activity_feed** | `id`, `user_id`, `coach_id`, `activity_type`, `title`, `description`, `metadata` (jsonb), `is_public` | FK → `auth.users` × 2 |

#### Système & Paiements

| Table | Colonnes principales | Relations |
|-------|---------------------|-----------|
| **push_subscriptions** | `id`, `user_id`, `subscription` (jsonb) | FK → `profiles` |
| **payments** | `id`, `client_id`, `coach_id`, `amount`, `currency` (CHF), `status`, `stripe_id` | FK → `auth.users` × 2 |
| **ai_usage_log** | `id`, `user_id`, `route`, `cost_estimate` | FK → `auth.users` |
| **app_logs** | `id`, `level` (info/warning/error/critical), `message`, `details` (jsonb), `user_id`, `page_url` | — |
| **bug_reports** | `id`, `user_id`, `user_email`, `type` (bug/amelioration/autre), `title`, `description`, `status`, `priority` | FK → `auth.users` |
| **daily_habits** | `id`, `user_id`, `date`, `habits` (jsonb) | FK → `auth.users` |

### Incohérences de nommage

| Problème | Sévérité | Détail |
|----------|----------|--------|
| **custom_foods vs community_foods** | CRITIQUE | `custom_foods` utilise `calories`, `protein`, `carbs`, `fat` ; `community_foods` utilise `calories_per_100g`, `protein_per_100g`, etc. Le code dans `useClientDetail.ts:252` requête `calories_per_100g` sur `custom_foods` → **colonnes inexistantes**. |
| **weight_logs.poids** | MINEUR | Colonne nommée en français (`poids`) alors que tout le reste du schéma est en anglais. Usage cohérent dans le code cependant. |
| **food_items.calories vs energy_kcal** | MOYEN | Table définie avec `calories` dans les migrations, mais certains endroits du code référencent `energy_kcal` (ex: `selectedFood.energy_kcal \|\| selectedFood.calories`). |
| **recipes : proteins_per_serving** | MINEUR | Utilise `proteins_per_serving` (pluriel) alors que `community_foods` utilise `protein_per_100g` (singulier). Incohérence de convention. |

---

*Fin du rapport d'audit.*
