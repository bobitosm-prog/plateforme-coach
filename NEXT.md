# Prochaines tâches

> Réécrit à chaque fin de session. Les 3-5 tâches concrètes à attaquer.

## Cap immédiat : Horizon 1 — Launch beta Genève (Phase A : BLINDER)

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

### Chantier #2 — Prérequis launch
- [ ] Mécanisme beta gratuit 2 mois — décider code promo Stripe 60j vs flag
      DB beta_tester (modèle lifetime existant). Implémenter + tester E2E.
- [ ] Parcours signup → onboarding → 1ère séance E2E par un tiers (pas Marco).
- [ ] Observabilité — fiabiliser app_logs (insert fire-and-forget ne loggue
      pas), surveillance erreurs temps réel pendant la beta.

### Chantier #3 — Admin beta
- [ ] UI admin : finaliser pages existantes (users, revenue, logs).

## Après Phase A → Phase B (acquisition)
Visuels SEEDANCE + prompts pub Insta/TikTok. PAS avant que Phase A soit cochée.

## Dettes consignées (non bloquantes)
- Bloc D : created_at vs date (streak/badges), await sans check
- exercise_id FK manquant
- Comparaison sub par endpoint seul (pas clés p256dh/auth) — angle mort résiduel mineur
- Jobid 4/5 UTC fixe sans double-job DST (drift +/-1h, acceptable)
