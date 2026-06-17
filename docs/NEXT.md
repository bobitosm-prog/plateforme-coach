# Prochaine session

> Réécrit à chaque fin de session. Les 3-5 tâches concrètes à attaquer.

## Cap immédiat : Horizon 1 — Launch beta Genève
Phase A (BLINDER avant la pub). Voir ROADMAP.md.

## Phase A — avancement
- [x] Vercel Pro ✅ 14 juin
- [x] Mécanisme beta gratuit (briques 1-4) ✅ 14 juin
- [x] Cron streak refondu, validé device ✅ 15 juin
- [x] Faille RLS profiles P0 ✅ 17 juin (trigger guard + cleanup doublon policy)
- [x] Re-sync push sub au boot (#1c) ✅ 17 juin (validé device 3/3)
- [x] Offre dynamique 60j ✅ 17 juin (landing Hero badge+CTA+trust, pricing,
      register-client via lib/beta-offer.ts + trialDays prop)
- [x] Trial standard 10j → 14j ✅ 17 juin (code + i18n alignés)
- [x] Wording onboarding qualitatif ✅ 17 juin (trialBadge + subtitle sans nombre)
- [ ] Brique 5 UI admin campagnes (#3)
- [ ] Feature "jours restants" dans l'app (voir ci-dessous)
- [ ] Signup → onboarding → 1ère séance E2E par un tiers
- [ ] Observabilité minimale

## Prochaines tâches

### Chantier #1 — Notifications robustes
- [x] (a) Cron streak : logique métier refaite. Validé device 15/06.
- [x] (c) Re-sync push subscription au boot. Validé device 17/06.
- [ ] (b) Déplacer réglages notifs ProfileTab → page Préférences dédiée.
      **REPORTÉ post-launch** : refacto fragile (ProfileTab monolithique,
      risque F1b), à faire à froid avec design doc.

### Chantier #2 — Offre trial / beta cohérente
- [x] Trial 10j → 14j (code + contenu) ✅
- [x] Système offre dynamique 60j (lib/beta-offer.ts, Hero badge, CTA
      landing/pricing/register-client) ✅
- [x] Wording qualitatif onboarding (trialBadge + subtitle) ✅
- [ ] **Feature compte à rebours "jours restants" dans l'app** (AccountTab
      ou HomeTab). L'user beta/trial doit voir sa durée restante
      (trial_ends_at / subscription_end_date). useClientDashboard expose
      déjà trialDaysLeft ; manque l'équivalent beta + l'affichage UI.
      Phase A souhaitable pour campagne honnête.

### #3 — Brique 5 — UI admin campagnes beta
Créer/activer/voir compteur. Réutiliser patterns admin (SubscriptionDialog).

### Prérequis launch (Chantier #4)
- [ ] Parcours signup → onboarding → 1ère séance E2E par un tiers (pas Marco).
- [ ] Observabilité — fiabiliser app_logs, surveillance erreurs temps réel.

## Après Phase A → Phase B (acquisition)
Visuels SEEDANCE + prompts pub Insta/TikTok. PAS avant que Phase A soit cochée.

## Dettes consignées (non bloquantes)
- Bloc D : created_at vs date (streak/badges), await sans check
- exercise_id FK manquant
- Comparaison sub par endpoint seul (pas clés p256dh/auth) — angle mort résiduel mineur
- Jobid 4/5 UTC fixe sans double-job DST (drift ±1h, acceptable)

## Notes test
- f.marco (UUID 00a8a3a6) : sub saine après test re-sync 17/06.
- Bypass force=true reste en prod (protégé par auth Bearer).
- Campagne beta is_active=false. Activation = 1 UPDATE DB, zéro déploiement.
