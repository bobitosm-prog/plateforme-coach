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
- [ ] Brique 5 UI admin campagnes (#3)
- [ ] Fix UX onboarding "10 jours" trompeur (#4)
- [ ] Signup → onboarding → 1ère séance E2E par un tiers
- [ ] Observabilité minimale

## Prochaines tâches

### Chantier #1 — Notifications robustes
- [x] (a) Cron streak : logique métier refaite (rappel séance prévue non faite,
      bypass force=true, garde horaire Zurich). Validé device 15/06.
- [x] (c) Re-sync push subscription au boot : helper lib/push-resync.ts,
      useEffect différé 1,5s dans CoachApp. 3 gardes (permission granted /
      row existante / SW ready timeout 4s). Comparaison endpoint DB vs
      navigateur. Validé device 17/06 (3/3 tests).
- [ ] (b) Déplacer réglages notifs ProfileTab → page Préférences dédiée.
      **REPORTÉ post-launch** : refacto fragile (ProfileTab monolithique,
      risque F1b), à faire à froid avec design doc. Décision senior : pas
      juste avant launch.

### #3 — Brique 5 — UI admin campagnes beta
Créer/activer/voir compteur. Réutiliser patterns admin (SubscriptionDialog).

### #4 — Fix UX onboarding "10 jours" trompeur (beta a 60j)
Adapter le texte selon résultat claim_beta_slot.

### Prérequis launch (Chantier #2)
- [ ] Parcours signup → onboarding → 1ère séance E2E par un tiers (pas Marco).
- [ ] Observabilité — fiabiliser app_logs (insert fire-and-forget ne loggue
      pas), surveillance erreurs temps réel pendant la beta.

## Après Phase A → Phase B (acquisition)
Visuels SEEDANCE + prompts pub Insta/TikTok. PAS avant que Phase A soit cochée.

## Backlog (ROADMAP)
#18 nutrition = RÉSOLU. P1 : Bloc D (created_at vs date, await sans check error),
exercise_id FK, validation total_weeks.

## Dettes consignées (non bloquantes)
- Bloc D : created_at vs date (streak/badges), await sans check
- exercise_id FK manquant
- Comparaison sub par endpoint seul (pas clés p256dh/auth) — angle mort résiduel mineur
- Jobid 4/5 UTC fixe sans double-job DST (drift ±1h, acceptable)

## Notes test
- f.marco (UUID 00a8a3a6) : sub saine après test re-sync 17/06. last_streak_reminder_at
  posé par curl force 17/06 (remettre null pour re-tester le cron aujourd'hui).
- Bypass force=true reste en prod (protégé par auth Bearer).
