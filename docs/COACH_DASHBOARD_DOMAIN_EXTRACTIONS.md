# Frontières métier du dashboard coach

`useCoachDashboard` conserve son contrat public et orchestre quatre frontières
dans `lib/coaching/dashboard`.

- **Clients** : charge au plus 100 relations actives et leurs projections
  `active_related_profiles`; absence et panne restent distinctes.
- **Programmes** : formalise le handoff immuable de ces seuls clients actifs à
  `CoachPrograms`. Le hook ne possédait aucun accès programme à extraire; les
  formats `training_programs` et `client_programs` restent séparés.
- **Revenus** : reproduit les sommes
  mois/année/total et le compteur mensuel. Un paiement ne devient jamais un
  entitlement et aucune écriture Billing n'est effectuée.
- **Analytics** : lit les 200 dernières `completed_sessions` du coach et produit
  dernière séance et compte hebdomadaire avec une horloge injectée.

Les projections sont explicites, les erreurs sont expurgées et aucun module ne
crée de client Supabase ou n'utilise `service_role`. Le calcul historique « à
risque » reste dans le hook car il effectue encore une lecture séquentielle de
`workout_sessions` par client; il constitue une dette de la prochaine réduction
de façade. `useCoachAnalytics` conserve également ses trois lectures dédiées.

Mesures : `useCoachDashboard` passe de 731 à 683 lignes. La lecture des sessions
complétées quitte le hook. La projection legacy `payments.paid_at` reste à sa
frontière actuelle car cette colonne est absente des types canoniques; inventer
un repository typé aurait masqué cette divergence. Calendrier, messaging,
alimentation, profil, Stripe et feedback sont inchangés.

## Architecture finale de la façade

- `useCoachDashboard.ts` (11 lignes) conserve l'export et délègue une fois ;
- `coach-dashboard-contract.ts` (29 lignes) porte types, constantes et helpers
  publics historiques ;
- `useCoachDashboardController.ts` (432 lignes) coordonne identité, données,
  calendrier, actions legacy et composition du résultat public ;
- `useCoachDashboardMessaging.ts` (84 lignes) possède état de conversation,
  repository/service injectés, realtime, polling, scroll et cleanups.

Le contrôleur n'instancie plus de channel et ne possède plus de timer. Le hook
Messaging réutilise l'adaptateur central, neutralise les réponses obsolètes par
génération, nettoie deux channels de conversation, le channel global, le
polling et les listeners d'images. La façade retourne exactement les clés
historiques; `refreshCounters` reste interne.

La dette ESLint historique passe de 11 erreurs/7 avertissements à 9 erreurs/3
avertissements, tous localisés dans le contrôleur legacy. La façade, le contrat
et le hook Messaging n'ajoutent aucune erreur ni aucun avertissement.

Les accès directs existants ne sont pas multipliés : les lectures et mutations
legacy profil, feedback, alimentation et Stripe restent dans le contrôleur,
tandis que messaging demeure centralisé dans son repository/service et que le
calendrier continue d'utiliser son adaptateur. Aucun nouveau `select('*')`,
`createClient`, `service_role`, abonnement realtime ou polling n'est introduit.

## Pagination des listes

L'[inventaire des listes coach](COACH_LIST_PAGINATION.md) sélectionne les
templates Training comme seule liste visible sans borne métier. Leur première
page passe de 50 à 20 lignes avec curseur stable `created_at + id`, accumulation
dédupliquée et retry incrémental. L'annuaire client reste complet et borné à
100, car il alimente messaging, calendrier et affectations; les rendez-vous
restent bornés par semaine et les revenus/sessions restent des agrégats.
