# Prochaine session

> Réécrit à chaque fin de session. Les 3-5 tâches concrètes à attaquer.

## Cap immédiat : Horizon 1 — Launch beta Genève
Voir ROADMAP.md. On est en Phase A (BLINDER avant la pub).

## Prochaines tâches (Phase A)
1. **Mécanisme beta gratuit 2 mois** — décider code promo Stripe 60j vs flag DB
   `beta_tester` (modèle `lifetime` existant). Implémenter + tester E2E
   (vérifier qu'un beta ne tombe pas sur le paywall avant 60j).
2. **Vercel Pro** — upgrade (légal + maxDuration 300s). Vérifier que les crons
   pg_cron et générations IA passent toujours après upgrade.
3. **Parcours signup→onboarding→1ère séance E2E par un tiers** — faire tester
   par quelqu'un qui n'est pas Marco, sur un compte neuf, de bout en bout.
4. **Observabilité** — fiabiliser app_logs (insert fire-and-forget ne loggue
   pas), voir comment surveiller les erreurs en temps réel pendant la beta.

## Impératif du jour (14 juin)
- [ ] 18h00 (16h UTC) : cron streak réel sur marko (atRisk vrai). NE PAS faire
      de séance marko avant 18h. Contrôles : notif device + last_streak_reminder_at
      + cron.job_run_details.
- [ ] Anti-régression fantôme : déjà validée ce matin (accents apparus sans
      réinstall PWA). SW push-only ne cache rien. OK.

## Après Phase A → Phase B (acquisition)
Visuels SEEDANCE + prompts pub Insta/TikTok (Claude aide). PAS avant que
Phase A soit cochée.
