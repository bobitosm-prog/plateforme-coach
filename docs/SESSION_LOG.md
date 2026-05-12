# Session Log — MoovX

> Source de verite pour reprendre apres une fenetre fermee, un crash,
> un changement de session. **Toujours lu au demarrage. Toujours mis
> a jour apres chaque commit.**

---

## ETAT ACTUEL (mis a jour en continu)

**Date derniere mise a jour** : 2026-05-12 22:00
**Branche** : main
**HEAD** : `b96f158` feat(nutrition): Calendrier JOURNAL harmonisation Training T3
**Working tree** : clean

### Tache en cours
Aucune — NUTRITION TAB 100% REFONDU ET COHERENT (11/11 visuels + F4 fix)

### Blockers
Aucun

### Prochaine tache prevue
1. N2.2.3 (M, 1h) : Calendrier harmonise T3 Training (reporte, risque moyen)
2. Sprint Recovery Modal V2 — overlay SVG zones sur images IA (P1, 1h30-2h)
3. Test gym BUG 2 tap-to-autofill + validation sprint progression
4. Sprint Refonte modele exercices (exercise_id FK) — M, 3-4h, P1
5. Sprint Layout Desktop autres sections

### Backlog priorisee
1. ~~Sprint Securite~~ ✅ DONE
2. ~~Sprint Layout Desktop~~ ✅ DONE (9 mai 2026)
3. ~~Sprint Realtime Messages~~ ✅ DONE (9 mai 2026)
4. ~~Sprint Refonte Progression~~ ✅ DONE (9 mai 2026)
5. BUG Seance Libre historique exo — S-M (1-2h)
6. Sprint Layout Desktop autres sections — M-L
7. Sprint Images (54 img → next/image) — 3h
8. Sprint Refonte page Mes Clients coach — M (3-4h)
9. Sprint Refacto composants > 500 lignes — L
10. Sprint Qualite Code (console.log, eslint-disable, deps) — 2-3h
11. Sprint FK manquantes globalement — M
12. Sprint Accessibilite (~620 boutons sans aria-label) — M-L
13. Sprint typage strict (497 any) — XL
14. Sprint Native Capacitor — long terme 15-20h

---

## LOG CHRONOLOGIQUE (append-only, ne jamais effacer)

### 2026-05-11

- 22:00 `b96f158` feat(nutrition): Calendrier harmonisation T3 (N2.2.3)
- 21:45 `e687118` fix(nutrition): ShoppingList parseMealPlan fix (F4)
- 21:30 `6887cfc` feat(nutrition): PLAN harmonisation visuelle (N2.9)
- 20:00 `24d82ad` feat(nutrition): NutritionPreferences refonte v2 (N2.6, 826 lignes)
- 19:30 `f5c2d9d` feat(nutrition): RecipesSection refonte v2 (N2.5)
- 18:00 `1b4f7a6` feat(nutrition): BarcodeScanner refonte v2 (N2.7)
- 17:30 `790821a` feat(nutrition): FoodSearch refonte v2 (N2.4)
- 16:00 `265e35a` feat(nutrition): REPAS emojis Lucide + glass (N2.3)
- 15:45 `5fbc8ea` feat(nutrition): ShoppingList + ImportPlanSheet v2 (N2.8)
- 14:00 `ca0cfb5` fix(home): Hydratation tracking restaure (F3)
- 13:45 `0077893` fix(home): Streak + todaySessionDone timezone normalize (F2)
- 13:30 `9ba1064` fix(training): WorkoutCelebration overlay non-blocking (F1)
- 12:00 `2cbf324` feat(nutrition): JOURNAL meal cards boutons harmonises (N2.2.4)
- 11:45 `aa845f9` feat(nutrition): JOURNAL macros bars + icones Lucide (N2.2.2)
- 11:30 `5de3742` feat(nutrition): JOURNAL emojis -> Lucide icons (N2.2.1)
- 11:15 `9188c82` feat(nutrition): NutritionTab tokens finalisation (N2.1)
- 10:00 `5860096` feat(training): Modals backdrop scrim harmonise (N1.5 FINAL)
- 09:50 `c483149` feat(training): Exercise card warm tint -> surface2 (N1.3.4)
- 12:00 `bc79db0` feat(training): Text colors -> tokens (N1.3.3 FINAL)
- 11:45 `f21b3a9` feat(training): Semantic colors -> tokens (N1.3.2)
- 11:30 `a53eb52` feat(training): Gold legacy #C9A84C -> GOLD (N1.3.1)
- 11:00 `4fdd650` feat(training): Modals backgrounds + borders divider (N1.2.3 FINAL)
- 10:30 `91fe518` feat(training): Active exercise backgrounds + borders divider

