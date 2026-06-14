# MoovX — Tickets Backlog

> Source de verite pour les tickets techniques et features a planifier.
> Mis a jour : 2026-05-10 (post-refonte Home + Training + Nav).

---

## P1 — Priorite haute

### Sprint Recovery Modal V2
- **Effort** : M (1h30-2h)
- Overlay SVG zones musculaires precises sur images body-front.webp + body-back.webp
- Mapping coordonnees via Photopea ou iteratif (6-10 zones polygones)
- Couleurs dynamiques selon muscleStatus, animation staggered
- Remplace MuscleHeatMap SVG dans RecoveryModal pour coherence visuelle premium
- Pre-requis : images deja en place dans public/images/recovery/

### Sprint Refonte modele exercices (exercise_id FK)
- **Effort** : M (3-4h)
- Ajouter exercise_id UUID NULL a workout_sets (FK vers exercises_db.id)
- Au save : stocker exercise_id si l'exo vient de exercises_db
- Au fetch (preview + seance) : prioriser match par exercise_id, fallback match par nom (legacy data)
- Migration backfill : matcher donnees existantes par best-effort ILIKE patterns
- Resout bug Seance Libre ou custom_programs stocke 'Squat barre (back squat)' mais exercises_db.name = 'Squat Barre'
- Decision archi : custom_programs garde le nom customise dans son JSONB pour l'UX coach, mais reference aussi exercise_id pour le tracking robuste

### Sprint Programme Builder validation
- **Effort** : S (30min-1h)
- total_weeks doit etre champ requis a la creation d'un programme periodise
- Sinon advanceWeek() guard (if !total_weeks return) bloque l'incrementation
- Decouvert lors T1 quand le programme PPL Hypertrophie avait total_weeks NULL en DB
- Fix : validation frontend + migration DEFAULT pour les programmes existants sans total_weeks

---

## P2 — Priorite moyenne

### Sprint AccountTab V2
- **Effort** : M (2-3h)
- Sections Objectifs + Preferences fonctionnelles (placeholders alert en V1)
- Objectifs : poids cible, objectif (bulk/cut/maintain), calorie goal editable
- Preferences : notifications, son timer, langue, theme
- Reuse pattern menu liste Apple-style existant

### Sprint Tracking macros consommes
- **Effort** : M (3-4h)
- Enrichir daily_food_logs avec colonnes protein_consumed/carbs_consumed/fat_consumed
- Ou creer table daily_macro_logs separee
- Wire dans NutritionCard (Home) pour afficher consomme vs objectif
- Actuellement NutritionCard n'affiche que les cibles (pas de tracking consomme)

### Sprint Layout Desktop Clients/Suivi
- **Effort** : M-L (3-5h)
- Continuer le pattern 2-col desktop des CoachMessages (Sprint Layout 9 mai)
- Pages coach : Mes Clients, Suivi, Programmes
- Breakpoint 1024px (coherent avec useIsMobile existant)

### Sprint Refonte page Mes Clients coach
- **Effort** : M (3-4h)
- Table actuelle moche : headers colles, pas de hierarchie, hover absent, avatars incoherents
- Coherence avec design system v2 (surface2, Anton/Bebas, palette doree)
- Cards client avec avatar, nom, derniere activite, badge unread

---

## P3 — Priorite basse

### Sprint Images optimization
- **Effort** : M (3h)
- 54 img natifs → next/image
- Lazy loading + responsive sizes + format webp automatique
- LCP ameliore de +1-3s mobile

### Sprint Refacto composants > 500 lignes
- **Effort** : L (6-8h)
- TrainingTab.tsx 1732 lignes (post-cleanup T4.2b-iii)
- Decouper en sub-composants : SessionDetailModalContent, TrainingHeader, TrainingCalendar
- ProgramBuilder 1297 lignes, WorkoutSession 1230 lignes, NutritionTab 1205 lignes, ProgressTab 1101 lignes

### Sprint Qualite Code
- **Effort** : M (2-3h)
- 14 console.log dans 5 fichiers prod (WakeLock, ExerciseInfo, invite-client, send-notification)
- 13 eslint-disable dont 2 react-hooks/exhaustive-deps masquent vrais bugs
- 2 fails design-tokens test pre-existants (corriges en S0.1)
- Audit deps useEffect/useMemo stale

### Sprint FK manquantes globalement
- **Effort** : M (2-3h)
- Audit complet des FK manquantes dans le schema Supabase
- exercise_id sur workout_sets (couvert en P1 ci-dessus)
- Probablement d'autres tables avec relations implicites par nom au lieu de FK

### Sprint Accessibilite
- **Effort** : M-L (4-6h)
- ~620 boutons sans aria-label (~97% des boutons de l'app)
- Audit complet + ajout systematique
- Focus management sur les modals
- Screen reader support basique

### Sprint typage strict
- **Effort** : XL (10-15h)
- 497 occurrences ': any' dans 86 fichiers
- Migration progressive vers typage explicite
- Priorite : hooks d'abord (useClientDashboard, useCoachDashboard), puis composants

### Sprint Native Capacitor
- **Effort** : XL (15-20h, long terme)
- Wrapper Capacitor pour iOS/Android
- Notifications push natives (remplace web push)
- Biometric auth (Face ID / Touch ID)
- Offline-first avec sync Supabase
- App Store / Play Store submission

---

## Archive (tickets resolus)

- [x] Sprint Securite (7 mai 2026) — 4 fallbacks SERVICE_ROLE, 3 routes Stripe auth-gated
- [x] Sprint Layout Desktop Messages (9 mai 2026) — 2-col desktop coach messages
- [x] Sprint Realtime Messages (9 mai 2026) — polling 3s → Realtime + fallback 120s
- [x] Sprint Refonte Progression (9 mai 2026) — compute-progression lib + 33 tests
- [x] BUG FR comma weight input (7 mai 2026) — TrainingExerciseCard + WorkoutSession
- [x] BUG Seance Libre historique (9 mai 2026) — fix partiel dep [raw] → [exoNamesKey]
- [x] Sprint Refonte Home Client (10 mai 2026) — 6 commits S0-S3
- [x] Sprint Refonte Nav (10 mai 2026) — NAV.1-NAV.3, Header supprime
- [x] Sprint Refonte Training Tab (10 mai 2026) — T1-T4.2b-iii, 9 commits
