# MoovX — Session Log

Historique des sessions de developpement marathon.

## ETAT ACTUEL

- **Date** : 2026-05-31
- **HEAD** : f71b88a
- **Working tree** : clean
- **Total commits Phase 6** : 18 (17 session 30 mai + 1 F6.B.2 31 mai)
- **Phase 5** : DONE (Weekly Diagnostic en prod)
- **Phase 6A** : DONE (meal plan auto-regen post-Apply validé E2E)
- **Phase 6B** : F6.B.0 DONE, F6.B.1 DONE, F6.B.2 DONE (variant_group 100% couverture)
- **Tâche en cours** : démarrer F6.B.3 (helper buildProgramParams ~1h)

---

## 2026-05-31 — Marathon Phase 6B (suite) — F6.B.2

**Branche** : `main`

### Contexte

Session 2 marathon Phase 6B. Plan : F6.B.2 + F6.B.3 + F6.B.5 (auto-gen post-onboarding). F6.B.4 (refacto core IA) gardé pour demain frais.

### Commits livrés (ordre chronologique)

| # | Hash | Sous-batch | Description |
|---|---|---|---|
| 1 | f71b88a | F6.B.2 | feat(training): compléter variant_group sur 23 exos restants |

### Phase 6B — F6.B.2 livré

Audit en profondeur révèle 46 variant_groups existants (vs ~20 visibles au Top 20 LIMIT hier). Tous les groupes envisagés (`glute_bridge`, `chest_press`, `gainage`, `leg_curl`, `kickback_fessiers`) existaient DÉJÀ. Migration finale : 23 UPDATE par ID idempotents vers groupes existants uniquement, 0 nouveau groupe créé.

**Couverture finale** : 178/178 exos taggués (100%).

### Tech debt #10 découvert

Fragmentation des variant_groups : `good_morning` + `stiff` + `rdl` + `deadlift` = même pattern hip hinge en 4 groupes distincts. Idem pour fessiers (3 groupes) et chest (6 groupes). Cette fragmentation limitera la qualité de substitution intelligente en F6.B.4. À consolider post F6.B.4.

---

## 2026-05-30 — Marathon Tech Debt + Phase 6A + Vision 6B + F6.B.0 + F6.B.1 (~8h)

**Branche** : `main`

### Contexte

Session marathon en 2 phases : matin = consolidation tech debt accumulée (TD-1 à TD-5), après-midi = livraison Phase 6A complète (Closed Loop AI nutrition) + écriture vision Phase 6B Training.

### Commits (ordre chronologique)

| # | Hash | Sous-batch | Description |
|---|---|---|---|
| 1 | 935afa6 | TD-2 code | fix(onboarding): init next_diagnostic_at to onboarding_completed_at + 7d |
| 2 | bb45291 | TD-2 data | chore(db): backfill next_diagnostic_at for 4 orphan users |
| 3 | faf0a23 | TD-1 code | fix(weekly-diagnostic): calcul week_start en TZ Europe/Zurich |
| 4 | 15cb5cb | TD-1 data | chore(db): backfill week_start dim→lun pour 4 diags |
| 5 | 8b01e34 | TD-3 code | fix(onboarding): capitalize full_name via helper unifié |
| 6 | 3524ece | TD-3 data | chore(db): backfill full_name capitalize via INITCAP |
| 7 | 04430a2 | TD-5 | refactor(analyze-body): pattern tool_use Anthropic |
| 8 | 2d46b02 | TD-4 | perf(cron): batch parallel concurrency=5 + maxDuration=300 |
| 9 | 8325f09 | F6.A.1 | feat(meal-plan): helper buildMealPlanParams |
| 10 | a16d76a | F6.A.2 | feat(weekly-diagnostic): auto-regen meal plan après Apply |
| 11 | 8a57f31 | C11 docs | docs: session 30 mai + Phase 6B Training vision |
| 12 | 6c68a74 | F6.B.0 | feat(training): normaliser exercises_db.equipment 43->6 enums |
| 13 | cfa48b7 | C13 docs F6.B.0 | docs: F6.B.0 livré (mise à jour 3 docs) |
| 14 | 1d77887 | F6.B.1a | feat(profile): ajouter colonnes equipment (training_location + home_equipment[]) |
| 15 | 51df602 | F6.B.1b | feat(onboarding): composant SoloStep7Equipment isolé |
| 16 | 0dfe488 | F6.B.1c | feat(onboarding): intégrer SoloStep7Equipment + renumber Recap 10->11 |

### Tech Debt résolus

| TD | Bug | Fix |
|----|-----|-----|
| TD-1 | week_start = dim au lieu de lun (calcul JS getDay+toISOString en TZ Geneva) | Intl.DateTimeFormat + Europe/Zurich + offset dynamique |
| TD-2 | 4 users orphelins sans next_diagnostic_at, invisibles du cron | Helper inline +7j dans 3 endpoints onboarding + backfill SQL |
| TD-3 | 2 users avec full_name mal capitalisé (`raki`, `JEan`) | Helper capitalizeFullName (Unicode \p{L} + accents) + backfill INITCAP |
| TD-4 | Cron timeout au-delà de 4 users (séquentiel) | Batch parallel concurrency=5 + maxDuration=300 (clamp 60s Hobby) |
| TD-5 | analyze-body regex JSON fragile + 2 system prompts contradictoires | Refacto tool_use Anthropic schema strict (unités explicites) |

### Phase 6A — Closed Loop AI Nutrition (F6.A.1 + F6.A.2)

Helper `lib/meal-plan/build-generation-params.ts` (89 lignes) + auto-regen meal plan dans handleApply du diagnostic. Test E2E validé sur compte test Jean : Apply → macros updatées → meal plan régénéré en 1m30 (SSE Opus 4.7 x 7 jours).

### Phase 6B — Vision Training documentée

`docs/PHASE_6B_TRAINING_VISION.md` (~600 lignes, 26K). Découpage en 7 sous-features F6.B.0 à F6.B.6, ~20-25h sur 5-7 sessions. Décisions structurantes prises : équipement maison standard (dumbbell + KB + band + bodyweight), 2 questions onboarding training_location + home_equipment[], périodisation 8 sem en 4 phases de 2 sem.

### Phase 6B — F6.B.0 livré en fin de session

Fondation Phase 6B Training : normalisation `exercises_db.equipment`.
- Helper `lib/training/equipment-normalize.ts` (Equipment type + EQUIPMENT_LEGACY_MAP 43 entrées)
- Migration SQL idempotente avec backup `equipment_legacy` + UPDATE CASE WHEN + CHECK constraint
- Appliquée en prod via Supabase SQL Editor, runtime validé
- Distribution finale : machine_gym 61 + barbell 41 + dumbbell 40 + bodyweight 32 + kettlebell 2 + band 2 (total 178)
- Capacité home_friendly : 76/178 = 43% du catalogue (à enrichir kettlebell+band en future itération)

### Phase 6B — F6.B.1 livré en fin de session (3 sous-batches)

Sous-feature F6.B.1 : profile équipement + onboarding step Equipment.
Découpée en 3 sous-batches bisect-friendly :

- **F6.B.1a** (C14) : migration `profiles.training_location` enum (home/gym/both) + `home_equipment text[]`. CHECK constraint + NOT NULL après backfill. 10 users existants backfillés avec `gym` + `[]`.
- **F6.B.1b** (C15) : composant `SoloStep7Equipment.tsx` isolé (Q1 radio location + Q2 multi-select home_equipment conditionnel). +4 icônes Lucide dans iconMap. PAS wiré dans OnboardingV2Content.
- **F6.B.1c** (C16) : intégration via Option C' (insertion step 10 Equipment AVANT Recap, Recap devient step 11). `git mv SoloStep10Recap -> SoloStep11Recap`. Save case 10 nouveau (training_location + home_equipment).

Test E2E validé runtime sur compte test Jean :
- Reset `onboarding_completed=false`, rejoue les 11 steps
- Step 10 Equipment affiche bien Q1 (radio) + Q2 dynamique (multi-select)
- Pre-fill OK (gym pré-sélectionné depuis DB)
- Save OK : `training_location='home', home_equipment=['dumbbell']`
- Step 11 Recap calcule macros + finalise (`onboarding_completed=true`)

### Gap UX découvert pendant test E2E

L'onboarding NE déclenche PAS automatiquement `/api/generate-meal-plan` ni `/api/generate-custom-program`. L'user finit ses 11 steps et arrive sur un dashboard vide. Doit cliquer manuellement "Générer mon plan" / "Générer mon programme".

C'est incohérent avec la vision Closed Loop AI Phase 6. Nouveau tech debt #9 :
- Trigger auto-gen meal_plan + programme à la fin de l'onboarding (case 11 save)
- Toast progress "On prépare ton plan personnalisé..."
- Sera adressé dans F6.B.5 (logique auto-gen, dépend de F6.B.4 refacto generate-custom-program pour equipment)

### Validations runtime

- TD-1 : test reproduction Node 8/8 cas pass
- TD-3 : test runtime 16/16 cas pass (FR, EN, accents, tirets, apostrophes)
- TD-5 : E2E UI manuel localhost analyse photo 6/6 champs cohérents
- TD-4 : E2E curl cron en 16.6s sur 1 user
- F6.A.1 : runtime Node 5/5 tests pass
- F6.A.2 : E2E réel sur Jean, meal plan régénéré 1m30, DB cohérente

### Anomalies découvertes mais NON corrigées

- 3 users (Marco/Maria/Raki) ont next_diagnostic_at = 2026-05-31 18h (ancien code F4d.10) au lieu de +7j strict. Inerte grâce à l'idempotency check du generator. À corriger si comportement visible.
- `currentMonday()` dans useClientDetail.ts a même bug TZ que TD-1 mais feature dormante (0 rows en prod). TODO documenté.
- Vercel sur plan Hobby = non-conforme ToS (commercial use). Décision : upgrade Pro à 10 clients payants.
- 7 nouveaux tech debts identifiés : voir ROADMAP "Sprint Tech Debt — backlog".

---

## 2026-05-29 — Sprint Phase 5 : Weekly AI Diagnostic (~7h)

**Branche** : `main`

### Contexte

Concurrent direct vs KAI Swiss "diagnostic hebdomadaire intelligent".
Sprint intense : 7 commits livrés en une session, 0 régression, validé runtime end-to-end.

### Commits

| # | Hash | Sous-batch | Description |
|---|---|---|---|
| 1 | b0eae0e | F4d.1 | Migration 5 endpoints vers Opus 4.7 (sonnet-4 obsolète) |
| 2 | 0432866 | F4d.2/3/4 | Table weekly_diagnostics (24 col) + endpoint + Opus 4.7 tool_use |
| 3 | 44009a3 | F4d.5 | UI WeeklyDiagnosticCard HomeTab (199L) |
| 4 | c253ba0 | F4d.6 | Page drill-down /weekly-diagnostic/[id] + Apply 1-click |
| 5 | 224f2d4 | F4d.7 | Refacto generator.ts + endpoint cron Bearer auth |
| 6 | 06ab1f1 | F4d.8 | Push notification web-push après INSERT |
| 7 | 9e8bd5a | F4d.10 | Architecture B cron individualise (next_diagnostic_at) |

### Architecture finale

- Table weekly_diagnostics (24 colonnes + 4 RLS policies + index)
- /api/weekly-diagnostic (session user) → délègue generator
- /api/weekly-diagnostic/cron (Bearer CRON_SECRET) → batch tous users due
- lib/weekly-diagnostic/generator.ts (logique métier réutilisable)
- pg_cron QUOTIDIEN 18h UTC + filter next_diagnostic_at <= NOW
- Push notification web-push réutilise infra existante (VAPID + push_subscriptions)
- Apply 1-click : updateProfile + invalidateProfileCache + cache.remove

### Différenciateurs vs KAI Swiss

- Score 0-100 calibré, data RÉELLE (vs estimations)
- Coherence flags pré-calculés serveur
- Tool_use Opus 4.7 (JSON garanti, pas regex fragile)
- Bouton "Appliquer ajustements" 1-click (vs prose vague)
- Rythme 7 jours STRICT par user (Architecture B)
- Multi-langue FR/EN/DE
- Honnêteté scientifique (reconnaît incertitudes data partielle)

### Economie validée

- $0.10 par diagnostic (3289 tokens Opus 4.7 tool_use)
- 1 diag/semaine/user = $0.43/user/mois
- Abonnement 10 CHF/mois = ratio 4% en IA (excellent)

---

## 2026-05-26 → 2026-05-29 — Sprint Onboarding v2 (~10h)

**Branche** : `main`

### Contexte

Route unifiée /onboarding-v2 avec branching intelligent SOLO (10 steps) vs INVITED (3 steps).
Migration legacy users, flag autoritatif onboarding_completed, calcul macros Mifflin-St Jeor.

### Commits

| # | Hash | Sous-batch | Description |
|---|---|---|---|
| 1 | ef9a48c | F4c.10 | Scaffold onboarding v2 (page + shared components + INVITED 3 steps) |
| 2 | 22b9442 | F4c.10b | Fix flow detection (subscription_type + coach_clients + RLS) |
| 3 | b58b3bc | F4c.10c | SOLO Steps 1-3 (Welcome, Profile, Body) |
| 4 | 9d02a90 | F4c.10d | SOLO Steps 4-8 + OptionCard factorisé |
| 5 | 1b73798 | F4c.10e-i | SOLO Steps 9-10 + accents FR + migration v1→v2 (proxy + hook) |

### Architecture

- State machine useReducer + auto-save par step
- Flow detection via profiles.subscription_type
- SOLO 10 steps : Welcome → Profile → Body → Goal → Activity → Sessions → Nutrition → Experience → Photo IA → Recap macros
- INVITED 3 steps : Profile → Avatar → Welcome
- proxy.ts + useClientDashboard : onboarding_completed flag autoritatif
- Legacy users (pre-2026-05-27) gardent checks v1
- lib/onboarding-options.ts : const arrays partagés v1/v2 avec id stable i18n
- +70 clés i18n (onboarding_v2.*)

---

## 2026-05-24 → 2026-05-25 — Sprint i18n marathon complet (~14h)

**Branche** : `main`

### Contexte

Couverture i18n app 48% → ~99%. 33 commits, 864 clés ajoutées, 178 exercices traduits EN/DE.

