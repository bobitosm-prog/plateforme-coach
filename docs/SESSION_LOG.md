# Session Log — MoovX

> Source de verite pour reprendre apres une fenetre fermee, un crash,
> un changement de session. **Toujours lu au demarrage. Toujours mis
> a jour apres chaque commit.**

---

## ETAT ACTUEL (mis a jour en continu)

**Date derniere mise a jour** : 2026-05-07 21:00
**Branche** : fix/training-weight-input-and-suggestion (a merger sur main)
**HEAD** : `d594e7d` fix(workout-session) handle FR comma weight + reps NaN guard
**Working tree** : clean

### Tache en cours
Aucune — fin de session

### Blockers
Aucun

### Prochaine tache prevue (PROCHAINE SESSION)
1. BUG 2 — Per-set weight suggestion (lib/training/suggest-set-weight.ts + wire dans TrainingExerciseCard) — 1-1h30
2. Merge fix/training-weight-input-and-suggestion sur main et push (si pas deja fait)
3. Test live integral des 2 fix BUG 1 sur Mac mode iPhone

### Backlog priorisee
1. ~~Sprint Securite~~ ✅ DONE
2. Sprint Layout Desktop — 3-4h
3. Sprint Images (54 img → next/image) — 3h
4. Sprint Refacto composants > 500 lignes — L
5. Sprint Qualite Code (console.log, eslint-disable, deps) — 2-3h
6. Sprint FK manquantes globalement — M
7. Sprint Accessibilite (~620 boutons sans aria-label) — M-L
8. Sprint typage strict (497 any) — XL
9. Sprint Native Capacitor — long terme 15-20h

---

## LOG CHRONOLOGIQUE (append-only, ne jamais effacer)

### 2026-05-07

- 20:54 `d594e7d` fix(workout-session) handle FR comma weight (weightRaw state) + reps NaN guard + digits-only sanitize
- 19:30 `6225d09` fix(training) accept FR comma in weight input + locale-aware display + ordered prev sets

FIN SESSION 7 mai 2026 — BUG 1 (FR comma) corrige sur les 2 parcours :
- TrainingExerciseCard : input type=text + regex FR + onBlur reformat FR + displays toLocaleString
- WorkoutSession : refacto state weightRaw (string) decouple de weight (number), commitWeight inline dans doValidate, reps NaN guard + sanitize digits
- 5 inputs kg audites au total (TrainingExerciseCard, WorkoutSession, TechniquePopup, ProgressTab x2 — derniers 3 en type=number proteges naturellement)
- Test live valide : zero erreur React, persistance DB OK, edge cases (NaN, vide, virgule volontaire) handled
BUG 2 (per-set suggestion) reporte a prochaine session — estime 1-1h30.

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
