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
Puis propager SectionTitle/ModalHeader a Nutrition, Progress, Account.

### 🔴 Sprint dédié — Centraliser les z-index
Chaos : ~150 occurrences sur ~60 fichiers, valeurs 1→99999 sans logique. Bug récurrent (modals sous
la nav corrigé en patch ciblé 22/06 mais cause non traitée). Définir échelle dans design-tokens
(Z_NAV/Z_OVERLAY/Z_MODAL/Z_TOAST). Migration PAR ZONES (modals → WorkoutSession → NutritionTab →
reste), 1 commit testable/zone, branche dédiée. NE PAS faire d'un bloc.

### ⚠️ Valider seuils RIR avec un coach
RIR_SAFETY_MAX, RIR_ACCEL_MIN, deload -10% dans lib/training/compute-progression.ts. Justesse
méthodologique = expertise coach, pas dev. AVANT d'ouvrir la feature RIR aux vrais users.

### Petits
- Nettoyer toast.error technique insert cardio (message i18n propre, pas brut Supabase).
- Vérifier visuellement fallback "renseigne ton poids" (testé par logique seulement).
- Puis : NUTRITION (gros chantier suivant).

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