### Réalisé

- Sprint 6 : 5 phases (Badges, HomeTab, Training, Nutrition, Progress/Account)
- Closure fixes F1-F5 : résidus FR, Nav, AnalyticsSection Recharts, DB exercises, muscle_group
- F4a-F4c : 9 composants restants (TechniquePopup, ExerciseDetail, StartProgram, etc.)
- F5 : HeroSessionCard, Alternatives, MealsTab
- lib/i18n-exercise.ts + lib/i18n-muscle.ts helpers créés
- scripts/backfill-exercise-i18n.mjs : traduction IA batch 178 exercices

### Patterns architecturaux établis

- Sub-component extraction pour Provider context (NavAccountLabel pattern)
- Recharts Option B (data shape + dataKey EN, name prop traduit)
- Key-based const arrays ({ id, emoji } + t())
- Duck-typed helpers avec FR fallback

### Total clés : 1052 → 1916 (+864)

---

## 2026-05-24 — Sprint 6 i18n Phase 1+1.5 (Badges full coverage)

**Durée** : ~1h
**Branche** : `main`

### Réalisé

- Audit terrain Sprint 6 : 368 clés totales estimées sur ~14 fichiers
- Phase 1 + 1.5 consolidées en un commit (BadgesModal + BadgeCelebration + lib/check-badges.ts)
- Refacto architecture Option C : DB stocke keys, libellés via t()
- 64 clés ajoutées (20 badges × name+desc + 7 levels + 17 chrome modal)
- Total i18n keys : 1052 → 1116 (+6.1%)
- Progression i18n globale : ~48% → ~52%

### Décisions architecturales

- DB writes badges/levels stockent désormais les keys (streak_7, beginner), pas les libellés FR
- Évite la dette rétroactive : pas besoin de migrer la DB le jour où on ajoute une nouvelle langue
- Le mix FR/EN partiel sur un même écran est pire qu'un écran 100% FR — règle à appliquer pour les phases suivantes (finir un composant d'un coup, jamais "à moitié")

### Tech debt notée

- ProfileTab.tsx utilise encore b.name direct (l.505) → Phase 5
- Badges déjà attribués au compte test stockent les anciens libellés FR (impact zéro pré-launch, 0 client payant)
- TempoModal + TempoExecutor créés 22-23 mai sans i18n → Phase 3a
- 4 tabs en i18n partiel (HomeTab 64%, TrainingTab 68%, NutritionTab 45%, ProgressTab 37%) → cible Phase 2-5

### Stratégie session

Plan 5 phases proposé :
- Phase 1+1.5 (Badges) : DONE
- Phase 2 : HomeTab L2 (~33 clés)
- Phase 3 : Training a/b/c (~195 clés)
- Phase 4 : Nutrition L2 (~35 clés)
- Phase 5 : Progress + AccountTab (~90 clés)

### Commits

| # | Hash | Description |
|---|---|---|
| 1 | d3713b4 | feat(i18n): badges full coverage FR/EN/DE (64 keys total) |
| 2 | f3bb247 | feat(i18n): HomeTab full coverage FR/EN/DE (91 keys) |
| 3 | e4f11d5 | feat(i18n): Training small components FR/EN/DE (63 keys, 5 components) |
| 4 | afc3a96 | feat(i18n): WorkoutSession 100% FR/EN/DE (91 keys) |
| 5 | b536d38 | feat(i18n): ProgramBuilder 100% FR/EN/DE (94 keys) |
| 6 | 0b3bf36 | feat(i18n): Progress L2/L3 FR/EN/DE (98 keys, 3 components) |
| 7 | b0f4ecf | feat(i18n): AccountTab 100% FR/EN/DE (12 keys) |
| 8 | 660aa0d | feat(i18n): NutritionTab L2 FR/EN/DE (35 keys) |
| 9 | 58a5b42 | fix(i18n): NutritionTab + ProgressTab residual FR (28 keys) |
| 10 | 3ed8fa4 | fix(i18n): bottom nav + headers retour + MeasureModal (8 keys) |
| 11 | b723df4 | Revert "fix(i18n): bottom nav + headers retour + MeasureModal" |
| 12 | b7acd52 | fix(i18n): bottom nav + headers retour + MeasureModal v2 (8 keys) |
| 13 | 0fe1566 | fix(i18n): AnalyticsSection 100% FR/EN/DE (34 keys) |
| 14 | be3540a | feat(db): add i18n columns to exercises_db (F3.2) |
| 15 | a7f2faa | feat(i18n): add exercise i18n helper with FR fallback (F3.3.1) |
| 16 | 43c83a6 | feat(i18n): consume getExerciseName in Training cluster (F3.3.2) |
| 17 | 578e237 | feat(i18n): consume getExerciseName in AnalyticsSection (F3.3.3) |
| 18 | ff2c42b | feat(i18n): exercise i18n backfill script (F3.4) |
| 19 | 9bd45f3 | feat(i18n): muscle_group display + filters (F3.5a) |
| 20 | 262c5c8 | fix(i18n): muscle filter 'JAMBES' bug + AI priorities i18n (F3.5b) |
| 21 | 513ff83 | feat(i18n): TechniquePopup advanced training techniques (F4a) |
| 22 | 49293d9 | feat(i18n): ExerciseDetailModal residual FR strings (F4b) |
| 23 | e8781b0 | feat(i18n): StartProgramModal locale-aware date picker (F4c.1) |
| 24 | e57dde6 | feat(i18n): video feedback components (F4c.2) |
| 25 | b67fa6e | feat(i18n): ExerciseInfoPopup section labels + DB helpers wiring (F4c.3) |
| 26 | 9f6dd0f | feat(i18n): ShoppingList full i18n + aisle key/label separation (F4c.4) |
| 27 | 03a9aa3 | feat(i18n): NutritionPreferences full i18n with key-based arrays (F4c.5) |
| 28 | 59e500d | feat(i18n): RecipesSection + NutritionTab meal type display (F4c.6) |
| 29 | 6885966 | feat(i18n): TrainingTab residuals — toasts + buttons + dates (F4c.7) |
| 30 | cf391c3 | feat(i18n): NutritionTab Journal + Plan locale-aware days/dates (F4c.8) |
| 31 | 6b4d804 | fix(i18n): HeroSessionCard residual FR strings (F4c.9) |
| 32 | 4bee9a3 | fix(i18n): wire getExerciseName in Alternatives chips + results (F5b) |
| 33 | a5749f9 | fix(i18n): MealsTab section header + date locale (F5c) |

### Phase 2+2.5 — HomeTab full coverage (HomeTab L2)

**Réalisé** :
- HomeTab.tsx 100% i18n (auparavant 64% partiel)
- HomeHeader.tsx, NutritionCard.tsx, RecoveryModal.tsx → 100% i18n
- QUOTES const supprimée (53 lignes), wirée via t.raw('home.quotes.<cat>')
- Locale-aware dates (fr-CH / en-US / de-CH)
- 25 nouvelles quotes ajoutées et traduites pour atteindre parité 15/15/15
- ICU plurals : streakDays, exerciseCount
- +91 clés (65 P2 + 26 P2.5)