Sprint N1.2.2 — 4 BG_CARD -> colors.surface2 + borders divider dans
controles actifs seance (bouton +30S, close video, ajouter exercice,
empty state). 2 descriptions audit corrigees (L689 = close video pas
set card, L719 = ajouter exo pas timer control).

### 2026-05-10

- 13:00 `f909e1b` feat(home) refonte 3 cards Apercu + Recovery Modal
- 12:30 `bf75dec` feat(home) refonte Card Seance du jour en hero immersive
- 12:00 `cf5a051` feat(session-types) add getHeroImage/getHeroSlot + 22 tests
- 11:30 `1fc63e7` feat(home) refonte HomeHeader avec streak hexagone + niveau
- 11:00 `90d2a13` feat(assets) add 6 hero images for HomeTab (572K)
- 10:30 `385a09b` feat(design-tokens) extend for HomeTab redesign

SESSION 10 mai 2026 (matinee) — Refonte Home Client :
6 commits propres sur 5 sprints, 0 regression.
- S0.1 : Design tokens etendus (Anton, DM Sans, spacing, flame/surface2/divider)
- S0.2 : 6 hero images cinematiques palette doree (572K total)
- S1 : HomeHeader + streak hexagone SVG pulse + niveau cliquable modal
- S2.1 : getHeroImage lib + 22 tests session-types
- S2.2 : Hero Card Seance du jour 5 etats (active/done/rest/no-program/no-exercises)
- S3 : 3 cards Apercu (Energie ring+sparkline, Recup image+modal, Nutrition kcal+macros)

NOUVEAU TICKET P1 :
Sprint Recovery Modal V2 — overlay SVG zones musculaires precises sur
images cinematiques body-front/back.webp. Remplace MuscleHeatMap SVG
dans le modal. 6-10 zones polygones, couleurs dynamiques selon
muscleStatus, animation staggered. Effort 1h30-2h.

### 2026-05-09

- 22:30 `1f2be0b` fix(workout-session) seance libre history fetch

Bug : en seance libre, l'historique des poids ne s'affichait pas
pour les exos ajoutes via CustomBuilder.
Cause : useEffect dep stale ([raw] = props initiales = [] en seance
libre). Fix : dep stable [exoNamesKey] derivee des noms d'exos
courants. Fetch incremental (skip noms deja en cache). Merge states.
Cause 2 (NON RESOLUE) : mismatch noms entre exercises_db.name et
workout_sets.exercise_name (noms custom coach). Fix futur via
exercise_id FK.

LECON : toujours requeter la DB pour valider les hypotheses, pas
se fier a l'audit code seul. L'hypothese "pas de mismatch" avait
ete eliminee trop vite sans regarder les donnees reelles.

- 01:30 `aedc9a8` chore remove obsolete suggest-set-weight lib
- 01:20 `6f0ef2b` feat(workout-session) wire compute-progression + retire overloadHint
- 01:10 `5cfb3f5` feat(training-card) wire compute-progression dans preview
- 01:00 `0bf9628` feat(training) compute-progression lib pure + 33 tests

FIN SPRINT REFONTE PROGRESSION DE CHARGE (9 mai 2026, ~3h) :

AVANT :
- 3 systemes independants : suggestSetWeight (per-set inline),
  overloadHint (intra-seance dans timer repos), API IA Claude Haiku
- Step fixe 2.5kg, pas de filtrage completed, heuristique ±2h
- Suggestion intra-seance contraire aux standards musculation

APRES :
- 1 lib pure unifiee lib/training/compute-progression.ts (33 tests)
- 3 statuses : progress (tous >= cible) / hold (>=5 reps mais sous
  cible) / deload (1 set <5 reps OU 2 sessions bloquees)
- refWeight = max des sets valides (gere sets progressifs)
- step adapte par groupe musculaire (5kg/2.5kg/1.25kg)
- Badge sur 1er set en preview ET en seance, coherent
- Groupement par session_id, filtrage completed=true
- Suppression hint intra-seance timer

LECONS :
- Ne JAMAIS fixer un test pour le faire passer sans comprendre
  pourquoi il echoue. Le test est la spec.
