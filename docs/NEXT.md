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
- [x] Feature "jours restants" (carte beta dans Compte, trial via bandeau existant) ✅ 28 juin
- [x] Hydratation Nutrition (double anneau kcal+eau, boutons +250/+500) ✅ 28 juin
- [x] Cohérence Nutrition finalisée (header or + calendrier glass aligné Training) ✅ 28 juin
- [x] Analytics : bug Records corrigé + cohérence complète (header, 7 SectionTitle, records appariés) ✅ 28 juin
- [x] HOTFIX onboarding solo bloqué (trigger vs trial_ends_at → RPC set_initial_trial) ✅ 29 juin
- [x] AUDIT sécurité colonnes protégées + déblocage inscription coach (handle_new_user role depuis metadata) ✅ 30 juin
- [x] Analytics #3 — Progression par exercice (courbe e1RM Epley, dropdown trié par fréquence, depuis wSessions sans re-fetch, i18n fr/en/de) ✅ 30 juin
- [x] Chantier fragmentation noms d'exercices COMPLET A→C (7 commits, analytics #1+#4 débloquées) ✅ 02/07
- [ ] Signup → onboarding → 1ère séance E2E par un tiers
- [ ] Observabilité minimale

## Prochaines tâches

### ✅ FAIT (28/06) — Feature "jours restants"
Hook expose isInBeta + betaDaysLeft (symétrique trialDaysLeft). Carte dans AccountTab
affichée pour les BETA uniquement (« ACCÈS BETA · N jours restants », i18n FR/EN/DE avec
ICU plural). Le TRIAL garde son bandeau global existant (page.tsx L592, avec urgence ≤3j
+ CTA S'abonner) — pas de doublon. 4 commits (hook, i18n, carte, props). Testé device beta+trial.

### ✅ FAIT (28/06) — Bug Records Personnels + refonte
Cause : ProgressTab lisait pr.exercise/pr.date/pr.weight (ancien schéma) au lieu de
exercise_name/achieved_at/value + key non unique. Corrigé + i18n getExerciseName + key pr.id.
Puis refonte : appariement par exercice (max_weight + 1rm), liste aérée Trophy, filtre 10/50/100.
Doublon « MES RECORDS » d'AnalyticsSection supprimé.

## 🔍 AUDIT ANALYTICS (28/06) — roadmap data athlète

Constat : Analytics est riche en POIDS + NUTRITION mais PAUVRE côté ENTRAÎNEMENT (seul le
volume hebdo agrégé). Grosses données dormantes en base. Audit complet ci-dessous.

### Données disponibles non exploitées
- workout_sets : weight, reps, completed, **rir** (intensité!), exercise_name, created_at, session_id
- cardio_sessions : type, duration_min, calories_burned, exercises (jsonb), completed_at — **0% affiché**
- exercises_db : **muscle_group** + secondary_muscles (pivot volume/muscle)
- workout_sessions / completed_sessions : séances détaillées (durée, date) — count seulement
- daily_checkins / daily_habits : récup, habitudes — partiel/jamais
- user_xp / achievements / badges : gamification — jamais dans Analytics
- NB : exercise_feedback = revue vidéo coach (PAS du RIR).

### Opportunités priorisées (impact × effort × faisabilité)
| # | Ajout | Données | Effort | Impact | Faisable |
|---|---|---|---|---|---|
| 1 | Volume par groupe musculaire | workout_sets × exercises_db.muscle_group | Moyen | ⭐⭐⭐ | ✅ |
| 2 | Cardio (temps/calories/séances) | cardio_sessions | Faible | ⭐⭐ | ✅ |
| 3 | Progression charge par exercice (courbe) | workout_sets weight/reps/date | Moyen | ⭐⭐⭐ | ✅ |
| 4 | Tendance RIR (intensité/effort) | workout_sets.rir | Faible-Moyen | ⭐⭐⭐ diff. | ✅ |
| 5 | Fréquence/régularité (heatmap) | workout_sessions | Moyen | ⭐⭐ | ✅ |
| 6 | Rationaliser doublon poids (section+graphique) | — | Faible | ⭐ | ✅ |

### Reco d'ordre
#2 Cardio (quick win, comble vide total) → #1 Volume/muscle (métrique muscu #1, Strong/Hevy) →
#4 RIR (différenciateur, peu d'apps le montrent, moteur déjà construit) → #3 progression/exo →
#5 heatmap → #6 doublon poids (au passage).

### Points de vigilance
- Pivot workout_sets.exercise_name (texte) → exercises_db.muscle_group : matcher par nom via
  lib/exercise-matching.ts (slug). Exercices non matchés / custom → bucket "autre".
- Volume actuel limité 4 sem / 500 sets : analyses longues (progression 6 mois) = requêtes dédiées.

### ✅ DÉBLOQUÉ (02/07) — Analytics #1 Volume/muscle et #4 RIR/muscle
Le blocage (jointure texte 29-48%) est levé : workout_sets.exercise_id (FK) →
exercises_db.muscle_group couvre 80% des sets (1657/2070). Les 413 null = 7 noms
exclus en review + 50 synonymes unresolved (exercise_name intact, étape A les sert
en lecture). #1 et #4 sont désormais implémentables en session normale.

### ✅ FAIT (02/07) — Fragmentation noms d'exercices : chantier COMPLET A→C
A (8d8dfdb) lecture normalisée · B0 (f0bfe3a) dédup catalogue 176 · B1a (8b31971)
colonne FK exercise_id · B1b (10665d2) génération contrainte au catalogue, 27/27
résolus · B1c (0334adf) propagation programme→sets · C (3dcddb9) backfill 1633/2046.
La source ne fragmente plus. Détail complet : SESSION_LOG 02/07.
RESTE (non bloquant) : mapping manuel des 50 unresolved si volume le justifie un jour.

### ⏳ Conception RIR (désormais ouvrable)
computeProgression fait progresser quand allReachedTarget ; RIR ne fait que MODULER.
Marco attendait que le RIR seul déclenche. Écart modèle mental vs code.
Étape A faite (historique fiable) → discussion RIR désormais ouvrable. Bon sujet
d'ouverture prochaine session (conception pure, puis petit batch compute-progression.ts).
Ne pas oublier la dette liée : seuils RIR_SAFETY_MAX/ACCEL_MIN à valider par un coach.

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

### Règle critique (29/06) — colonnes profiles protégées
Le trigger guard_profile_sensitive_columns rejette tout UPDATE client (authenticated) sur :
trial_ends_at, subscription_type, subscription_status, subscription_end_date, subscription_price,
role, status. → Ces colonnes ne se posent QUE via RPC SECURITY DEFINER (ex. set_initial_trial,
claim_beta_slot). Ne JAMAIS les mettre dans un updateProfile côté client.
TODO : auditer le code pour vérifier qu'aucun autre endroit ne tombe dans ce piège.
MISE À JOUR 30/06 : audit complet effectué. Seul bug actif trouvé = inscription coach (corrigé).
Le role est désormais posé par handle_new_user depuis raw_user_meta_data (CASE client/coach, jamais
admin). Les set_role côté client (callback, useClientDashboard) sont des filets désormais inertes
(role jamais null). Note : profiles.role garde un DEFAULT 'client' (filet). TODO mineur : nettoyer
les set_role inertes ; valider une inscription CLIENT (non refaite après le nettoyage).

### Dettes mineures (28/06)
- Doublon affichage poids : section poids ProgressTab + graphique poids AnalyticsSection (rationaliser).
- Commentaire orphelin AnalyticsSection (~L140 « PR records grouped ») après suppression prRecords.
- Hydratation : pulsation nutWaterPulse iPhone à confirmer ; désactivation boutons jour passé à confirmer device.
- Filtre records 50/100 à valider device (testé visuellement à 10).
- Navigation pendant render : warning React "Cannot update a component (Router) while rendering
  CoachApp" (app/page.tsx) + "Navigated to /login" → un router.push (probablement garde d'auth)
  est appelé hors useEffect pendant le render. Sans rapport avec Analytics (constaté pendant #3).
  À corriger : déplacer le push dans un useEffect. Passe dédiée.

### Historique
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

## 💡 IDÉE — Système de parrainage (à concevoir)

### Règle produit (validée 29/06)
- Parrain ET filleul gagnent chacun 1 mois offert.
- Crédité QUAND le filleul PAIE (devient client payant) — pas à l'inscription (anti-abus).
- "Filleul actif" = a payé (suffit). Vérifier qu'il est bien client payant avant de créditer.

### Point technique CLÉ (sensible — argent réel)
- Les 2 bénéficiaires ont payé → ont un abonnement Stripe actif. "1 mois offert" = vraie
  mensualité → DOIT passer par Stripe (coupon / crédit / skip facture), PAS juste un champ DB.
  Prolonger trial_ends_at ne sert à rien pour un abonné payant actif (Stripe le facture quand même).
- Découpler : tracking DB (simple, traçable) ↔ application du crédit Stripe (sensible, à faire avec soin).

### Modèle de données pressenti (à valider)
- Table referral_codes (ou champ profiles.referral_code) : code unique par parrain.
- Table referrals : parrain_id, filleul_id, statut (pending/validated), created_at, validated_at.
- Crédit appliqué via RPC SECURITY DEFINER (cohérent avec set_initial_trial/claim_beta_slot).

### Flux pressenti
1. Parrain partage son code/lien. 2. Filleul s'inscrit avec le code (stocké en pending).
3. Filleul paie → webhook Stripe "premier paiement" → valide le parrainage → crédite 1 mois aux 2
   (via Stripe). 4. Anti-abus : 1 validation par filleul, filleul = vrai payant.

### À trancher en session dédiée
- Mécanisme Stripe exact (coupon 100% 1 mois ? crédit balance ? skip prochaine facture ?).
- Limite de parrainages par parrain (illimité vs plafond).
- UI : où le parrain voit son code + ses parrainages (Compte ? section dédiée ?).
- Cas limites : filleul qui annule après crédit, parrain qui se parraine lui-même, etc.

NE PAS coder à l'arrache : feature argent réel, session dédiée.

## 💡 IDÉE — Abonnement coach payant (à concevoir)

### Règle produit (validée 30/06)
- Coach s'inscrit → essaie (essai gratuit limité) → paie un abonnement mensuel récurrent.
- Réutilise le système d'abonnement client (trial / subscription_type / Stripe).
- Prérequis : inscription coach fonctionnelle ✅ (débloquée le 30/06).

### Existant
- Stripe Connect EXISTE (api/stripe/connect, stripe_account_id) : le coach REÇOIT les paiements de
  SES clients (commission 3%). C'est le coach = VENDEUR.
- Abonnement coach SaaS (coach = ACHETEUR de MoovX) N'EXISTE PAS → à construire.

### À concevoir (session dédiée — argent réel, Stripe)
- Checkout/subscription Stripe où le coach est l'acheteur (distinct de Connect).
- Quel prix, mensuel/annuel, durée d'essai coach.
- Gating : coach en essai vs payant (accès dashboard coach), quand couper l'accès si non payé.
- subscription_type pour un coach (réutiliser trial/payant ? un type dédié ?).
- Webhook Stripe pour activer/désactiver l'abonnement coach.

NE PAS coder à l'arrache : feature argent réel, session dédiée (comme le parrainage).

## Notes test
- f.marco (UUID 00a8a3a6) : sub saine après test re-sync 17/06.
- Bypass force=true reste en prod (protégé par auth Bearer).
- Campagne beta : activation via /admin/campaigns (toggle UI) ou UPDATE DB direct.