**Bug latent fixé** :
- Sprint 5J avait ajouté `home.quotes` EN/DE dans messages/*.json sans
  wirer getDailyQuote(). 6 jours de prod avec quote FR forcée pour tous
  les users — corrigé.

**Apprentissage** :
- Traduction sans wiring = dette latente invisible. Toute clé ajoutée
  dans messages doit avoir au moins un consommateur dans le même commit.

**Hors scope reporté** :
- "Séance libre" L.438 → vient du flow Training, traité Phase 3

### Phase 3a — Training small components (5 composants)

**Réalisé** :
- TempoModal.tsx + TempoExecutor.tsx : 100% i18n (composants neufs 22-23 mai
  qui n'avaient pas été i18n-isés à la création, dette corrigée)
- ExerciseLibrarySection.tsx : 100% i18n (bibliothèque exos + alternatives)
- SessionDetailModal.tsx : 100% i18n
- TrainingTab.tsx : calendar widget wired, date-fns locale-aware
- 63 clés ajoutées sous sous-namespaces training_tab.{tempo,library,sessionDetail,calendar}
- Convention namespace : "training_tab" pour composants app vs "training" pour landing

**Découverte importante** :
- Le grep ">[A-Z]" sur JSX ne détecte PAS les strings dans objets JS
  (const PHASES = [{ label: 'EXCENTRIQUE' }]). Pattern à corriger dans les
  prompts futurs : ajouter systématiquement grep "label: '[A-Z]" et
  "description: '[A-Z]" pour les const arrays.
- 3e fois ce sprint qu'on découvre une dette résiduelle qui demande un
  micro-batch correctif (Phase 1.5, Phase 2.5, Phase 3a-3) — pattern
  à anticiper pour Phase 3b/3c/4/5.

**DB FR comparisons préservées intentionnellement** :
- ws.title === 'Repos' (L.891), day.name === 'Repos' (L.677, 1070) → comparaisons
  sur valeurs DB stockées en FR, à NE PAS traduire (sinon casse logique métier)
- 'Séance libre' en day_name = DB value, equipment emojis = DB values

**Pattern technique** :
- buildPhases() déplacée de module-level vers inline dans le composant pour
  accéder au hook useTranslations. À reproduire pour autres helpers similaires.

### Phase 3b — WorkoutSession (cœur de l'app)

**Réalisé** :
- WorkoutSession.tsx : 1574L, 0% → 100% i18n
- CustomBuilder (sub-component interne) : wiré séparément
- 161 t() calls, 91 clés ajoutées sous training_tab.ws.*
- Sous-namespaces : chrome, exercise, restTimer, dialogs, done, empty, customBuilder
- ICU plurals : addExercises, deleteModal.withSets, done.setsCount
- Locale-aware dates (récap fin séance)

**Zones critiques 100% préservées** :
- Web Audio API : scheduleRestPeriodSounds, cancelScheduledSounds intacts
  (fix bug audio du 23 mai préservé)
- skipRest() cancel les sons schedulés (logique métier critique préservée)
- DB FR comparisons : WORKOUT_MUSCLE_FILTERS (DB muscle_group),
  difficulty === 'debutant'/'intermediaire', 'Séance libre' (custom_programs.name),
  equipment === 'Barre' (DB equipment)

**Découverte tech debt** :
- Incohérence vocab i18n repo-wide : "série" / "SERIE" / "sets" / "SETS" / "Séries"
  coexistent dans différents namespaces. À harmoniser dans un sprint "i18n vocab
  consolidation" post-launch (estim 8-10 fichiers).
- "Sets" et "Volume" laissés hardcodés dans WorkoutSession (anglicismes brand acceptés).

**Pattern technique** :
- Sub-component interne (CustomBuilder dans WorkoutSession) : useTranslations propre
  plutôt que t() via props. Plus propre quand sub-comp < 200L.

### Phase 3c — ProgramBuilder + cluster Training closed

**Réalisé** :
- ProgramBuilder.tsx : 1297L, 0% → 100% i18n
- 94 clés sous training_tab.builder.* (7 sous-namespaces)
- 135 t() calls

**3 catégories de strings distinguées** :
- Display : labels UI, boutons, dialogs (traduits)
- DB values : MUSCLE_OPTIONS, EQUIPMENT_OPTIONS, DAY_NAMES (préservés)
- Backend/AI : payloads /api/generate-custom-program (préservés FR)

**Cluster Training CLOSED** :
- 6 composants 100% i18n
- 248 clés totales sur cluster training_tab

### Phase 5a — Progress L2/L3 (3 composants)

**Réalisé** :
- ProgressTab.tsx : 37% → 100% i18n (107 t() calls)
- BodyAssessment.tsx : 0% → 100% i18n (23 t() calls)
- AbsCalculator.tsx : 0% → 100% i18n (31 t() calls)
- 98 clés sous progress.{tab, bodyAssessment, absCalc}

**Strings préservées intentionnellement** :
- BodyAssessment SECTIONS L.18-23 : titres utilisés comme regex markers
  pour parser la réponse AI (VUE D'ENSEMBLE, etc.)
- AbsCalculator L.96 : objective_mode values ('seche'/'bulk'/'maintien')
  envoyés au backend API

### Phase 5b — AccountTab + Sprint 6 CLOSED

**Réalisé** :
- AccountTab.tsx : 186L, 0% → 100% i18n (14 t() calls)
- 12 clés sous namespace account
- "Athena" préservé comme brand name (non traduit)

### Phase 4 — NutritionTab L2 (closure finale)

**Réalisé** :
- NutritionTab.tsx : 1216L, 45% → 100% i18n (61 nt() calls)
- 35 clés ajoutées sous nutrition_tab.*
- 7 sous-namespaces : chrome, macrosShort, macrosLong, mealMenu, saveMealPopup, copyMealPopup, savedMeals
- Réutilisation clés Sprint 5H existantes (macros.kcal/protein/carbs/fat)

**DB values préservées** :
- MEAL_ORDER / MEAL_LABELS (DB meal_type values)
- food.name, food.custom_name (DB daily_food_logs)
- defaultMealType="dejeuner" (DB value passée à BarcodeScanner)

### Sprint 6 i18n — BILAN FINAL UPDATED

15 composants 100% i18n :
- Badges cluster (2)
- HomeTab cluster (4)
- Training cluster (7 fichiers + 1 sub-component)
- Progress cluster (3)
- AccountTab
- NutritionTab (+couche 2)

**Stats finales** :
- Total clés : 1052 → 1600 (+548 clés, +52.1%)
- Progression i18n globale : ~48% → ~95%
- 8 phases : 1+1.5 / 2+2.5 / 3a / 3b / 3c / 5a / 5b / 4
- 0 régression TypeScript sur l'ensemble du sprint
- 0 incident sur logique critique (Web Audio, iOS recovery, DB values, AI prompts)

**Tech debt restante** :
- Migration noms exercices/aliments DB en FR → sprint dédié séparé
- Client view détaillée coach (~660L) — B2B, défère
- Incohérence vocab i18n repo-wide : "série/SERIE/sets/SETS/Séries" — sprint consolidation post-launch
- Sub-components nutrition/* hors NutritionTab top (FoodSearch, Recipes, BarcodeScanner, ShoppingList) si applicable → à vérifier post-launch

## Sprint i18n closure (post-Sprint 6) — corrections terrain

### Découverte
Tests user en mode EN sur prod ont révélé du FR résiduel sur :
- 5 sections entières ProgressTab (Transformation, Analyse IA, Mensurations,
  Bien-être, Records perso, Graphiques, Export)
- 6 strings NutritionTab (Liste de courses x2, Recommandé, modals scan meal)
- Bottom nav (label "Compte" hardcodé)
- Headers retour MessagesTab + ProfileTab
- MeasureModal entièrement non i18n

**Root cause** : Phase 4 et Phase 5a CC ont déclaré "0 string FR résiduelle"
basé sur grep avec regex {3,} qui a raté des libellés courts (Moy., HUMEUR)
et des sections entières dont le contenu était dans cardTitleAbove patterns.

### F1a — Correctifs NutritionTab + ProgressTab (DONE)

- NutritionTab.tsx : 6 strings résiduelles (Liste de courses x2, Recommandé,
  scan meal modal, REPRENDRE, AJOUTER TOUT)
- ProgressTab.tsx : 22 strings résiduelles (sections + chart legends + ANALYSIS_STEPS)
- Locale-aware date fixé (fr-FR hardcoded L.850 → useLocale)
- 28 clés ajoutées
- Total i18n keys : 1600 → 1628

**Apprentissage senior** :
- Le grep {3,} sur > rate les libellés courts. Toujours utiliser {2,} pour
  validation finale i18n.
- "cardTitleAbove" pattern (style avec <span style={cardTitleAbove}>X</span>)
  a été un point faible récurrent — CC n'a pas systématiquement matché ces
  cas. À ajouter explicitement dans les prompts futurs.

### F1b — Bottom nav + headers retour + MeasureModal (DONE)

- app/page.tsx : bottom nav "Compte" → t('common.navAccount')
  (Home/Training/Nutrition/Analytics laissés EN, décision brand universel)
- MessagesTab.tsx + ProfileTab.tsx : headers retour via t()
- MeasureModal.tsx : 100% i18n (title, fields, date, buttons, history)
- Locale-aware date formatting (fr → dateLocale)
- 8 clés ajoutées sous common.* et measureModal.*
- Total i18n keys : 1628 → 1636

**Tech debt loggée** :
- ProfileTab aria-label réutilise badges.backToAccount par CC (couplage accidentel
  entre namespaces sémantiquement non liés). À recoupler vers common.* dans le
  sprint vocab consolidation post-launch.

### F1b — REVERTED (régression critique app crash)

**Symptôme** :
Après commit 3ed8fa4, app crash au boot avec runtime error :
"Failed to call `useTranslations` because the context from
`NextIntlClientProvider` was not found."

**Root cause** :
CC a ajouté `const tc = useTranslations('common')` au TOP du composant
racine `CoachApp()` dans app/page.tsx L.48, AU-DESSUS du wrapper
`<ClientIntlProvider>` qui n'est rendu que dans le JSX en dessous.
Le hook est appelé hors contexte i18n → crash.

**Pattern violé** :
Sprint 5J avait explicitement noté : "Fix critique 0e8f856 :
ClientIntlProvider wraps tout l'app shell". Le hook useTranslations
ne peut être appelé QUE dans des composants rendus à l'intérieur
de ce provider.

**Action** :
- git revert 3ed8fa4 (commit b723df4 sur main)
- App reboot OK confirmé en local

**Apprentissage senior** :
- Pour app/page.tsx (composant racine) : NE PAS utiliser useTranslations
  directement au top. Soit déplacer le i18n dans un sous-composant rendu
  après ClientIntlProvider, soit utiliser getTranslations server-side
  (mais page.tsx est 'use client' donc impossible).
- À reprendre en F1b-v2 : pour le bottom nav et "Compte" hardcodé,
  refacto avec un sous-composant <BottomNav /> qui contient le hook,
  rendu après le provider.

### F1b-v2 — Nav + headers retour + MeasureModal (DONE après revert)

**Approche corrigée** :
- Extraction d'un sous-composant `<NavAccountLabel />` qui contient le hook
  useTranslations
- Rendu DANS le JSX de CoachApp, donc après le <ClientIntlProvider>
- CoachApp() racine n'appelle PAS useTranslations directement

**Réalisé** :
- app/page.tsx : nav label "Compte" via <NavAccountLabel /> sub-component
- MessagesTab.tsx + ProfileTab.tsx : header retour i18n
- MeasureModal.tsx : 100% i18n + locale-aware dates
- 8 clés ajoutées
- Total i18n keys : 1628 → 1636

**Test boot local validé** :
- npm run dev → ready
- GET / 200, render OK
- Logs : "app ok" confirmé par Marco

**Apprentissage senior** :
- Pour tout composant racine qui monte un Provider : NE PAS appeler les
  hooks de ce provider DANS ce composant racine. Solution = extraction
  sous-composant rendu après le mount.
- Test boot local OBLIGATOIRE avant commit pour tout fichier qui touche
  app/page.tsx (composant racine). Le compile silent OK ne garantit pas
  le runtime OK.

### F2 — AnalyticsSection (Recharts + dataKey refactor)

**Réalisé** :
- AnalyticsSection.tsx : 384L, 0% → 100% i18n (34 clés sous progress.analytics)
- Option B retenue : refactor data keys FR → EN (Proteines→protein, etc.)
- Recharts names traduits via t() pour legends/tooltips
- CustomTooltip locale-aware (toLocaleString sans fr-FR hardcoded)
- Date formats : { locale: fr } → { locale: dateLocale } (6 occurrences)
- Export CSV headers locale-aware
- ReferenceLine "Objectif" → t()
- Total i18n keys : 1636 → 1670

**Test runtime validé** :
- Graphe Macros affiche correctement après refactor dataKey (Option B)
- Validation visuelle : barres protein/carbs/fat alignées sur la data

**Apprentissage senior — Recharts** :
- dataKey doit MATCHER une propriété de l'objet data. Refactor minimal :
  garder dataKey FR + traduire seulement name (Option A) si data shape FR
  imposé par parent. Refactor propre : data shape + dataKey en EN keys
  techniques + name traduit via t() (Option B) — préférer quand possible.
- Pour AnalyticsSection : data transformation INTERNE au composant donc
  Option B propre et auto-contenue.

## F3 — Migration DB exercises_db + helpers i18n (DONE)

### Contexte initial
178 exercices stockés en FR uniquement dans exercises_db. Pour app EN/DE,
nécessité de soit traduire en DB, soit dans des dicts front.

### Découpe F3 en 6 sous-phases

**F3.1 — Audit DB**
- 178 exos, 12 muscle_group distincts, 7 categories, 43 equipment (chaos)
- 155 exos ont description, 66 ont tips, 0 ont instructions/execution_tips
- Décision : traduire name + description + tips via DB columns ; muscles/category/difficulty
  via mapping front ; equipment skip (chaos, sprint dédié)

**F3.2 — Migration SQL (be3540a)**
- ALTER TABLE additif : name_en/de, description_en/de, tips_en/de
- Migration file : supabase/migrations/20260525094500_add_exercise_i18n_columns.sql
- Appliqué en prod via SQL Editor Supabase

**F3.3.1 — Helper getExerciseName (a7f2faa)**
- lib/i18n-exercise.ts : duck-typed sur ExerciseI18nFields
- Fallback FR systématique si traduction null/empty
- 3 helpers : getExerciseName, getExerciseDescription, getExerciseTips
- Réutilise Locale de lib/seo.ts

**F3.3.2 — Adoption Training cluster (43c83a6)**
- 7 fichiers adaptés (WorkoutSession, ExerciseDetail/SearchModal, TrainingTab,
  TrainingExerciseCard, ExerciseLibrarySection, ProgramBuilder)
- 25 display wrappés, 49 DB/comparison préservés
- Pattern exerciseNameRaw vs exerciseNameDisplay pour cas mixtes

**F3.3.3 — Reste (578e237)**
- 1 fichier touché (AnalyticsSection PR cards)
- HomeTab/ProgressTab/CardioSection : aucun display name → skip

**F3.4 — Backfill IA (ff2c42b)**
- Script Node + Claude Opus 4.7 : scripts/backfill-exercise-i18n.mjs
- Modes : dry-run / --from-file / --apply / --resume
- 8 batches de 25 exos, ~$5 estimé (réel ~$3-4)
- Validation qualité sur 10 samples : "Barre au front" → "Skull crusher"
  + "Stirndrücken" (traduction métier, pas littérale) confirmée
- 178/178 noms EN/DE en DB, 155/155 desc, 66/66 tips
- translations-backfill.json gitignored (regenerable)

**F3.5a — muscle_group i18n (9bd45f3)**
- lib/i18n-muscle.ts : helper getMuscleLabel + MUSCLE_KEY_MAP (13 valeurs)
- namespace muscles.* (12 clés + cardio = 13)
- 19 display wrappés (5 fichiers Training)
- Filtres : label traduit, state reste FR pour DB compare
- MUSCLE_COLORS lookup préservé (key FR DB)

**F3.5b — Fix bug filtre "JAMBES" + AI priorities i18n (DONE)**

**Bug critique corrigé** :
ExerciseLibrarySection.tsx avait `DB_MUSCLES` (L.10) avec alias "Jambes"
mais le filter (L.67) faisait `e.muscle_group === muscle` strict. Donc
clic "Jambes" → 0 résultat → "No exercise found" alors qu'il y avait 60 exos.

**Architecture** :
- lib/i18n-muscle.ts étendu avec MUSCLE_ALIAS_TO_DB + matchMuscleFilter helper
- Aliases UI (Jambes/Bras/Poitrine) mappés vers muscle_group DB[] :
  - Jambes = [Quadriceps, Ischio-jambiers, Fessiers, Mollets]
  - Bras = [Biceps, Triceps]
  - Poitrine = [Pectoraux]
- ExerciseLibrarySection : DB_MUSCLES → MUSCLE_FILTER_VALUES,
  filter refactoré via matchMuscleFilter
- ProgramBuilder MUSCLE_OPTIONS (AI priorities) : affichage traduit
  via getMuscleLabel, state FR préservé pour payload AI backend
- +2 clés muscles.* (legs, arms) sous fr/en/de
- Total i18n keys : 1683 → 1685

**Test runtime validé** :
LEGS affiche 60 exos (27 quads + 13 isch + 13 fessiers + 7 mollets) ✓

**Apprentissage senior** :
- Pattern alias UI → DB[] : approche pragmatique pour gérer un vocabulaire
  user-friendly (Jambes) en gardant une DB normalisée (Quadriceps, etc.).
  Helper centralisé matchMuscleFilter évite la duplication de logique.
- "Storage normalisé, display agrégé" est le bon pattern pour cette
  situation (vs migration DB d'aliases qui aurait été du sur-engineering).

### Apprentissages senior F3

**Architecture i18n DB-stored content**
- Pour textes libres (name/description/tips) : colonnes DB EN/DE additives
  avec fallback FR systématique côté helper
- Pour enums fermés (muscle_group 12 valeurs) : mapping front via helper
  + namespace JSON dédié. NE PAS migrer en DB (sur-engineering)
- Pour data chaos (equipment 43 valeurs) : DETTE DB d'abord, i18n ensuite

**Distinction critique DISPLAY vs DB/LOGIC**
- Wrapper helper UNIQUEMENT sur les affichages user
- Préserver FR sur : state setters, DB writes, payloads backend, React keys,
  comparisons (filter, sort), lookup maps (MUSCLE_COLORS), logique métier
  (MuscleHeatMap)

**Sécurité opérationnelle**
- Free plan Supabase = pas de backups managed. Mitigation : pg_dump local
  (1.6 MB en l'occurrence). Postgres client version doit MATCH la prod
  (17.6 → install postgresql@17 via Homebrew).
- dotenv ne lit pas .env.local par défaut. Fix : import dotenv from 'dotenv';
  dotenv.config({ path: '.env.local' })
- API key Anthropic exposée partiellement dans chat → rotated immédiatement.
  Pattern safe : echo "${#PG_URL}" affiche la longueur, jamais le contenu.

**Workflow backfill optimal**
- Batch JSON 25 par appel : sweet spot qualité × throughput
- Dry-run d'abord (JSON local), review qualité 10 samples, puis --apply
- --from-file pour rejouer sans re-consommer API
- Qualité Opus 4.7 sur fitness/musculation : excellente, traduit
  intention métier (pas littéral)

### Bugs identifiés mais NON résolus (tech debt sprint dédié)

1. **Alias muscles UI inconsistants**
   - DB_MUSCLES (ExerciseLibrarySection L.10) — alias "Jambes" qui n'existe pas en DB
   - MUSCLE_OPTIONS (ProgramBuilder L.28, 737) — vocabulaire UI parallèle ("Poitrine" vs "Pectoraux")
   - TrainingTab.tsx : 3e vocabulaire UI ("TOUT", "JAMBES", "FULL BODY")
   - 4 vocabulaires différents pour muscles dans le repo

2. **Bug "No exercise found" sur filtre "JAMBES"**
   - L'alias UI "Jambes" ne matche aucun muscle_group DB (qui sont Quadriceps,
     Ischio-jambiers, Fessiers, Mollets séparés)
   - Logique de filtrage cassée
   - Solution future : refacto vers une vraie taxonomie hiérarchique

3. **Doublon DB**
   - "Abdominaux" (1 ligne) vs "Abdos" (11 lignes) - dette DB normalisation

4. **Equipment data quality**
   - 43 valeurs distinctes, doublons casse ("Haltères" 27 + "haltères" 6 + "Haltère" 2)
   - Compositions floues ("Aucun ou Haltère", "Barre, Banc")
   - Postures confondues avec équipement ("Debout", "Assis")

5. **difficulty + category i18n**
   - Faible visibilité (1 occurrence display difficulty trouvée, 0 category)
   - Report en sprint vocab consolidation

### Compte test prod
- Décision senior : completed_sessions.exercise_name reste en FR (legacy
  immutable, pattern Strong/Hevy). Le name d'exercice à la date où l'user
  l'a fait reflète ce qu'il a vu à l'époque.

## F4 — Cluster final composants orphelins (DONE)

### Sous-batches F4

**F4a — TechniquePopup (513ff83)** : 30 clés, 4 techniques avancées, pattern buildTechniqueData(t)
**F4b — ExerciseDetailModal (49293d9)** : 4 clés, toast + form labels, réutilisation common.*
**F4c.1 — StartProgramModal (e8781b0)** : 9 clés, formatDateFr → locale, monthNames → Intl natif
**F4c.2 — VideoFeedback (e57dde6)** : 18 clés, accents restaurés, status labels
**F4c.3 — ExerciseInfoPopup (b67fa6e)** : 4 clés, BUG LATENT fixé (helpers DB wirés)
**F4c.4 — ShoppingList (9f6dd0f)** : 22 clés, getAisle key/label separation, 14 aisles
**F4c.5 — NutritionPreferences (03a9aa3)** : 76 clés, 4 const arrays refacto key-based
**F4c.6 — RecipesSection + NutritionTab meal types (59e500d)** : 22 clés
**F4c.7 — TrainingTab residuals (6885966)** : 24 clés, toasts + buttons + dates
**F4c.8 — NutritionTab Journal/Plan dates (cf391c3)** : 2 clés, NUTRITION_DAYS override Intl
**F4c.9 — HeroSessionCard (6b4d804)** : 4 clés, badgeLabel mapping + VOIR LA SEANCE

## F5 — Vague ultra-finale

**F5a — RecentSessionsList + freeSession** : 15 clés, HISTORY_FILTERS labels override
**F5b — Alternatives getExerciseName wiring (4bee9a3)** : 0 clé, 2 display wrappés
**F5c — MealsTab header + date (a5749f9)** : 1 clé, MES REPAS + fr-FR → locale

### Bilan total marathon (Sprint 6 + F1+F2+F3+F4+F5)

- **1052 → 1916 clés i18n (+864, ~99% couverture)**
- **178 exos DB en 3 langues (backfill Claude Opus 4.7, ~$3-4)**
- **6 colonnes DB exercises_db ajoutées**
- **5 helpers/libs créés** : i18n-exercise, i18n-muscle, matchMuscleFilter,
  buildTechniqueData, key-based arrays pattern
- **3 patterns architecturaux établis** :
  - sub-component extraction (Provider context)
  - Option B Recharts dataKey refactor
  - key-based const arrays + t() lookup
- **33+ commits feature + 1 revert tracé**
- **2 incidents sécurité gérés** : rotation API keys + reset Postgres password
- **1 régression critique** : F1b revert + post-mortem + F1b-v2 propre

### Tech debt résiduelle (8 items pour sprints futurs)

1. design-tokens.ts i18n (NUTRITION_DAYS, MEAL_TYPES, ACTIVITY_LEVELS) ~1h
2. DB i18n nutrition (food_items / community_foods) ~2h
3. Vocab muscles UI consolidation (4 vocabulaires)
4. Equipment data quality (43 valeurs, doublons)
5. Doublon DB Abdos/Abdominaux
6. Data quality programmes (string libre vs FK exercise_id)
7. MealsTab noms repas user data (non traduisible)
8. Tags universaux EN + abréviations (décision brand explicite)

---

## 2026-05-23 — Phase A merge prod + Phase B Tempo Executor + Fix bug audio

**Durée** : ~6h
**Branches** : `feat/tempo-modal-phase-a` (mergée, supprimée), `feat/tempo-executor-phase-b` (mergée, supprimée)

### Réalisé

#### 1. Phase A — Merge en production (matin)
- Test E2E local validé sur compte réel `f.marco@me.com` avec programme PPL Elite 12 Semaines
- Pill gold tempo visible sur tous les exos du programme
- Merge sur main + déploiement Vercel auto → LIVE sur app.moovx.ch
- Validation PWA iPhone : pill gold + modal pédagogique fonctionnent en prod

#### 2. FIX BUG AUDIO CRITIQUE — scheduled rest sounds
- **Découvert avant Phase B** : Marco a signalé que les bips de fin de rest timer sonnaient ~90s après un skip, parasitant la série suivante
- **Root cause** : Web Audio API schedule les oscillators directement dans l'AudioContext (`oscillator.start(futureTime)`). Une fois schedulés, ils jouent peu importe ce qui se passe en JS. `skipRest()` ne touchait pas aux oscillators, donc les bips programmés sonnaient quand même.
- **Pourquoi Web Audio scheduling** : c'est le seul moyen fiable pour que les bips de fin de timer fonctionnent quand iOS suspend le JS (écran verrouillé). Choix architectural valide mais cancellation absente.
- **Fix** :
  - `scheduleBeep` retourne maintenant `ScheduledSound { oscillator, gain } | null`
  - `scheduleRestPeriodSounds` retourne `ScheduledSound[]`
  - Nouveau `cancelScheduledSounds(sounds)` qui cancel les gains + stop les oscillators + disconnect les nodes
  - `WorkoutSession.startRest` capture les sons schedulés dans un ref
  - `WorkoutSession.skipRest` cancel les sons avant reset des states
  - Defensive: startRest cancel aussi les sons précédents (cas re-validation rapide)
- Commit : 4336966
- ⚠️ Backlog noté : `addRestTime` (+30s) ne re-schedule pas les sons (mineur)

#### 3. Phase B — TempoExecutor (4 sous-phases, mergée prod)

##### B.1 — Composant standalone (commit ec24e37)
- `app/components/training/TempoExecutor.tsx` (262 lignes)
- Modal plein écran avec backdrop noir + blur (focus total)
- Parse `X-X-X` tempo, skip phases à 0s automatiquement
- Tick loop 100ms granularity
- Cercle SVG 220px avec progression gold + chiffre central animé
- Rep counter, label phase, description, icône (↓ pause ↑)
- Audio cue + vibration aux transitions
- Pause/resume, sound toggle (partagé avec rest timer via `timerSound` localStorage)
- Fallback gracieux si tempo invalide

##### B.2 — Intégration WorkoutSession (commit a768dbc)
- Bouton PLAY gold sur le 1er set non-done de chaque exo avec tempo valide
- Helpers `parseTargetRepsForTempo` (handles ranges '8-10' → 10), `isTempoValid`
- State `tempoExecutor: { exoId, setIdx, tempo, name, targetReps } | null`
- `initAudio()` au tap pour unlock iOS audio
- Render conditionnel à la fin du JSX
- Décision UX : option B (1er set non-done uniquement) — pattern Strong/Hevy

##### B.4.1 — iOS background recovery (commit 1fd348b)
- **Problème** : setInterval suspendu quand iOS background l'app → au retour, tempo continue depuis là où il était sans audio joué → user perdu
- **Fix** :
  - Remplace `elapsedMs` cumulé par `phaseEndsAtRef` (timestamp absolu)
  - Détection saut : si `delta > 2000ms` entre 2 ticks (vs normal 100ms) → JS a été suspendu
  - Stoppe le tempo + flag `wasInterrupted` → modal "TEMPO INTERROMPU" avec bouton FERMER
  - Refactor `handleTogglePause` pour mémoriser le remaining ms à la pause et ré-ancrer phaseEndsAt au resume
  - Nouveau ref `pausedRemainingMsRef`
- **Test validé** : iPhone via IP locale 192.168.1.14, background app 5s → modal "TEMPO INTERROMPU" apparaît correctement

##### B.4.2 — Vibrations différenciées (commit 386ba67)
- 4 nouveaux patterns dans `lib/timer-audio.ts` :
  - `vibrateEccentric` (80ms) — descente
  - `vibratePause` (60-80-60ms) — maintien
  - `vibrateConcentric` (150ms) — explosif
  - `vibrateRepComplete` (120-60-120-60-200ms) — fin de rep
- `onPhaseTransition` reçoit maintenant `Phase | null` au lieu de boolean
- Délai 300ms entre rep-complete cue et phase 0 de la rep suivante
- Note : `navigator.vibrate` non supporté Safari iOS, mais OK Android/Chrome desktop

### Décisions UX notables

- **Pas de bridge auto vers rest timer après tempo** : décision finale Marco, l'user saisit kg/reps manuellement + valide (qui déclenche le rest timer comme aujourd'hui). Pas de magie automatique.
- **Pas de modal saisie post-tempo** : redondant avec UI inputs existante dans la card du set
- **Pas de countdown 3-2-1** (B.4.3 reportée) : à évaluer après usage réel
- **Pas d'animations cosmétiques** (B.4.4 reportée) : non critique

### Tests validés
- ✅ TypeScript 0 erreur sur tous les commits
- ✅ Test E2E local Phase A sur compte réel (programme PPL Elite)
- ✅ Test prod Phase A (PWA iPhone)
- ✅ Test fix audio rest timer (skip → silence après 90s)
- ✅ Test B.1+B.2 sur compte réel (bouton PLAY + modal tempo)
- ✅ Test B.4.1 iPhone via IP locale (background → "TEMPO INTERROMPU")

### Stats commits

5 commits sur main via 2 branches successives :
- Branche `feat/tempo-modal-phase-a` (mergée matin) : Phase A
- Branche `feat/tempo-executor-phase-b` (mergée fin journée) : fix audio + B.1 + B.2 + B.4.1 + B.4.2

---

## 2026-05-22 — P1 clôturé + Email infra + Phase A tempo

**Durée** : ~6h (12h45 → 19h30)
**Branches** : `fix/auth-signup-confirmation-banner` (mergée), `feat/tempo-modal-phase-a` (à merger demain)

### Réalisé

#### 1. P1 Launch Prep — Confirmation banner après email validation (MERGÉ)
- **Root cause** : `emailRedirectTo` dans RegisterClientContent.tsx pointait directement vers /onboarding, le code PKCE était droppé silencieusement
- **Fix** : redirect vers /auth/callback?type=signup → exchange + signOut + redirect /login?confirmed=1
- **Banner gold** affiché sur /login avec icône CheckCircle, dismiss au premier input
- **Décision senior** : self-signup = forced re-login (V2), invitation coach /join = auto-login préservée (pattern industrie)
- Commit : 434d9bb (mergé sur main)
- ⏳ Test E2E happy-path en prod skippé (email rate limit pendant la session)

#### 2. Email infrastructure (Infomaniak SMTP + DKIM)
- Migration de Supabase built-in SMTP (~4 emails/h limit) vers Infomaniak SMTP
- Sender : `noreply@moovx.ch` via mail.infomaniak.com:465
- **Bug fix latent** : `SMTP_USER=noreply.moovx.ch` (avec point) corrigé en `noreply@moovx.ch`
- **DNS Cloudflare** : DKIM activé (selector 20251009), SPF + DMARC déjà OK
- **Bug fix DNS critique** : NS records délégant `_domainkey` vers Infomaniak supprimés, TXT DKIM ajouté directement sur Cloudflare
- Validation : `dkim=pass`, `dmarc=pass`, `spf=pass` confirmés dans headers test
- Note : iCloud flag spam (réputation domaine fraîche), Gmail = OK

#### 3. Email templates premium MoovX (3/6)
- Itérations V1→V5 : abandonné dark theme (Apple Mail iOS ne respecte pas color-scheme:dark)
- Final : light premium editorial style (Apple/Stripe/Linear), bg #FAFAF7, white cards, black CTA solid
- Logo MoovX réel (`logo-moovx-192.png`, 96px)
- Templates mis à jour dans Supabase : Confirm signup, Magic Link, Reset Password
- Restants pour post-beta : invite user, change email, reauthentication

#### 4. Phase A — Tempo prescrit affichage premium (PUSHÉ, MERGE DEMAIN)
- **Nouveau composant** : `app/components/training/TempoModal.tsx` (modal pédagogique 3 phases)
- **Modif** : `app/components/WorkoutSession.tsx` — pill gold tappable remplace badge gris
- Format tempo confirmé : "X-X-X" (excentrique - pause bas - concentrique), pas 4 phases
- Test validé sur compte `marco.ferreira@bluemail.ch` avec programme custom (tempos 3-1-2, 2-0-2, 4-2-1, 2-2-2)
- Branche : `feat/tempo-modal-phase-a` (commits cddf96c + 5284ed6)

#### 5. BUG FIX CRITIQUE LATENT — get-today-session.ts
- **Découvert pendant le test de Phase A** : le pill ne s'affichait pas malgré tempo en DB
- **Root cause** : `lib/get-today-session.ts` utilisait un whitelist explicit de 6 champs (name, exercise_name, sets, reps, rest_seconds, muscle_group), droppant silencieusement TOUS les autres champs : tempo, rir, notes, video_url, image_url, technique, technique_details, phases, description
- **Impact rétroactif** : depuis le refactor de ce fichier, WorkoutSession n'a jamais reçu de tempo/rir/technique prescrits
- **Fix** : remplace whitelist par `...ex` spread en première position du return, override des défauts par-dessus
- Commit : cddf96c
- ⚠️ À surveiller : maintenant tous les champs DB arrivent dans WorkoutSession, vérifier qu'il n'y a pas d'effet de bord

### Bugs notables découverts (BACKLOG, pas fixés)

1. **Dashboard "VOIR LA SEANCE"** → redirige vers Analytics au lieu du détail session
2. **Désync scheduled_sessions vs dashboard** : DB dit "Jambes terminé" aujourd'hui, dashboard affiche "Push B terminé" — deux sources de données différentes
3. **CustomBuilder ne permet pas saisie tempo** lors d'ajout d'exo en séance libre (feature manquante, optionnelle pour plus tard)

### Décisions produit notables

- **Phase A** : afficher le pill TOUJOURS (même si tempo standard 2-0-2), choix Marco contre la reco senior. À évaluer après usage réel.
- **Pas d'édition de tempo dans WorkoutSession** : l'user n'override pas la prescription du coach. Décision senior accepted.
- **Tempo dans CustomBuilder** : reporté en backlog post-launch.

### Stats commits

- 5 commits sur main et branches : P1 + chore + Phase A fix latent + Phase A feat
- 0 régression TypeScript (npx tsc --noEmit : 0 erreur partout)

---

## 2026-05-22 — Ménage Git + Phase 3 Delete Account RPC (~3h)

### Objectif
Avancer sprint Launch Prep : ménage git (stashes + identité),
Phase 3 (delete account RPC RGPD/nLPD), puis cleanup RLS si temps.

### 1. Ménage Git (~25 min)

- Identité Git configurée : Marco Ferreira <bobitosm@gmail.com>
  (avant : warning auto à chaque commit, hash MacBook local)
- 4 stashes triés :
  * stash@{0} (19/05) wip-2026-05-19 : commit 829902f
    chore(media): remove local exercise videos migrated to Supabase
    Storage (9 fichiers binaires curl, ~16 MB libérés)
  * 3 autres stashes droppés (.claude/settings.local.json modifs
    triviales sur branches feature mergées et supprimées)
- .claude/settings.local.json untracked (commit 203cf9d) :
  fichier de config locale Claude Code commité par erreur, .gitignore
  l'ignorait déjà mais le tracking restait — git rm --cached résolu
- package-lock.json resync (commit abc3965) : @next/bundle-analyzer
  déclaré dans package.json mais lockfile pas commit

Total : 3 commits, repo allégé, identité Git propre.

### 2. Phase 3 Delete Account RPC (~2.5h)

#### Audit du code existant

app/api/delete-account/route.ts (108 lignes) avait :
- Pas de transaction (DELETE table par table, fails silencieux)
- Seulement 16 tables couvertes (~30 user-related tables existent)
- console.error + continue + return success:true même en cas
  d'erreur DB (mensonge au frontend)
- Manque de couverture coach-side (payments.coach_id,
  client_meal_plans.coach_id, etc.)

#### Inventaire FK via information_schema

Query d'introspection sur pg_proc + information_schema pour lister
toutes les colonnes UUID référençant des users (user_id, client_id,
coach_id, created_by, sender_id, receiver_id) — 45+ touch points
identifiés vs 16 dans le code existant. ~25 tables manquantes.

#### Migration 20260522090303_add_delete_user_account_rpc

Création RPC public.delete_user_account(uuid) PL/pgSQL :
- SECURITY DEFINER pour cross-table cascade (bypass RLS safely)
- Safety check : auth.uid() = target_user_id OR super_admin
- 4 niveaux de DELETE selon profondeur FK
- Stratégie d'anonymisation pour contenu partagé :
  * community_foods.created_by → NULL
  * exercises_db.created_by → NULL
  * training_programs : NULL si is_template, DELETE si privé
  * recipes : NULL si is_public, DELETE si privé
  * messages : DELETE pour sender (RGPD strict), UPDATE NULL pour
    receiver (préserve l'historique pour l'autre partie)
- Exception handler global : tout error roll back la transaction

Tests SQL (SQL Editor avec SET LOCAL ROLE simulant identité) :
1. Existence + signature : OK (proname, args, SECURITY DEFINER, volatile)
2. Sécurité : f.marco (client) essaie de delete fe.ma (coach) →
   REJECTED ERRCODE 42501 'Unauthorized: can only delete your own
   account' — safety check fonctionne
3. Suppression réelle : marco.ferreira@bluemail.ch (95 lignes dans
   8 tables) → SUCCESS, post-snapshot 0 partout, 11 messages
   préservés pour fe.ma avec receiver_id = NULL

#### Refacto route delete-account/route.ts

Remplace la boucle de 16 DELETE par 1 appel RPC :
1. Auth check
2. Storage cleanup (best-effort, non-blocking)
3. supabaseAuth.rpc('delete_user_account', { target_user_id })
4. supabase.auth.admin.deleteUser

Code 138 lignes (vs 108 avant, mais avec commentaires inline).

#### Bug 1 — RPC appelé via service_role

Commit 2d3406c initial appelait le RPC via service_role (variable
`supabase`). Détecté en E2E test sur markoo.rosa@outlook.com :
dialog 'Échec de la suppression : Unauthorized: can only delete
your own account' (SQLSTATE 42501).

Cause racine : service_role n'a pas de JWT context, donc auth.uid()
retourne NULL, la safety check fail toujours pour cette voie.

Fix commit e537ac1 : 1 ligne `supabase.rpc` → `supabaseAuth.rpc`.
Le client cookie-aware préserve auth.uid(). RPC reste SECURITY
DEFINER donc bypass RLS pour le cascade — auth.uid() sert uniquement
au safety check, pas aux DELETE.

#### Bug 2 — Zombie session après deletion réussie

Re-test E2E sur markoo.rosa : delete-account renvoie 200, RPC OK,
auth user supprimé en DB. MAIS l'app continue d'afficher le
dashboard du compte supprimé. Refresh ne corrige pas.

Cause racine : `if (res.ok) { window.location.href = '/login' }`
fait juste une navigation. Le cookie sb-*-auth-token reste valide
côté browser. Le middleware proxy détecte le cookie comme
'authenticated' et redirige back vers /. État zombie : session
active vers un user fantôme.

Fix commit 5f93986 dans 2 composants :
- app/components/tabs/profile/DeleteAccountSection.tsx (côté client)
- app/coach/components/CoachProfile.tsx (côté coach)

Pattern :
  if (res.ok) {
    await supabase.auth.signOut()  // ← AJOUTÉ
    window.location.href = '/login'
  }

signOut() invalide le JWT serveur-side + clear cookies sb-*
côté browser. Redirect arrive sur clean state.

#### Test E2E final validé

Création markoo.rosa@outlook.com → 80kg, prénom Marco, profil
complet → Compte → Supprimer mon compte → SUPPRIMER → click :
- POST /api/delete-account : 200
- signOut() exécuté côté browser
- Redirect vers landing/login propre
- Vérif DB : profiles 0 rows, auth.users 0 rows

### Apprentissages senior consignés (Phase 3)

1. SECURITY DEFINER + auth.uid() check : appeler via le client
   authentifié (cookie-aware), JAMAIS via service_role. Service_role
   n'a pas de JWT context, auth.uid() retourne NULL, le safety
   check fail toujours.

2. Server-side deletion seule ≠ logout. Toujours pair avec
   supabase.auth.signOut() côté browser AVANT redirect, sinon le
   cookie JWT survit et le middleware redirige vers le dashboard.

3. window.location.href change la page mais NE supprime PAS la
   session JWT. Comportement à connaître pour tout flow de
   suppression auth (account delete, role change, team removal).

4. Faire à moitié RGPD = pas faire RGPD. L'audit FK exhaustif via
   information_schema (vs liste à la main) garantit zéro oubli.
   25+ tables manquantes dans le code existant — incidence directe
   sur la compliance.

5. Tester safety checks AVANT tests réussis : on a confirmé que la
   fonction rejette une usurpation AVANT de la tester sur du delete
   réel. Sans ça, on aurait pu shipper une RPC qui supprime n'importe
   quoi sans vérification.

### Commits

| # | Hash | Description |
|---|---|---|
| 1 | 829902f | chore(media): remove local exercise videos |
| 2 | 203cf9d | chore: untrack .claude/settings.local.json |
| 3 | abc3965 | chore(deps): sync package-lock.json |
| 4 | 2d3406c | feat(delete-account): transactional RPC RGPD/nLPD |
| 5 | e537ac1 | fix(delete-account): call RPC via authenticated client |
| 6 | 5f93986 | fix(delete-account): signOut before redirect |

### Reste sprint Launch Prep

- [ ] Améliorations training (P2 backlog : minuteur exec + tempo + swipe)
- [ ] Bug Celebration fin séance (P1 backlog)
- [ ] Page confirmation email validation (P1 backlog, identifié 22/05)
- [ ] Cleanup doublons RLS (~1h, P2)
- [ ] Sprint 6 i18n (langues) si miracle

---

## 2026-05-21 (fin de journée) — Phase 2 RLS audit Tier 3 + P1 INSERT libres + P2 coach_clients (~3h)

### Objectif initial
"1-2h focus court" pour avancer sur le sprint Launch Prep.

### Réalité
Session de 4h+ qui a fermé toute la dette Phase 2 RLS (Tier 3,
P1 INSERT libres, P2 coach_clients self-insert) et révélé un bug
pré-existant dans useClientDashboard.ts.

### Tier 3 audit light (~20 min)

Pattern matching SQL sur les 16 tables restantes non encore
auditées (workouts, weight_logs, user_xp, water_intake, etc.).

Résultat : 34 policies analysées, 0 fuite détectée. Tier 3 = clean.

Audit RLS 100% complet : 57/57 tables Supabase couvertes.

### P1 INSERT libres fix (~30 min)

Détecté lors du Tier 2 audit, déféré en P1. Trois policies
INSERT avec WITH CHECK: true permettant à n'importe quel user
authentifié d'insérer des lignes avec arbitrary user_id.

Investigation préalable :
- ai_usage_log (singulier) : table orpheline, 0 ligne, 0 référence
  dans le code (grep confirmed). Sprint 3 (17 mai) avait introduit
  ai_usage_logs (pluriel) comme remplacement, mais la table
  singulière a été laissée. Une policy fautive avait été ajoutée
  manuellement sans migration committée.
- app_logs : table très utilisée (lib/admin/logger.ts, hooks
  coach + client, app/coach/page.tsx). user_id colonne nullable
  sans default, beaucoup d'inserts existants l'omettent (system
  logs anonymes). DROP impossible, fix par patch policy.

Migration : 20260521210640_fix_insert_libre_logs.sql
- DROP TABLE public.ai_usage_log
- DROP 2 policies INSERT WITH CHECK: true sur app_logs
- CREATE app_logs_insert_safe avec
  WITH CHECK (user_id IS NULL OR user_id = auth.uid())

Validation : app_logs n'a plus que 2 policies (insert_safe +
Admin can view logs). Le code existant ne casse pas (les inserts
sans user_id passent toujours, ceux avec auth.uid() aussi, les
spoofs sont bloqués).

Commit : 01fd6c9

### P2 coach_clients self-insert hardening (~3h)

Ce qui devait prendre 20 min en a pris 3h. Pourquoi : on a
découvert un bug RLS recursion subtil, puis un bug pré-existant
dans le code, puis un retard webhook Vercel. Chaque obstacle
demandait une compréhension fine de la stack.

#### Étape 1 — Premier fix (cassé)

Migration 20260521211443_harden_coach_clients_self_insert.sql :
- DROP 2 policies INSERT "Clients can be assigned" et
  "clients can insert themselves" (WITH CHECK auth.uid() = client_id
  sans aucune validation du coach_id)
- CREATE coach_clients_self_insert_safe avec
  WITH CHECK (client_id = auth.uid() AND coach_id IN
    (SELECT id FROM profiles WHERE role IN ('coach', 'super_admin')))

Problème : la sous-requête lit profiles, qui a sa propre RLS
(id = auth.uid() OR super_admin). Sous identité client, la
sous-requête retourne 0 lignes, le check fail silencieusement,
INSERT rejeté. Verified : login f.marco@me.com a réussi mais
aucune row coach_clients créée.

#### Étape 2 — Fix RLS recursion (cassé aussi)

Migration 20260521212741_fix_coach_clients_policy_with_security_definer.sql :
- Création fonction public.is_coach_role(uuid) SECURITY DEFINER
- DROP policy défectueuse, CREATE nouvelle utilisant la fonction

Note de la session : Supabase SQL Editor a tronqué $ ... $ en
$ ... $ au paste, causant syntax error. Fix : utiliser des
tagged dollar quotes $func$ ... $func$ pour les futurs CREATE
FUNCTION. Apprentissage consigné.

Test SQL en simulation (SET LOCAL ROLE authenticated + JWT sub) :
INSERT réussit. Policy validée au niveau PostgreSQL.

Mais le re-login app : toujours 0 row créée.

#### Étape 3 — Diagnostic DevTools Network

DevTools Network filtré sur coach_clients : seulement 4 requêtes
GET (preflight + fetch), aucun POST. L'app n'envoie même pas
l'upsert.

Lecture du code useClientDashboard.ts:235 révèle un bug
pré-existant : le lookup du default coach par email lit profiles
directement, ce qui est RLS-bloqué pour les clients.
defaultCoachId stayed null, la branche else if (defaultCoachId)
jamais entrée, upsert jamais tenté.

Les liens existants (marco.ferreira, mia.nunes, bobitosm) ont
été créés par d'autres chemins (API admin, SQL direct, ou
ancienne version de la RLS profiles).

#### Étape 4 — Fix bug pré-existant

Migration 20260522050836_add_get_default_coach_id_helper.sql :
- Création fonction public.get_default_coach_id(text) SECURITY
  DEFINER restreinte aux profiles avec role coach/super_admin
- Pas d'oracle d'énumération possible (NULL pour les clients
  ou emails inexistants)

Code change : app/hooks/useClientDashboard.ts:235 remplacé par
supabase.rpc('get_default_coach_id', { coach_email: defaultEmail })

Commit : c7dd00d (4 fichiers ensemble : 3 migrations + code)

#### Étape 5 — Retard webhook Vercel

Push de c7dd00d n'a pas déclenché de build Vercel. Webhook stale.
Fix : commit vide (e6d494c) pour réveiller. Build success en
1m24s.

#### Étape 6 — Test E2E final validé

DELETE row coach_clients f.marco, logout/login propre, hard
refresh, ré-query : 1 row créée à 03:29:55. Fix validé end-to-end.

### Bilan Phase 2 complète

Toutes les fuites RGPD/nLPD identifiées sont colmatées :

| # | Fix | Status |
|---|---|---|
| 1 | progress_photos.coach read photos | ✅ |
| 2 | body_measurements.coach read measurements | ✅ |
| 3 | meal_logs.coach read meal logs | ✅ |
| 4 | meal_plans.coach manages meal plans | ✅ |
| 5 | meal_tracking.coach read all tracking | ✅ |
| 6 | app_logs INSERT spoofing + DROP ai_usage_log orpheline | ✅ |
| 7 | coach_clients self-insert hardening + bug pré-existant flow | ✅ |

Audit RLS : 57/57 tables, 100% couvert.

3 fonctions SECURITY DEFINER ajoutées :
- is_coach_role(uuid) : check si un UUID désigne un coach
- get_default_coach_id(text) : lookup coach par email
Pattern réutilisable pour futures policies cross-table.

### Apprentissages senior consignés

1. RLS recursion : une policy ne doit pas lire une table qui a
   elle-même RLS, sous peine de checks toujours faux. Utiliser
   SECURITY DEFINER fonctions pour bypass.

2. Bug pré-existant invisible : un select sur profiles non-self
   est RLS-bloqué pour les clients, mais sans try/catch dans le
   code, le résultat NULL est interprété comme "pas de default
   coach" et l'upsert n'est pas tenté. Le bug ne crashe pas
   l'app, juste un fail silencieux côté DB.

3. Dollar quoting tagué : pour CREATE FUNCTION dans Supabase SQL
   Editor, toujours utiliser $func$ ... $func$ (ou autre tag)
   plutôt que $ ... $. Évite les troncatures invisibles au paste.

4. Vercel webhook peut être stale : un push qui ne déclenche pas
   de build n'est pas forcément un problème de config. Solution
   simple : git commit --allow-empty pour réveiller.

5. Time-boxing brutal : annoncer "1-2h" et finir à 4h+ révèle
   qu'on n'avait pas mesuré la complexité. La cause racine
   n'était pas paresse mais l'enchaînement de découvertes
   (recursion → pré-existant → webhook). Chaque obstacle était
   instructif. Mais en mode "ship aux beta", il faudrait scope
   plus fin et stop strict.

### Decisions architecturales

- DROP table orpheline ai_usage_log plutôt que patcher (table
  inutilisée = surface à supprimer, pas à maintenir)
- SECURITY DEFINER functions plutôt que policies récursives sur
  profiles (pattern propre, réutilisable)
- Un seul commit (c7dd00d) pour les 3 migrations + code change
  P2 (cohérence : la migration introduit une fonction utilisée
  immédiatement par le code, on ne split pas)
- Commit vide pour réveiller Vercel (trick courant, documenté
  dans le message du commit pour traçabilité)

### Dette résiduelle pour sessions futures

P1 :
- Bug #3 résiduel coach_clients : un client peut toujours
  s'auto-inscrire chez N'IMPORTE QUEL coach (pas juste celui qui
  l'a invité). Fix complet : invitation tokens (refacto archi,
  ~2h). Aujourd'hui acceptable car 0 client payant.

P2 :
- Cleanup doublons RLS policies (~1h, cosmétique)
- Roles incohérents {public} / {authenticated} (~30 min)
- Admin bobitosm@gmail.com role='admin' à corriger en
  'super_admin' (cohérence avec checks code)
- Supabase client typé avec Database generics (rpc() actuellement
  accepte n'importe quel nom de fonction sans erreur TS)

P3 :
- Refacto useClientDashboard.ts:244 pour passer par
  /api/assign-coach (service_role) plutôt que upsert direct
  (architecture plus propre, mais demande tests E2E complets)

### Commits

| # | Hash | Description |
|---|---|---|
| 1 | 01fd6c9 | fix(rls): drop orphaned table + fix app_logs INSERT spoofing |
| 2 | c7dd00d | fix(rls): harden coach_clients self-insert + unblock new client onboarding |
| 3 | e6d494c | chore: trigger Vercel redeploy after webhook miss for c7dd00d |

---

## 2026-05-21 (suite) — Phase 2 RLS audit Tier 2 (~45 min)

### Objectif
Continuer l'audit RLS sur le Tier 2 (17 tables personnelles non
critiques RGPD) avec pattern matching automatique pour identifier
les policies dangereuses (USING: true, WITH CHECK: true).

### Methode

SQL d'introspection sur pg_policies avec verdict calculé par
CASE WHEN sur les patterns dangereux. Sortie triée par sévérité
décroissante.

### Findings — 3 nouvelles fuites critiques (même pattern que Tier 1)

Bug #4 — meal_logs
- Policy : "coach read meal logs" (SELECT, authenticated, USING: true)
- Sévérité : RGPD/nLPD majeur (données alimentaires)
- Particularité : aucune policy de remplacement coach existante,
  donc DROP + CREATE meal_logs_coach_read via coach_clients lookup

Bug #5 — meal_plans
- Policy : "coach manages meal plans" (ALL, authenticated, USING: true)
- Sévérité : RGPD/nLPD majeur (plans nutritionnels)
- Note : ALL et non SELECT — permettait aussi modification cross-tenant
- Replacement existant : meal_plans_coach_read (DROP only)

Bug #6 — meal_tracking
- Policy : "coach read all tracking" (SELECT, authenticated, USING: true)
- Sévérité : RGPD/nLPD majeur (compliance alimentaire)
- 2 replacements existants : Coaches can view client meal tracking,
  meal_tracking_coach_read (DROP only)

### Fix appliqué

Migration : supabase/migrations/20260521205152_drop_insecure_meal_rls_policies.sql

DROP POLICY IF EXISTS "coach read meal logs" ON public.meal_logs;
DROP POLICY IF EXISTS "coach manages meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "coach read all tracking" ON public.meal_tracking;

CREATE POLICY "meal_logs_coach_read" ON public.meal_logs
  FOR SELECT TO public
  USING (auth.uid() IN (
    SELECT coach_id FROM coach_clients
    WHERE client_id = meal_logs.user_id
  ));

Validation post-fix via pg_policies : 3 fautives parties, replacement
actif, paths coach-read légitimes préservés.

### Tables analysées et déclarées sûres ce sprint

- profiles, payments, messages, bug_reports, push_subscriptions (Tier 1)
- activity_feed, body_analyses, body_assessments, cardio_sessions,
  chat_ai_messages, client_meal_plans, client_programs, coach_notes,
  commissions, completed_sessions, custom_exercises, custom_foods,
  custom_programs, daily_checkins, daily_food_logs, daily_habits,
  exercise_feedback (Tier 2)
- ai_usage_logs (Sprint 3, déjà sécurisé)

### NON-bugs identifiés (catalogues de référence publics)

USING: true volontaire et correct sur ces tables (données de
référence consultables par tout user authentifié, INSERT/UPDATE
correctement scopés par ailleurs) :
- achievements, badges (gamification globale)
- exercises_db (catalogue exercices)
- food_items, fitness_foods, community_foods (catalogues aliments)
- program_days, program_exercises (templates de programmes, enfants
  de training_programs.is_template — pas de colonne user dans la
  structure, vérifié via information_schema)
- recipes (filtre is_public = true)
- training_programs (filtre is_template = true)

### Dette identifiée pour sessions futures

P1 (à fixer rapidement, ~30 min) :
- ai_usage_log.ai_usage_log_insert_all (INSERT, WITH CHECK: true) :
  pollue le rate limiting Sprint 3 — un user peut insérer des logs
  avec n'importe quel user_id, fausser le décompte
- app_logs.Anyone can insert logs + app_logs.app_logs_insert_all
  (INSERT, WITH CHECK: true) : pollution logs applicatifs

P2 (cosmétique, ~1h) :
- Doublons de policies sur la plupart des tables (3 policies "own"
  qui font la même chose). Cleanup à faire dans session dédiée.
- Roles incohérents : mix {public} / {authenticated}.

P2 (architectural, ~20 min) :
- Bug #3 coach_clients self-insert (déjà identifié Phase 2 Tier 1)

### Apprentissages senior consignés

Le pattern dangereux USING: true est récurrent dans ce repo —
probablement des policies temporaires de debug oubliées. Règle à
retenir : toute policy USING: true doit être justifiée explicitement
(catalogue de référence public). Sinon = fuite.

Pour tables avec doublons de policies, vérifier qu'AU MOINS UNE
policy correcte existe AVANT de DROP la défectueuse. Sinon il faut
CREATE en remplacement (cas meal_logs ce sprint).

Stratégie audit RLS efficace : pattern matching SQL automatique avec
verdict calculé > revue manuelle policy-par-policy. Gain de temps 5x.

### Commits

| # | Hash | Description |
|---|---|---|
| 2 | 2ba6219 | fix(rls): drop 3 more insecure policies on meal tables + add missing coach-read |

---

## 2026-05-21 — Sprint Launch Prep Phase 2 RLS audit Tier 1 (~1h)

### Objectif
Auditer les Row Level Security policies Supabase sur les tables
sensibles avant ouverture aux beta testers. Identifier et fixer
toute fuite de données cross-tenant (coach A peut lire les
données du coach B, etc.).

### Methode

Tier-based audit (1h timeboxé) :
- Tier 1 (critique RGPD) : profiles, payments, progress_photos,
  body_measurements, messages, coach_clients, bug_reports,
  push_subscriptions
- Tier 2 (personnel mais moins sensible) : à auditer prochaine session
- Tier 3 (référence) : à skim plus tard

Approche read-only : SQL d'introspection sur pg_tables et pg_policies,
analyse manuelle des USING/WITH CHECK clauses, identification des
patterns dangereux (USING: true, predicats trop larges).

### Findings

Inventaire général :
- 57 tables dans le schéma public
- 57/57 ont RLS active (très bonne hygiène générale)
- ~170 policies au total
- 2 tables avec RLS=true et 0 policies (volontaire : meal_plans_backup_*,
  stripe_webhook_events accédé uniquement via service_role)

### 2 bugs critiques détectés (data leak direct)

Bug #1 — progress_photos
- Policy : "coach read photos" (SELECT, public)
- USING : true
- Effet : tout utilisateur authentifié pouvait SELECT * sur
  TOUTES les photos de progression (transformations corporelles)
- Sévérité : RGPD/nLPD majeur (données de santé)

Bug #2 — body_measurements
- Policy : "coach read measurements" (SELECT, authenticated)
- USING : true
- Effet : tout utilisateur authentifié pouvait SELECT * sur
  TOUTES les mesures corporelles (poids, taille, % graisse)
- Sévérité : RGPD/nLPD majeur (données de santé)

Cause racine probable : doublon défectueux laissé en place lors
d'une migration antérieure. Chaque table avait déjà une policy
correcte (progress_photos_coach_read, body_measurements_coach_read)
faisant le bon check via coach_clients lookup, mais une second
policy avec USING: true coexistait. Logique PERMISSIVE additive
PostgreSQL = la plus permissive gagne.

### Fix appliqué

Migration : supabase/migrations/20260521203522_drop_insecure_rls_policies.sql

DROP POLICY IF EXISTS "coach read photos" ON public.progress_photos;
DROP POLICY IF EXISTS "coach read measurements" ON public.body_measurements;

Pas de REPLACE nécessaire : les policies correctement scopées
existent déjà sur les deux tables.

Application : SQL Editor Supabase, validation par re-run de
l'audit pg_policies.

Validation post-fix :
- progress_photos : 6 policies (était 7), policy correcte intacte
- body_measurements : 5 policies (était 6), policy correcte intacte
- Cross-tenant SELECT bloqué au niveau PostgreSQL

### Bugs moyens détectés (non-fixés ce sprint)

Bug #3 — coach_clients self-insert
- Policies : "Clients can be assigned" + "clients can insert themselves"
- Effet : un user authentifié peut s'auto-déclarer client de
  N'IMPORTE QUEL coach (INSERT avec WITH CHECK auth.uid()=client_id,
  pas de vérif sur coach_id existant ou consenting)
- Impact : pas de leak de données (l'attaquant ne lit pas les
  données du coach), mais pollution table coach_clients,
  apparition potentielle sur dashboard coach victime, potentiellement
  déclenchement de notifications
- À traiter dans session ultérieure (~15-20 min, demande réflexion archi)

### Dette cosmétique RLS (P2)

Doublons de policies sur la plupart des tables Tier 1 (ex:
body_measurements_own + own measurements + users manage own
measurements font la même chose). Restes de migrations successives.
Pas un bug, mais maintenance lourde. À nettoyer dans une session
dédiée "RLS cleanup" (~1h).

Roles incohérents : mix {public} et {authenticated} sur la même
table. {public} inclut anon, mais auth.uid() retourne NULL pour
anon donc effective. Sale mais pas dangereux.

### Apprentissages senior consignés

Pattern dangereux à chercher en audit RLS : USING: true (policy
qui désactive effectivement le check pour SELECT). Toujours vérifier
les colonnes using_clause et with_check du dump pg_policies.

Tier-based audit > exhaustive audit en time-boxed session :
prioriser sur la sensibilité des données et la surface d'attaque,
pas sur le nombre de tables.

PERMISSIVE est additive en PostgreSQL : si N policies existent
pour une commande sur une table, l'utilisateur peut effectuer
l'action si AU MOINS UNE le permet. Donc une policy défectueuse
USING: true à côté d'une policy correcte = la défectueuse gagne.

### Decisions architecturales

- Migration versionnée dans le repo (supabase/migrations/) plutôt
  que SQL ad-hoc dans le SQL Editor. Trace Git, reproductibilité,
  audit RGPD facilité.
- DROP plutôt que REPLACE : les policies correctes existent déjà,
  on ne remplace pas une policy défectueuse par une autre.
- Application via SQL Editor (Option A) plutôt que supabase CLI db
  push (Option B) : 0 risque d'effet de bord sur autres migrations
  en attente.

### Reste à faire — Phase 2 partie 2 (cette session ou suivante)

- Tester cross-tenant SQL sur les 17 tables Tier 2 (~30 min)
- Si bugs trouvés : fix selon même pattern que Tier 1

### Reste à faire — Phase 3 (~1.5h, prochaine session)

- Migration delete_user_account(uuid) PL/pgSQL transactionnelle
- Refacto route API pour appeler le RPC
- Tests rollback

### Commits

| # | Hash | Description |
|---|---|---|
| 1 | a337951 | fix(rls): drop 2 insecure policies leaking sensitive data |

---

## 2026-05-20 — Sprint Launch Prep Phase 1 COMPLETE (~3h)

### Objectif
Finaliser le split landing/app entre moovx.ch (marketing) et app.moovx.ch
(app authentifiée). Suite directe de la session 19 mai.

### Realisations

1.D.2 — Câblage host-redirect (commit 093605a, fin session 19/05)

1.D.3.a — Skip Supabase pour routes API et statiques (commit ea16d0f)
- Early return dans proxy() pour /api/*, /_next/*, /sitemap.xml, /robots.txt
- Évite getSession() redondant sur routes API qui gèrent leur auth en handler
- Évite que les webhooks Stripe (sans cookie auth) déclenchent du boulot Supabase
- Dédup const pathname

1.D.3.b — Matcher étendu (commit ec25bcf)
- AVANT : matcher ['/', '/coach/:path*', '/client/:path*']
- APRÈS : match toutes routes sauf assets statiques (regex inversée)
- Active enfin le redirect host-based sur /login, /register-client,
  /onboarding*, /admin/*, /paywall

1.E-1.G — Config externe
- Cloudflare DNS : CNAME app vers Vercel — déjà configuré
- Vercel : app.moovx.ch attaché, SSL valid — déjà configuré
- Supabase : Site URL https://app.moovx.ch, Redirect URLs incluent
  https://app.moovx.ch/** et https://moovx.ch/** (safety net)

1.H — Validation E2E prod
- 5 tests curl automatisés tous verts
- 5 scénarios navigateur manuels tous verts

### Bug prod détecté + fix immédiat

Symptôme : user change langue sur landing (DE), navigue vers
app.moovx.ch/login, page login en FR au lieu de DE.

Root cause : Navbar.tsx ligne 22 posait NEXT_LOCALE via document.cookie
brut, sans attribut domain. Cookie host-only sur moovx.ch, invisible
depuis app.moovx.ch.

Fix (commit 21cf850) : ajout conditionnel domain=moovx.ch + Secure
en prod, même pattern que routes API patchées en 1.C (commit 48b4cd6).

Validation DevTools post-fix :
- Domain : .moovx.ch (avec point devant = cross-subdomain)
- Secure : oui
- Page login s'affiche désormais en DE après changement langue landing

### Apprentissage senior consigné

Les tests curl ne remplacent pas un test E2E navigateur pour les
changements touchant cookies, redirects, ou état navigateur. Scénario 4
(validation manuelle) a détecté un bug invisible aux 10 tests curl
automatisés.

### Decisions architecturales

- Skip API du middleware : /api/* gère son auth en handler. Économie
  5-20ms par requête + évite Stripe webhooks de déclencher du boulot inutile.
- Matcher regex inversée : pattern Next.js standard, plus maintenable.
- Cookie set client harmonisé avec serveur : même garde-fou NODE_ENV.

### Reste à faire — Phase 2 et 3 du Sprint Launch Prep

- Phase 2 : RLS audit Supabase
- Phase 3 : Delete account RPC transactionnel

### Dette technique consciente (rappel)

- Bug pré-existant proxy.ts : early-returns redirects ne portent pas
  les cookies Supabase mis à jour. Race condition rare.
- 4 stashes Git accumulés. Session "git hygiene" 15 min à planifier.
- Cas app.moovx.ch/ non loggué : 2 redirects au lieu d'1.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | ea16d0f | feat(proxy): skip middleware for API and static routes |
| 2 | ec25bcf | feat(proxy): broaden matcher to all routes except static assets |
| 3 | 21cf850 | fix(i18n): share NEXT_LOCALE cookie from landing navbar |

---

## 2026-05-19 — Sprint Launch Prep Phase 1 (Domain Split) — partial (~3h)

### Objectif
Préparer le split landing/app entre `moovx.ch` (marketing) et
`app.moovx.ch` (app authentifiée). Phase 1 sur 3 du sprint Launch Prep.

### Realisations (Phase 1.A → 1.D.1)

**1.A — Refacto SEO**
- `lib/seo.ts` : `SITE_URL` lit `NEXT_PUBLIC_SITE_URL` avec fallback `https://moovx.ch`
- Symétrie avec `NEXT_PUBLIC_APP_URL`

**1.B — Env vars**
- Ajout `NEXT_PUBLIC_SITE_URL=https://moovx.ch` dans `.env.example`,
  `.env.local`, Vercel (production + preview + development)
- Validé localement : `curl /sitemap.xml` retourne bien `https://moovx.ch`

**1.C — Cookie NEXT_LOCALE cross-subdomain**
- Décision stratégique : auth Supabase **isolée** par host (least privilege),
  `NEXT_LOCALE` **partagé** sur `.moovx.ch` (UX cohérente)
- Patch 2 routes : `app/api/user/locale/route.ts` + `app/api/user/sync-locale/route.ts`
- Pattern : `...(NODE_ENV === 'production' && { domain: 'moovx.ch' })`
- Garde-fou localhost preservé (le `domain` n'est posé qu'en prod)
- Validé visuellement DevTools : cookie `Domain=localhost` en dev ✅

**1.D.1 — Helpers proxy host-based (dead code)**
- Constantes `MARKETING_HOSTS = ['moovx.ch', 'www.moovx.ch']`, `APP_HOST`
- Helper pur `isLandingPath()` : détermine si un path appartient à la landing
- Helper pur `getHostRedirect()` : retourne un redirect 308 host-based ou null
- Code mort : helpers pas encore appelés dans le middleware

### Decisions architecturales

- **Routing strategy : Option B** (split `moovx.ch` + `app.moovx.ch`)
  - Pattern standard SaaS, séparation marketing/produit
  - Headers de sécurité plus stricts possibles sur `app.`
- **Cookies** : auth isolée par host, locale partagée cross-subdomain
- **Mécanisme split** : middleware Next.js étendu, pas `next.config.ts` rewrites
  - Centralisé, edge runtime, debug facile
- **Helper séparé** `getHostRedirect()` : code testable mentalement, early-return en début de middleware pour économiser l'init Supabase

### Bug détecté + résolu : transformation Markdown du terminal

Lors de l'écriture du code par Claude Code, la string `'www.moovx.ch'`
a été transformée silencieusement en `'[www.moovx.ch](https://www.moovx.ch)'`
(format Markdown). tsc ne l'attrape pas (string valide), mais à l'exécution
`MARKETING_HOSTS.includes('www.moovx.ch')` aurait retourné false.

Cause racine : terminal/clipboard avec auto-formatting Markdown qui
interprète les URLs au paste.

Fix : édition directe via sed (regex échappée pour ne pas re-pase l'URL).
Validation finale via `od -c` (vue binaire indiscutable).

Apprentissage Senior consigné :
- Pour les strings sensibles (URLs, regex), éviter le paste depuis Markdown
- Pour valider un fichier en cas de doute, utiliser `od -c` ou `xxd`
- Ne pas faire confiance à Claude Code quand il dit "le fichier est correct"
  alors qu'on doute : valider au niveau binaire

### Reste à faire — Phase 1 (prochaine session ~2-3h)

- [ ] **1.D.2** Câbler `getHostRedirect()` en tout début du middleware (early return)
- [ ] **1.D.3** Étendre le matcher du middleware avec regex inversée
      (`/((?!_next/static|_next/image|favicon.ico|...).*)`)
- [ ] **1.D.4** Tests locaux via `curl -H "Host: app.moovx.ch"` (simulation)
- [ ] **1.E** Config Cloudflare DNS : CNAME `app` → `cname.vercel-dns.com`
- [ ] **1.F** Config Vercel : ajouter `app.moovx.ch` dans Domains
- [ ] **1.G** Config Supabase : Redirect URLs + CORS pour `https://app.moovx.ch`
- [ ] **1.H** Validation prod : magic link, login, paywall Stripe end-to-end

### Reste à faire — Phase 2 (Sprint Launch Prep)

- [ ] **Phase 2** : RLS audit Supabase (script SQL cross-tenant)
- [ ] **Phase 3** : Delete account RPC transactionnel (15+ tables)

### Dette technique consciente

- **Bug pré-existant proxy.ts** : early-returns (lignes 65, 77, 81, 84, 95, 108, 109)
  créent un `NextResponse.redirect()` qui ne porte pas les cookies Supabase
  mis à jour. Race condition rare (refresh token pendant redirect → re-login).
  À traiter dans un sprint dédié `fix(proxy): preserve auth cookies in redirects`.
- **4 stashes Git accumulés** (`stash@{0..3}`) — 1 récent + 3 anciens.
  Session "git hygiene" 15 min à planifier (revue + drop ou apply).
- **Cas `app.moovx.ch/` non loggué** non géré : redirige vers `/fr/landing`
  sur `app.moovx.ch` au lieu de `moovx.ch`. Pas bloquant, à traiter avec un
  redirect aval dans 1.D.2.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 59e1c75 | config(env): add NEXT_PUBLIC_SITE_URL |
| 2 | a15dfaa | refactor(seo): SITE_URL reads env var with fallback |
| 3 | 48b4cd6 | feat(cookies): share NEXT_LOCALE across .moovx.ch subdomains |
| 4 | 2878578 | feat(proxy): add host-based redirect helpers (dead code) |

### Stash mis de côté
- `stash@{0}` (créé aujourd'hui) : suppression de 9 fichiers vidéo curl
  dans `public/videos/exercises/` (vidéos servies depuis Supabase Storage
  depuis hier soir, fichiers locaux obsolètes) + `.claude/settings.local.json`,
  `.exercise-media-sync.json`, `package-lock.json`.
  À traiter dans un commit dédié `chore(videos): remove local files migrated to Supabase Storage`.

---

## 2026-05-18 — Performance + i18n Sprint 5A-5J (~8h)

### Sprint Performance (~2h)
- Score mobile 53 → 70, desktop 80 → 96
- TBT 590 → 35ms (-94%)
- Desktop LCP 2.1s → 0.54s
- Hero converti Server Component (texte SSR, hydration decouplee du LCP)
- AVIF config (active sur upgrade Vercel Pro, WebP -99% en attendant)
- RUM via /api/vitals + useReportWebVitals

### Sprints i18n (10 sprints, 1050 cles × 3 langues)
- 5A Onboarding Coach : 83 cles
- 5B Paywall : 49 cles + nouveau pattern ClientIntlProvider
- 5C ProfileTab : 86 cles + delete account localise + locale-aware dates
- 5D ChatTab Athena : 33 cles + prompts localises front
- 5F TrainingTab couche 1 : 36 cles (parent + 4 sub-components)
- 5G ProgressTab : 23 cles
- 5H NutritionTab couche 1 : 31 cles
- 5I Dashboard Coach : 23 cles
- 5J HomeTab couche 1 : 23 cles (cards + quotes + date locale)
- Fix critique 0e8f856 : ClientIntlProvider wraps tout l'app shell

### Crash + Fix critique
Root cause : useTranslations() appele sans ClientIntlProvider parent.
Fix : ClientIntlProvider wraps tout l'app shell (app/page.tsx).
Script prevention : npm run i18n:check (scripts/check-i18n.mjs).

### Progression cumulative i18n
Avant : 18% (6 ecrans, 246 cles)
Apres : ~48% (15 ecrans, 1050 cles)
Funnel acquisition i18n complet ✅
Funnel paid lifecycle i18n complet ✅
Funnel coach onboarding + dashboard i18n complet ✅

### Dette technique consciente
- Couches 2/3 tabs Training, Nutrition, Progress, Home → Sprint 6
- BadgesModal, BadgeCelebration → Sprint 6
- Client view detaillee coach (~660 lignes) → Sprint 6
- Noms exercices/aliments DB en FR → migration dediee
- Motivational quotes HomeTab : 3 categories × 15 quotes FR — EN/DE traduits (indexed)

### Fixes session tardive (19h-20h30)

Bug exercise videos :
- Diagnostic : 34/59 exos sans match en DB (58%)
- Root cause : IA genere des variants ("Hip Thrust Unilateral") sans match exact
- Fix 1 : lib/exercise-matching.ts — normalize + prefix fallback + copie video_url
- Fix 2 : INSERT 25 exos parents manquants en DB
- Fix 3 : CSP media-src etendu a Supabase Storage
- Fix 4 : script enrich-parent-exercises.mjs — 9 parents enrichis avec videos locales

Bilan media : 42% → 85% couverture exercises

### Commits session tardive
| # | Hash | Description |
|---|---|---|
| 1 | b959de8 | fix(exercises): fuzzy match + copy video_url |
| 2 | c2169c3 | data(exercises): add 25 missing parent exercises |
| 3 | 9defb8d | fix(csp): allow media from supabase storage |
| 4 | 2202e1e | feat(media): one-shot script to enrich parent exercises |

---

## 2026-05-18 — (superseded by consolidated entry above)

---

## 2026-05-17 — Sprint 4b LocaleSelector

Selecteur de langue persistant dans Compte > Preferences de l'app authentifiee.

Stack :
- Migration profiles.preferred_locale (text fr/en/de, default 'fr', CHECK, index)
- API POST /api/user/locale : switch (DB update + cookie sync 12 mois)
- API POST /api/user/sync-locale : POST au login (DB → cookie, cross-device)
- Composant LocaleSelector dans Compte > Preferences (section expandable)

Limitation : l'app authentifiee reste FR hardcode (134 fichiers Sprint 5+).
Le LocaleSelector affecte : 6 ecrans auth Sprint 4 + landing publique.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 62ade68 | feat(i18n): persistance langue user via profiles.preferred_locale |
| 2 | 403299f | feat(i18n): LocaleSelector dans Compte > Preferences |

---

## 2026-05-17 — Sprint 4 i18n Critical Path

### Realisations

Infrastructure :
- lib/get-locale.ts + components/AuthIntlProvider.tsx
  → useTranslations() utilisable sur routes hors [locale]
- Pattern split server wrapper + client content

6 ecrans business-critical traduits FR/EN/DE :
- login (21 cles), join (19 cles), register-client (50 cles)
- onboarding (68 cles), onboarding-fitness (62 cles), onboarding-photo (26 cles)
- Total : 246 cles extraites + 492 traductions EN/DE
- 12 ICU variables preservees (firstName, count, coachName, etc.)

Strategie : Option B (wrapper local AuthIntlProvider) plutot que migration structure URL.
Reste FR hardcode (Sprint 5+) : dashboards coach/client, Paywall, admin, profils.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 96cbff5 | feat(i18n): infrastructure i18n pour routes hors [locale] |
| 2 | f5893f2 | feat(i18n): extraction strings auth flow vers namespaces |
| 3 | 3764c7a | feat(i18n): traductions EN + DE pour 246 cles auth |

---

## 2026-05-17 — Sprint 3 Hardening

### Realisations

Infrastructure rate limiting :
- Table ai_usage_logs (RLS, 2 indexes, 2 policies) — migration validee en DB
- Helper lib/rate-limit.ts : checkAiRateLimit + logAiUsage + aiRateLimitResponse
- Fail-open en cas d'erreur DB, headers X-RateLimit-* RFC

Rate limits appliques sur 3 endpoints IA couteux :
- generate-custom-program : 5/h
- analyze-progress-photo : 10/h
- generate-meal-plan : 10/h

Hardening Stripe :
- Connect : idempotency key + DB pre-check + update conditionnel (anti race)
- coach-checkout : validation 30-500 CHF + normalisation 2 decimales

Test runtime valide local : 2 meal-plans generes → 2 entries DB confirmees.

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 06b6702 | feat(security): rate limiting infrastructure (Sprint 3) |
| 2 | 8803e5f | feat(security): apply rate limits on 3 expensive AI endpoints |
| 3 | 0e2a4fb | feat(security): Stripe Connect dedup + coach rate validation |

---

## 2026-05-17 — Sprint 2 Legal Safe

### Realisations
- CGU + Privacy multilingues FR/EN/DE (nLPD CH + RGPD UE)
- CookieConsent v3 minimal premium (card flottante centree, animation slide-up 400ms, accent gold)
- AnalyticsGate (Vercel Analytics + SpeedInsights conditionnes au consentement)
- Checkboxes checkout Stripe : acceptCgu + waiveWithdrawal (bloquent CTA)
- Footer locale-aware + ManageCookiesButton
- Migration app/cgu et app/privacy vers app/[locale]/cgu et app/[locale]/privacy
- Convertisseur markdown→HTML lib/markdown.ts (zero dependency, npm cache casse)
- 6 nouvelles routes legales validees en prod
- Strings i18n cookieConsent/legal/footer ajoutees FR/EN/DE

### Iterations design
- v1 : bandeau edge-to-edge (trop large)
- v2 : card flottante max-w-2xl + icone M + glow gold (trop dense)
- v3 : card max-w-xl + titre label uppercase + suppression icone/glow + padding px-12 py-10 (final)

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | e8b4d5e | feat(legal): CGU + Privacy multilingues FR/EN/DE |
| 2 | 3812e44 | feat(legal): CookieConsent v3 minimal + checkboxes Stripe + footer |

---

## 2026-05-17 — Sprint 1 Stripe Live Safe + Security Headers

### Realisations
- Table stripe_webhook_events pour deduplication events Stripe (UNIQUE event_id)
- Webhook handler: dedup, refetch Stripe (defense in depth), return 200 sauf signature invalide
- Checkout: idempotency keys, ordre inverse (Stripe avant DB insert), UUID validation
- Coach checkout: idempotency keys, erreurs sanitizees
- Security headers: CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, HSTS (prod), Permissions-Policy camera=(self)
- catch (e: unknown) au lieu de any pour type safety

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 48f5e2e | docs: update SESSION_LOG and ROADMAP after SEO waves 1-3 |
| 2 | 07e8ade | feat(security): Sprint 1 — Stripe Live Safe + Security Headers |

---

## Session 2026-05-16 → 2026-05-17 — SEO Technique + Stripe Rebrand

### Objectifs
- Mettre en place SEO multilingue technique de niveau production
- Finaliser le rebrand Coach IA → Athena (cote Stripe Dashboard)

### Realisations

**VAGUE 1 SEO — Detection langue automatique** (commit anterieur)
- proxy.ts detecte la locale via cookie NEXT_LOCALE → Accept-Language → x-vercel-ip-country → fallback fr
- Cookie NEXT_LOCALE persiste le choix au click drapeau

**VAGUE 2 SEO — Hreflang + Sitemap + Robots + OG** (commit fff580a)
- Creation lib/seo.ts (helper centralise: SITE_URL, LOCALES, hreflang builder, OG locale mapping)
- Creation app/sitemap.ts (3 langues × pages avec alternates hreflang)
- Creation app/robots.ts (reference sitemap, disallow auth routes)
- generateMetadata deplace dans app/[locale]/landing/page.tsx (route la plus profonde = priorite Next.js)
- Suppression ancien export const metadata "Coaching Fitness Pro" dans landing/layout.tsx
- Ajout namespace "metadata" dans messages/fr.json + en.json + de.json
- Ajout placeholder og-image.jpg 1200x630
- Suppression des anciens public/sitemap.xml et public/robots.txt (remplaces par routes dynamiques)

**VAGUE 3 SEO — Schema.org structured data** (commit b6fec2d)
- Creation lib/structured-data.ts (helpers types: Organization, LocalBusiness, WebSite, schemaGraph builder)
- Creation components/StructuredData.tsx (composant serveur JSON-LD)
- Injection @graph dans app/[locale]/landing/page.tsx (Organization + HealthAndBeautyBusiness + WebSite)
- SoftwareApplication existant preserve dans landing/layout.tsx
- Coordonnees GPS Geneve (46.2044, 6.1432), areaServed CH/FR/DE
- inLanguage adapte a la locale (fr/en/de)

**Stripe Rebrand Coach IA → Athena**
- Produit Stripe renomme: MoovX Coach IA → MoovX Athena
- Description mise a jour: "Athena, ton coach IA personnel 24/7"
- 3 price IDs preserves (10 CHF/mois, 80 CHF/an, 150 CHF lifetime)
- Product ID inchange: prod_UFWe600xptRDsp
- Aucune modification de code necessaire (la formulation "Coach IA Athena" / "AI Coach Athena" / "KI-Coach Athena" dans les JSON est intentionnelle: nom propre + descripteur)

### Validations
- Schema.org validator: 0 erreur, 0 warning, 3 elements detectes
- Google Rich Results Test: 5 elements valides (Commerces et services, Organisation, Extraits d'avis, Applications logicielles)
- Hreflang Testing Tool: 4 hreflang valides (fr/en/de/x-default), self-referencing OK, 200 OK
- Tests iPhone reel via moovx.ch: tous les flows OK (landing 3 langues, login, register-client)

### Bugs resolus
- Conflit /sitemap.xml entre public/sitemap.xml (statique) et app/sitemap.ts (dynamique) → suppression du statique
- generateMetadata ignore sur /fr/landing (ancien "Coaching Fitness Pro" ecrasait le nouveau) → cause racine: metadata declaree trop haut dans l'arbre de routes Next.js. Fix: deplacer generateMetadata dans la page la plus profonde (landing/page.tsx)

### Fichiers impactes
Crees:
- lib/seo.ts
- lib/structured-data.ts
- components/StructuredData.tsx
- app/sitemap.ts
- app/robots.ts
- public/og-image.jpg (placeholder)

Modifies:
- app/[locale]/landing/page.tsx (generateMetadata + injection StructuredData)
- app/[locale]/landing/layout.tsx (suppression ancien metadata)
- app/[locale]/layout.tsx (retour a l'etat pre-VAGUE 2)
- messages/fr.json, en.json, de.json (namespace metadata)

Supprimes:
- public/sitemap.xml
- public/robots.txt

### Commits
| # | Hash | Description |
|---|---|---|
| 1 | 3930bb3 | feat(seo): auto-detect locale on root path + persistent cookie |
| 2 | fff580a | feat(seo): hreflang multilingue + sitemap + robots + OG par locale |
| 3 | b6fec2d | feat(seo): add Organization + LocalBusiness + WebSite JSON-LD schemas |

---

## 14 mai 2026 (nuit) — Refonte Landing Power + Rebrand Athena + i18n Complete

**Duree** : ~10 heures
**Branche** : `main` (deployee)

### Objectifs atteints

1. **Refonte landing direction "Power & Performance"** (14 sections)
2. **Rebrand Coach IA → Athena** (code + a faire Stripe Dashboard)
3. **Architecture i18n complete** avec `next-intl` (FR/EN/DE)
4. **Traduction de 16/17 sections actives** de la landing
5. **Cleanup repo** (14 fichiers `.OLD.tsx` supprimes)

### Sections refondues Power

Direction visuelle inspiree Nike/Whoop/IWC : brutalisme athletique premium, Bebas Neue 200pt, gold #D4A843, viewfinder corners, GSAP ScrollTrigger.

Hero (chalk-athlete) · MarqueeSection · Results (transformation avant/apres) · NutritionSection (bowl) · TrainingSection (runner mountains, PPL table) · TrackingSection (dashboard 3D) · CoachIaSection (iPhone Athena AI + neurones) · CoachingPro (coach tablet) · Geneva (Jet d'Eau sunset) · Testimonials (medaille gold) · Steps (4 corners viseur) · PricingSection · PwaSection · FaqSection · CtaSection (victory)

### Rebrand Athena

- `app/components/tabs/AccountTab.tsx` : label "Coach IA" → "Athena" (Sparkles icon)
- `app/api/stripe/checkout/route.ts` : 3 descriptions PLAN_META
- `app/api/stripe/setup-products/route.ts` : product name
- **TODO manuel** : Stripe Dashboard live → renommer "MoovX Coach IA" → "MoovX Athena"

### Architecture i18n

- **Stack** : `next-intl` 4.12.0
- **Locales** : `fr` (default) · `en` · `de`
- **Routing** : `localePrefix: 'always'` → `/fr/landing` `/en/landing` `/de/landing`
- **Decision** : PAS de `middleware.ts` (conflit `proxy.ts` Next 16). Routing locale via `[locale]`.
- **Trade-off** : pas de redirect auto `/` → `/fr` (a faire dans `proxy.ts` next session)

### Sections i18n traduites

16 sections actives x 3 langues, ~282 cles au total :
Hero (18) · Marquee (1) · Footer (8) · Steps (15) · Navbar (3) · Nutrition (18) · Training (28) · Tracking (20) · CoachIa (20) · Results (14) · CoachingPro (25) · Testimonials (21) · Pwa (26) · Pricing (40) · Faq (17) · Geneva (14) · Cta (14)

EconomicModel SKIP (a refondre Power dans session future)

### Fixes critiques

1. Routing `/landing` → `/fr/landing` : 3 redirects (page.tsx, onboarding, useClientDetail)
2. Mismatch fichiers images : decalage d'un cran fixe via bash mv
3. 12 mismatches code/JSON (Testimonials age/location, Pricing yearly/subtitle/coach naming)
4. Doublon section pricing : EconomicModel commente dans page.tsx

### Decouverte post-session

**Mobile responsive non teste** durant la session. Landing Power = desktop-only.
Priorite #1 session suivante (voir ROADMAP.md).

### TODO immediat

- [ ] Stripe Dashboard live : renommer "MoovX Coach IA" → "MoovX Athena" (5 min manuel)

---

## 14 mai 2026 (soir) — Feedback admin + visibilite in-app

### Livre
- Page /admin/feedback (KPIs + liste filtrable + dialog reply avec form)
- Backend bug-reports : GET (filters/sort) + PATCH (meta) + POST /reply (email branded)
- Helper lib/email.ts partage (SMTP Infomaniak + template HTML gold)
- Hooks useMyFeedback + useMyFeedbackBadge cote client
- API /api/feedback/mine + /api/feedback/mark-all-read (RLS-scoped)
- Page client "Mes rapports" dans AccountTab (badge gold + auto-mark-read)
- BugReport modal universel : 2 tabs (Nouveau / Mes rapports), badge sur bouton flottant
- Audit trail complet (bug_report_update, bug_report_reply dans app_logs)
- Premier email admin → client envoye

### Bugs rencontres et resolus
- RLS bug_reports : admin role 'admin' en DB mais policies sur 'super_admin'
- Zod 4 : chaines .nullable().optional() peu fiables → migre vers z.union explicite
- Postgres CHECK constraints en francais decouvertes a l'execution
- Typo SMTP_USER Vercel : 'noreply.moovx.ch' au lieu de 'noreply@moovx.ch' → fixe
- React StrictMode causait double toast → dedup par id sonner

### Commits
| # | Hash | Description |
|---|---|---|
| 13 | 99da29c | feat(admin): feedback page with branded email reply (FR-aligned schema) |
| 14 | 86460a7 | feat(client+coach): in-app visibility for admin replies on bug reports |

---

## 14 mai 2026 (journee) — Construction console admin

### Contexte initial
- Bug login admin resolu en session precedente (proxy.ts, getRole, SW)
- Console admin basique : seulement 2 comptes affiches (RLS Supabase)
- Mission : vraie console (users / Stripe / logs) + design coach-aligned

### Decouvertes critiques
- bobitosm@gmail.com en DB : `role = 'admin'` (pas `super_admin`, pas `client`)
- RLS profiles cherche `super_admin` → admin "normal" bloque
- Solution : API routes server-side avec service_role, auth par email
- `payments.amount` en francs, `Stripe SDK` en centimes — deux conventions
- Tailwind 4 n'emet pas toujours `lg:pl-[240px]` → migration vers CSS module
- Polices brand : Bebas Neue + Outfit + Barlow Condensed (deja dans globals.css)
- Gold brand `#d4a843` (CSS var `--gold`), pas `amber-400`

### Commits livres (chronologique)
| # | Hash | Description |
|---|---|---|
| 1 | 844c8fc | feat(admin): mutualize supabase clients |
| 2 | badbfef | feat(admin): verifyAdmin + users API routes |
| 3 | f28c20a | feat(admin): stripe stats + payments API routes |
| 4 | 75179a1 | feat(admin): premium console shell + overview KPIs |
| 5 | d2067c6 | fix(admin): correct sidebar overlap and mobile header |
| 6 | (cssfix) | fix(admin): use plain CSS for sidebar offset (T4 compat) |
| 7 | ac04cfc | feat(admin): users management page (search, filters, dialogs) |
| 8 | ef6df1c | feat(admin): revenue dashboard + audit logs pages |
| 9 | c8eea7c | fix(admin): correct currency conversion (cents vs major) |
| 10 | 0b4c428 | feat(admin): show Stripe net revenue + 12-month chart |
| 11 | 8e4e0ee | style(admin): align design system with Coach Pro brand (foundation) |
| 12 | 5989bf8 | style(admin): polish KPI cards, tables and toolbars (brand alignment) |

### Etat architecture
- Backend : `lib/supabase/{client,server,admin}.ts`, `lib/admin/{auth,logger,stripe,types,api-client}.ts`
- API routes : `app/api/admin/{users,users/[id]/role,users/[id]/subscription,stripe/stats,stripe/payments,logs}`
- UI : `app/admin/{layout,page,users,revenue,logs}` + `app/admin/_components/{AdminSidebar,KpiCard,Card,StatusBadge,Modal,RevenueChart,PageHeader,formatters}`
- Design system : `app/admin/admin.css`

### Securite validee
- service_role JAMAIS expose au client (`import 'server-only'`)
- Bearer token + email check sur CHAQUE API admin
- Page /admin guard cote client (UX) + chaque route guard cote serveur (vrai)
- Aucune modification de proxy.ts (flow login preserve)

### Workflow rules
- **Local-first** : `npm run dev` → validation visuelle → commit → push
- Pas de push sans validation utilisateur
- Commits atomiques, messages descriptifs
- tsc clean obligatoire avant commit