- Bug refWeight subtil : prendre weight[0] regresse les users
  avec sets progressifs (echauffement). Fix: max des sets a cible.
- Lib pure + useMemo unique > IIFE repetes dans le render.

TICKETS BACKLOG :
- BUG Seance Libre : exos ajoutes manuellement ne chargent pas
  l'historique precedent (mismatch exercise_name probable). S-M.
- BUG test design-tokens (2 fails pre-existants). Sprint Qualite.

- 23:45 `e67527b` feat(coach-messages) realtime unread + last messages, polling 30s→120s
- 23:15 `8733e5f` feat(coach-messages) realtime chat messages, polling 3s→30s
- 22:30 `5003eea` feat(coach-messages) layout 2 colonnes desktop + extraction composants

FIN SPRINT REALTIME MESSAGES (9 mai 2026, ~5h) :
- Phase 1 : chat messages live (INSERT + UPDATE filtres serveur)
  - 2 channels : coach-chat-in + coach-chat-out
  - Polling 3s → 30s (Phase 1) puis 120s (Phase 2)
- Phase 2 : unread counts + last messages live
  - 1 channel global independant de selectedClient
  - Derivation locale des states depuis payload Realtime
- Latence : <500ms (vs 0-3s)
- Charge DB : ~60x reduction (60 queries/min → ~1 query/min/coach)
- Pattern aligne avec useMessages.ts et useClientDetail.ts

LECONS du sprint :
- FAUX POSITIF debug : log dans render body donne illusion de
  refetch en boucle (cf MessageImage). Toujours logger dans
  useEffect, jamais dans le body.
- Realtime + RLS : filter serveur OBLIGATOIRE sinon Supabase
  ne propage pas les events. Pas un bug : c'est securite.
- min-height vs height : flex enfant ne peut pas calculer
  sa taille depuis un parent en min-height seul.
