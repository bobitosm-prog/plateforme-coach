# Prochaine session

> Réécrit à chaque fin de session. Les 3-5 tâches concrètes à attaquer.

## Cap immédiat : Horizon 1 — Launch beta Genève
Phase A (BLINDER avant la pub). Voir ROADMAP.md.

## Phase A — avancement
- [x] Vercel Pro ✅ 14 juin
- [x] Mécanisme beta gratuit (briques 1-4) ✅ 14 juin
- [x] Cron streak refondu, validé device ✅ 15 juin
- [x] Faille RLS profiles P0 ✅ 17 juin
- [x] Re-sync push sub au boot (#1c) ✅ 17 juin
- [x] Offre dynamique 60j ✅ 17 juin
- [x] Trial standard 10j → 14j ✅ 17 juin
- [x] Wording onboarding qualitatif ✅ 17 juin
- [x] Admin campagnes beta (#3 Brique 5) ✅ 17 juin
- [x] Fix P0 overlays rail (portails createPortal) ✅ 18 juin
- [x] Fiabilisation donnees Home (streak/Recovery/heure hero/cache) ✅ 21 juin
- [x] Refonte coherence Home (SectionTitle, closer, assiduite) ✅ 21 juin
- [x] Bloc cardio complet (i18n, poids réel, bugs Stop/cookie/zIndex) ✅ 22 juin
- [x] Home refresh au retour d'onglet (homeRefreshKey) ✅ 25 juin
- [x] Streak respecte le planning (def B, moteur + client + coach) ✅ 26 juin
- [x] Z-index sprint partiel (échelle + 5 zones, 2 bugs nav réparés) ✅ 27 juin
- [x] Sprint B streak serveur (cron + badges def B, 3 systèmes alignés) ✅ 27 juin
- [x] Refonte Nutrition Direction B (10 sous-chantiers, FoodSearch/images/Athena) ✅ 27 juin
- [ ] **Feature "jours restants" dans l'app** (PRIORITAIRE)
- [ ] Signup → onboarding → 1ère séance E2E par un tiers
- [ ] Observabilité minimale

## Prochaines tâches

### PRIORITAIRE — Feature compte à rebours "jours restants"
L'user beta/trial doit voir sa durée restante dans l'app (AccountTab ou
HomeTab). useClientDashboard expose déjà trialDaysLeft ; manque
l'équivalent beta (subscription_end_date) + l'affichage UI.
Phase A souhaitable pour campagne honnête.

### Bug — Records Personnels : noms d'exercices vides
Analytics → Records Personnels : 50 PR listés avec poids mais colonne nom
vide. Probable : exercise_id non résolu par getExerciseName / i18n, ou
champ name vide en DB. À diagnostiquer.

### Chantier #1 — Notifications robustes
- [x] (a) Cron streak. Validé device 15/06.
- [x] (c) Re-sync push au boot. Validé device 17/06.
- [ ] (b) Déplacer réglages notifs ProfileTab → Préférences.
      **REPORTÉ post-launch** (refacto fragile, risque F1b).

### EN COURS — Coherence visuelle design system
Training : FAIT titres (SectionTitle) + modals (ModalHeader) + recap seance (WorkoutDetailList).
RESTE Training :
- Brancher WorkoutDetailList dans l'ecran "Bravo" (TrainingSessionDone) pour recap seance
  du jour sous le message de felicitation (composant pret, charger workout_sets).
- Titre hero SessionDetailModal en dore (actuellement blanc).
- CARDIO (CardioSection) : header carte accordeon a aligner sur SectionTitle.
- Records battus (PR) dans l'ecran de fin de seance (checkForPR existe).
NUTRITION : FAIT 27/06 (cards cardStyle, 3 modals ModalHeader, popups + titres Direction B,
SectionTitle meals/prefs, padding anti-FAB, ShoppingList portalisé, boutons allégés). RESTE :
titre + sous-titre (nom du plan actif, pattern Training) NON fait.
Puis propager SectionTitle/ModalHeader a Progress, Account.

### ✅ FAIT (27/06) — Z-INDEX sprint partiel
Échelle Z_FAB/NAV/OVERLAY/MODAL/TOAST dans design-tokens. 5 zones migrées, 2 bugs
"modal sous la nav" réparés (library detail + meal-edit). Reste (faible enjeu) :
TrainingTab, coach, auth/onboarding, BadgeCelebration. Famille A (locaux) jamais migrée.
Voir SESSION_LOG 27/06.

### ✅ FAIT (26/06) — Streak respecte le planning (def B)
Livré en prod : moteur lib/streak.ts (restLocalDates optionnel) + projection client
(useClientDashboard, source custom_programs via getSessionForDay) + coach migré (D3).
Prouvé runtime (7 vs 2). D1 révisée : source UNIQUE = programme actif, scheduled_sessions
abandonné (n'était pas dans le flux streak ; session_type réel='repos' pas 'rest').
5 commits, voir SESSION_LOG 26/06.

### ✅ FAIT (27/06) — Sprint B STREAK serveur (cron + badges, def B)
cron (dcaa2aa) : helper zurichDayIndexFor + projection repos 60j + computeStreak(restDates).
badges (07d1265) : lib/project-rest-days.ts + check-badges case streak_days aligné def B.
DRY (d919546) : useClientDashboard utilise projectRestDates. 3 systèmes alignés (cron Zurich,
client/badges navigateur — divergence légitime). Validé 8/3. Voir SESSION_LOG 27/06.

### ⚠️ Valider seuils RIR avec un coach
RIR_SAFETY_MAX, RIR_ACCEL_MIN, deload -10% dans lib/training/compute-progression.ts. Justesse
méthodologique = expertise coach, pas dev. AVANT d'ouvrir la feature RIR aux vrais users.

### Petits
- Nettoyer toast.error technique insert cardio (message i18n propre, pas brut Supabase).
- Vérifier visuellement fallback "renseigne ton poids" (testé par logique seulement).
- Nutrition Direction B : FAIT 27/06 (reste : titre + sous-titre plan actif).

### ✅ FAIT (27/06) — FoodSearch portalisé + fix clavier
444b7dc : portalisé via RailOverlay (ne passe plus sous la nav). b9a8afc : ancré en haut
(top safe-area + translateX + maxHeight 100dvh) → le clavier iOS ne masque plus le champ.
Validé iPhone. RESTE : vue détail FoodSearch (L132) à vérifier (centrée, sans maxHeight,
même souci clavier probable).

### 🟡 Dette — stack interne WorkoutSession + TempoExecutor
z-index internes anarchiques (50/51/200/250/300/9999/10000 + TempoExecutor 3×9999), ordre
fonctionnel OK. Monde plein écran, nav masquée, aucun conflit global. Rationaliser en
mini-échelle locale, sprint dédié. NE PAS oublier TempoExecutor. Valider device séance
complète (Web Audio, draft, rest timer, tempo).

### ✅ FAIT (27/06) — Images exercice cadrées 9/16
Les images sont en 9/16 PORTRAIT (pas 16/9 comme supposé). Fix : conteneur aspectRatio 9/16
+ maxHeight 55vh + objectFit cover sur 3 modals (d915c72, 7a2aad8). Miniatures 48x48 intactes.

### ✅ FAIT (27/06) — Athena FAB global
83458a3 : monogramme "A" + sparkle, bottom 136px (au-dessus bug report 80px), ouvre coachIA.
Condition !workoutSession && activeTab !== 'coachIA'. Z_FAB.

### 🔴 Dette archi — doublon FoodSearch / modal 'food' (page.tsx)
Le modal h.modal==='food' (page.tsx L464+) N'EST PAS mort : système complet d'ajout d'aliment
sur hook useFoodLog (foodSearch, addFoodToMeal, addCustomFood), réexporté via useClientDashboard
(8 réexports). DOUBLON avec FoodSearch (le moderne). custom_food ferme vers 'food'. Pas de point
d'entrée direct UI. → Désentrelacement risqué, sprint dédié. NE PAS supprimer sans cartographier.

### Prérequis launch
- [ ] Parcours signup → onboarding → 1ère séance E2E par un tiers (pas Marco).
- [ ] Observabilité — fiabiliser app_logs, surveillance erreurs temps réel.

## Après Phase A → Phase B (acquisition)
Visuels SEEDANCE + prompts pub Insta/TikTok. PAS avant que Phase A soit cochée.

## Dettes consignées (non bloquantes)
- Bloc D : created_at vs date (streak/badges), await sans check
- exercise_id FK manquant
- Comparaison sub par endpoint seul (pas clés p256dh/auth) — angle mort résiduel mineur
- Jobid 4/5 UTC fixe sans double-job DST (drift ±1h, acceptable)
- 2 PATCH activation simultanés → 23505 possible (inoffensif, 1 admin)
- Filtrage journee HomeTab (~L187 setHours fuseau navigateur, pas Zurich)
- AbsCalculator a recabler design-system
- weekly_diagnostic obsolete marko.rosa en base

## Règles dev permanentes
- **Overlays dans le rail** : tout position:fixed rendu dans une slide du rail
  DOIT être portalisé (<RailOverlay> ou createPortal interne). Le transform du
  rail casse le containing block. Ref : RailOverlay.tsx, SessionDetailModal.tsx.
- **Cache hit hook** : tout state du Promise.all de useClientDashboard DOIT être
  replique dans cache.get ET cache.set (sinon casse au 2e chargement, TTL 5min).
- **Timezone created_at** : colonnes timestamp WITHOUT time zone = UTC sans Z,
  convertir via formatZurichTime/formatZurichDate (lib/format-time.ts).

## Notes test
- f.marco (UUID 00a8a3a6) : sub saine après test re-sync 17/06.
- Bypass force=true reste en prod (protégé par auth Bearer).
- Campagne beta : activation via /admin/campaigns (toggle UI) ou UPDATE DB direct.
