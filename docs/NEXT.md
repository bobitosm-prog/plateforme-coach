# Prochaine session

> Réécrit à chaque fin de session. Les 3-5 tâches concrètes à attaquer.

## Cap immédiat : Horizon 1 — Launch beta Genève
Phase A (BLINDER avant la pub). Voir ROADMAP.md.

## Phase A — avancement
- [x] Vercel Pro ✅ 14 juin
- [x] Mécanisme beta gratuit (briques 1-4) ✅ 14 juin
- [x] Cron streak refondu, validé device ✅ 15 juin
- [ ] Notifications robustes + rangement Compte/Préférences (#1)
- [x] Faille RLS profiles P0 ✅ 17 juin
- [ ] Brique 5 UI admin campagnes
- [ ] Signup→onboarding→1ère séance E2E par un tiers
- [ ] Observabilité minimale

## Prochaines tâches

### 1. Notifications robustes + rangement Compte → Préférences (CHANTIER, à faire ensemble)
Contexte : abonnement push (ProfileTab:121-123) correct mais ne tourne QU'au toggle manuel.
Aucune re-sync au boot → sub périmée jamais rattrapée (cas f.marco sub d'avril morte).
a. AUDIT onglet Compte/ProfileTab : inventaire, décider quoi va dans Préférences (notifs,
   langue...) vs reste dans Compte.
b. Déplacer réglages notifs ProfileTab → Préférences EN PRÉSERVANT la logique push
   (getSubscription/subscribe + upsert push_subscriptions onConflict user_id).
   Risque : hub/ClientIntlProvider.
c. Filet de sécurité : re-sync silencieuse de la sub au boot (user notifs activées →
   getSubscription, si changée/disparue → recréer + ré-upsert). Sans redemander permission.
d. Test : activer → simuler sub périmée → vérifier recréation auto au lancement.
Note : SW stable (push-only), risque vient des subs anciennes (Apple expire).

### 2. Brique 5 — UI admin campagnes beta
Créer/activer/voir compteur. Réutiliser patterns admin (SubscriptionDialog).

### 3. Fix UX onboarding "10 jours" trompeur (beta a 60j)
Adapter le texte selon résultat claim_beta_slot.

### 4. Nettoyage cron (mineur) : désactiver jobid 9 (déjà neutralisé par garde horaire).

## Backlog (ROADMAP)
#18 nutrition = RÉSOLU. P1 : Bloc D (created_at vs date, await sans check error),
exercise_id FK, validation total_weeks.

## Notes test
- f.marco : sub fraîche 15/06 18:42, last_streak_reminder_at posé 20:43 (remettre null
  pour re-tester aujourd'hui).
- Bypass force=true reste en prod (protégé par auth Bearer).