- vh vs dvh : toujours dvh pour UI reelle (gere barres
  d'outils mobiles + zoom navigateur).

NOUVEAU TICKET BACKLOG (UI) :
- Refonte page "Mes Clients" coach (table actuelle moche :
  headers colles, pas de hierarchie, hover absent, avatars
  incoherents). Effort : M (3-4h).

FIN SESSION 9 mai 2026 — Sprint Layout Desktop Messages livre :
- Layout 2-col desktop : sidebar 320px + panel flex-1 (breakpoint 1024px)
- Extraction ConversationList + ConversationPanel depuis CoachMessages
- Fix layout root : height:100dvh conditionnel section messages + padding/overflow
- Auto-scroll refacto : setTimeout → rAF×2 + handlers load images
- Mobile pixel-perfect inchange (liste → overlay fullscreen)
- ~~DECOUVERTE BUG PRE-EXISTANT : MessageImage refetch~~ → FAUX POSITIF
  (log dans render body, pas dans useEffect — loggait chaque re-render
  React cause par le polling 3s, pas un vrai refetch. Cache useSignedUrl OK.)

LECON DEBUG : pour tracer un fetch, toujours logger dans le useEffect
qui fetch, jamais dans le render body. Un console.log dans le render
body logge a chaque re-render React, donnant l'illusion d'un refetch.

### 2026-05-07

- 21:07 `b3dc4f4` feat(training) per-set weight suggestion from previous session
- 20:54 `d594e7d` fix(workout-session) FR comma weightRaw refacto + reps NaN guard
- 19:30 `6225d09` fix(training) FR comma in weight input + locale-aware display + ordered prev sets

FIN SESSION 7 mai 2026 — Sprint BUG 1 + BUG 2 livre :
- BUG 1 corrige sur 2 parcours (TrainingExerciseCard + WorkoutSession)
  avec 5 inputs kg audites au total
- BUG 2 livre dans TrainingExerciseCard avec lib pure + wire complet
- 3 commits propres + 1 merge + 1 commit docs
- Test live integral valide : virgule FR, 3 cas suggestion (progress/hold/missed),
  persistance DB, console clean
- Tap-to-autofill a valider en gym mobile reelle (desktop browser ne dispatch pas correctement)
- WorkoutSession (Seance libre) reste sans BUG 2 — note tech debt

- 06:30 `9f67fdf` Merge sprint-securite sur main (push origin main fait)
- 06:15 `21a5850` security harden /api/debug-auth whitelist dev only
- 06:10 `b539abe` security auth gate 3 routes Stripe (setup-products, check-account, coach-checkout)
- 06:00 `eb412f2` security throw if SERVICE_ROLE_KEY missing on 4 admin routes
- 05:40 `ec96fbf` docs(roadmap) consolidation 3 fichiers + integration audit complet 7 mai

FIN SPRINT SECURITE 7 mai 2026 — 3 P0 audit corriges :
- 4 routes fallback SERVICE_ROLE → throw 500 (assign-coach, log-error, send-notification, coach-checkout)
- 3 routes Stripe auth-gated (setup-products admin-only, check-account, coach-checkout)
- log-error : rate limit 10 req/min/IP + service_role strict
- debug-auth : whitelist dev only (!=development → 404)
8 fichiers routes modifies, 0 regression (build OK).

Audit complet (Claude Code) revele 3 P0 securite non documentes.
ROADMAP unique consolidee a partir de 3 fichiers separes.
Anciennes roadmaps archivees dans docs/archive/.

### 2026-05-06

- 21:00 `0d2400a` feat chat-ai cablage UI + bouton effacer + UX polish (Phase 3/3 DONE)

- 20:50 `ce7474a` feat chat-ai persistance serveur + hook useChatAI (Phase 2/3)
- 20:35 `7a4fe2a` feat chat-ai table chat_ai_messages + RLS + auto-purge 30j (Phase 1/3)

FIN SESSION 6 mai 2026 — Sprint ChatAI persistance complet livre
en 3 phases (~2h) :
- Phase 1 : table + RLS + cron purge 30j
- Phase 2 : route serveur + hook useChatAI
- Phase 3 : cablage UI + bouton trash + UX polish
Tests live valides : auth, profile fetch, contexte multi-tour
(IA reconnait explicitement le contexte precedent), persistance
multi-device, DELETE persiste apres reload. Architecture
serveur-side scalable pour evolutions futures (multi-conv,
streaming, resumes contextuels).

### 2026-05-05

- 20:15 `d9d2fdc` feat scripts sync-exercise-media outil sync local→Supabase (match par slug + update par id)

FIN SESSION 5 mai 2026 — Bug exercise media sync resolu : fichiers
locaux sans accents ne matchaient pas DB avec accents (.eq strict).
Fix par slug match + update par id. Gainage Lateral OK en DB.
sync-exercise-media.js commit en outillage.

- 17:45 `6543ac3` feat mode reorganiser exos style Strong + fix input warning 8-12
- 17:30 `1097c34` refactor exo header en Hero Banner full-width
- 17:15 `fcb4f07` chore unwire OverloadBanner + OverloadModal de home
- 17:15 `30d9d2a` refactor set row Big Stack pour lisibilite gym
- 17:00 `c072521` docs add SESSION_LOG.md + session rules in CLAUDE.md
- 16:52 `d81bbac` fix overload hint closure async + gate erronee
- 16:25 `b576e78` feat hint overload progressif pendant chrono repos
- 16:08 `670407c` fix heuristique overload (faux positifs sets oublies)
- 15:53 `2a94e2e` fix nutrition calendrier dates futures clamp
- 15:45 `828daeb` docs Sprint 6.6 DONE — unification format meal plans
- 15:45 `9da16d2` docs TODO drop backup meal_plans_backup_20260505 dans 30j
- 15:31 `3129bac` fix nutrition-prefs capturer event 'done' du stream
- 12:10 `274f5d7` feat writer IA produit format canonique (Sprint 6.6 phase 2)
- 12:02 `32f9472` docs note tech debt import multi-date
- 11:52 `0c229ae` fix bloquer import quand user navigue hors du jour courant
- 11:46 `535f4d1` fix label generique pour clients invites (sans mention IA)
- 11:38 `aa0f22d` refactor nutrition-tab canonical migration (Sprint 6.6 phase 3b.3)
- 11:29 `bc2b4f7` refactor client-nutrition canonical meal plan (Sprint 6.6 phase 3b.2)
- 11:10 `2a2fa4a` refactor nutrition canonical meal plan (Sprint 6.6 phase 3b.1)
- 10:59 `822bad0` feat MealKey + helpers (Sprint 6.6 phase 3a)
- 10:54 `0813b2a` feat canonical format + tolerant parser (Sprint 6.6 phase 1)
- 10:41 `a28c34d` docs close 5b bottom nav responsive
- 10:38 `5850f81` fix coach-nav bump breakpoint 420px
- 10:19 `15a911d` fix coach-nav responsive bottom nav <380px
- 10:15 `97005eb` docs close 4B avatars/alignement
