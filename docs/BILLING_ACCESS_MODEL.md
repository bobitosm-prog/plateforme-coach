# Frontière paiement, abonnement et accès produit

Ce document accompagne le [modèle métier Billing](BILLING_DOMAIN_MODEL.md). Il décrit le premier noyau de code de Phase 6 et sa coexistence avec les projections legacy. Aucune table, route Stripe, policy RLS ou réponse publique n'est modifiée dans cette tranche.

## Audit des mélanges actuels

L'inventaire au 17 juillet 2026 relève, dans `app/` et `lib/` :

- 139 lignes faisant référence aux champs d'abonnement ou d'essai ;
- 67 lignes liées à `payments`, `paid_at` ou `stripe_event_id` ;
- 38 lignes liées à `coach_clients` ou à la projection des profils reliés.

Ces nombres mesurent des occurrences, pas des défauts. Les mélanges significatifs sont :

- `profiles.subscription_type/status/end_date/trial_ends_at` sert simultanément de projection commerciale et de décision d'accès ;
- `invited`, `beta` et `lifetime` sont représentés dans les mêmes champs que les subscriptions Stripe ;
- le checkout coach utilise paiement, abonnement Connect et relation active dans le même flux ;
- le webhook transforme un paiement en mises à jour de profil et de ledger dans le même handler ;
- les dashboards calculent l'accès depuis `profiles`, mais affichent le revenu depuis `payments` ;
- `coach_monthly` peut désigner Coach Pro ou un abonnement d'accompagnement selon la frontière.

## Noyau de domaine

`lib/billing/` est un module pur, sans React, Next.js, Supabase ni SDK Stripe.

### États distincts

- `PaymentState` décrit uniquement le résultat financier : `pending`, `paid`, `failed`, remboursements, annulation ou `unknown`.
- `SubscriptionState` décrit le contrat récurrent : `pending`, `active`, `past_due`, annulation planifiée, annulation, expiration ou `unknown`.
- `ProductAccessState` décrit le droit produit : `active`, suspension, expiration, révocation ou `unknown`.
- `PlatformSubscription` et `CoachSubscription` sont deux types discriminés. Ils ne peuvent pas être utilisés pour le mauvais produit.
- `ProductEntitlement` porte son bénéficiaire, son produit, sa période vérifiée et, pour le coaching, son coach.

### Décisions pures

- `isPaymentSuccessful` normalise les statuts financiers historiques sans produire d'accès.
- `isSubscriptionActive` exige un état actif et une période courante vérifiée.
- `isProductEntitlementActive` exige un entitlement actif et une période valide.
- `decideProductAccess` accepte uniquement une subscription ou un entitlement correspondant au produit. Un paiement `paid` isolé renvoie `PAYMENT_NOT_AUTHORITY`.
- `decideCoachProductAccess` ajoute l'obligation d'une relation active et l'égalité des identités client/coach.

Les valeurs inconnues sont normalisées en `unknown` et refusées. Aucun identifiant issu du navigateur n'entre dans ces décisions : les appelants devront fournir les identités déjà établies par une frontière serveur ou RLS.

## Compatibilité legacy

Le nouveau modèle ne réinterprète pas silencieusement les champs actuels. `lib/billing/legacy.ts` isole deux projections existantes :

- `resolveLegacyDashboardAccess` reproduit les règles de `useClientDashboard` pour `invited`, `lifetime`, `beta`, `active` et les dates existantes ;
- `resolveLegacyRepositoryAccess` reproduit la normalisation du repository abonnement, y compris l'accès d'essai historique.

Ces adaptateurs sont explicitement temporaires. Ils montrent où l'accès historique diffère de la cible stricte : un statut `active` sans date peut encore ouvrir le dashboard, tandis qu'une `BillingSubscription` canonique exige une période vérifiée.

Deux intégrations à faible risque utilisent désormais ces adaptateurs :

- `useClientDashboard` délègue son calcul legacy sans changer `isSubActive`, le paywall, les plans, URLs ou réponses ;
- le repository abonnement délègue sa projection legacy sans modifier son type public ni ses résultats.

Les routes Stripe, les autres permissions `invited`, les composants, les migrations et la RLS restent inchangés.

## Matrice de décision

| Paiement | Subscription | Entitlement | Relation coach | Produit demandé | Décision canonique |
|---|---|---|---|---|---|
| `paid` | absent | absent | — | plateforme | refus : paiement non autorité |
| absent | active, période vérifiée | absent | — | même produit plateforme | accord subscription |
| remboursé | absent | absent | — | plateforme | refus fail-closed |
| `paid` | coach active | absent | inactive | coaching | refus relation |
| absent | coach active | absent | active et même scope | coaching | accord subscription |
| absent | plateforme active | absent | active | coaching | refus produit différent |
| statut inconnu | état inconnu | état inconnu | quelconque | quelconque | refus fail-closed |

Un futur handler de remboursement devra produire explicitement `EntitlementRevoked` ou conserver le droit selon les règles commerciales. En l'absence de cette projection vérifiée, le remboursement n'accorde aucun accès.

## Tests

`tests/unit/billing-domain-model.test.ts` couvre :

- normalisation et succès de paiement ;
- absence d'accès par paiement seul ;
- subscription active sans paiement récent ;
- période vérifiée obligatoire dans le modèle canonique ;
- relation coach active et scope des identités ;
- indépendance plateforme/coaching ;
- entitlements lifetime ;
- remboursements, annulations et états inconnus fail-closed ;
- compatibilité des projections dashboard et repository.

## Limites et prochaine migration

- Aucun consumer ne lit encore un entitlement persisté, car ce schéma n'existe pas.
- Le noyau n'effectue ni authentification, ni accès Supabase, ni appel Stripe.
- Les adaptateurs legacy restent nécessaires jusqu'au calcul parallèle et à la comparaison des droits.
- Les états publics et valeurs stockées ne sont pas renommés dans cette tranche.
- La divergence des colonnes `payments`/`profiles` reste à résoudre avant toute migration de données.

La prochaine étape de Phase 6 est d'extraire le service Checkout, après caractérisation des deux routes et définition d'une commande idempotente compatible.

## Références

- [ADR 0005](adr/0005-billing-domain-model.md)
- [Modèle métier Billing](BILLING_DOMAIN_MODEL.md)
- [Repositories Supabase](SUPABASE_REPOSITORIES.md)
- [Matrice RLS](RLS_TEST_MATRIX.md)
- [Types Supabase](SUPABASE_TYPES.md)
