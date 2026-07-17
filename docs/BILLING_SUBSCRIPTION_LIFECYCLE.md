# Cycle de vie des abonnements Billing

## Statut et périmètre

Ce document clôt la Phase 6 au 17 juillet 2026. Il décrit le comportement réellement implémenté pour les abonnements plateforme et l'accompagnement coach/client, ainsi que les limites qui empêchent encore d'en faire deux agrégats persistés totalement indépendants.

Il complète le [modèle métier Billing](BILLING_DOMAIN_MODEL.md), le [modèle d'accès](BILLING_ACCESS_MODEL.md), l'[ADR 0005](adr/0005-billing-domain-model.md), le [service Checkout](BILLING_CHECKOUT_SERVICE.md), les [handlers webhook](BILLING_WEBHOOK_HANDLERS.md) et le [contrat d'ordre des événements](BILLING_WEBHOOK_ORDERING.md).

## Deux cycles métier distincts

### Abonnement plateforme

Le cycle plateforme couvre trois contrats différents :

- `client_monthly` et `client_yearly`, abonnements récurrents donnant accès au produit client autonome ;
- `coach_monthly`, abonnement récurrent Coach Pro acheté par un profil coach ;
- `client_lifetime`, paiement ponctuel produisant l'accès legacy lifetime, et non une subscription Stripe récurrente.

`POST /api/stripe/checkout` dérive l'utilisateur de la session, vérifie son rôle contre un plan fermé, choisit le Price ID serveur, crée la Checkout Session puis écrit un paiement local `pending`. La session créée n'accorde aucun accès. Le webhook signé relit ensuite la session et, pour un plan récurrent, la subscription Stripe avant de projeter l'état local.

### Abonnement coach/client via Connect

Le cycle coach/client représente l'accompagnement mensuel d'un client par son coach actif. Il ne s'agit ni de Coach Pro, ni d'une création de relation Coaching.

`POST /api/stripe/coach-checkout` dérive le client de la session et le coach d'une unique relation `coach_clients.status = active`. Le compte Connect, le tarif et le Stripe Customer sont relus ou créés côté serveur. La Checkout Session configure le transfert au coach et la commission historique de 3 %. Aucun paiement local `pending` n'est créé avant le webhook ; le paiement est inscrit de manière idempotente lors du traitement signé.

La relation active autorise le démarrage du checkout, mais le paiement ne crée, ne réactive et ne remplace jamais cette relation.

## États observés et leur portée

| État | Portée réelle | Effet actuel sur l'accès |
|---|---|---|
| `requested` | Vocabulaire cible uniquement ; aucune commande persistée dédiée. | Aucun. |
| `checkout_created` | Session Stripe créée. Pour la plateforme, une ligne `payments.pending` est tentée ; pour le coach, aucune projection locale équivalente. | Aucun. |
| `trialing` | Statut Stripe accepté lors de la relecture d'une subscription. | Projeté localement comme `active` au checkout ; il n'existe pas de projection distincte complète. |
| `active` | Subscription Stripe active et projection legacy `profiles.subscription_status`. | Peut accorder l'accès selon le plan, la période et les règles legacy. |
| `past_due` | Statut Stripe propagé par `customer.subscription.updated`. | Refusé par le modèle canonique ; les consommateurs legacy doivent rester fail-closed hors `active`. |
| `canceled` | Statut propagé ou suppression de subscription. | Aucun accès récurrent ; la suppression retire la référence de subscription correspondante. |
| `unpaid`, `incomplete`, `incomplete_expired`, `paused` | Valeurs Stripe pouvant être propagées par le handler `subscription.updated`. | Aucun accès : statut non accordant. |
| `expired` | Valeur legacy documentée et utilisée par certaines projections, sans transition webhook dédiée. | Aucun accès. |
| `unknown` | Normalisation du domaine pour une valeur absente ou non reconnue. | Refus fail-closed et signalement attendu par réconciliation. |
| `lifetime` | Projection d'un paiement ponctuel client lifetime, pas état récurrent. | Accès legacy sans échéance, en attendant un entitlement explicite. |
| `processing`, `success`, `failed`, `skipped` | États de `stripe_webhook_events`, pas états d'abonnement. | Contrôlent le traitement/rejeu ; n'accordent jamais directement un accès. |

`invited` et `beta` sont également des sources d'accès legacy dans `profiles`, mais ne sont pas des subscriptions Stripe.

## Transitions réellement implémentées

### 1. Création du checkout

```text
session serveur authentifiée
  → rôle/plan ou relation active vérifiés
  → objet Stripe créé avec metadata canoniques
  → checkout_created
  → paiement pending local uniquement pour le checkout plateforme
```

Une panne Stripe n'écrit aucun accès. Les identités, prix et comptes Connect fournis par le navigateur sont ignorés ou refusés.

### 2. Checkout complété

```text
événement signé
  → claim durable par event.id
  → Checkout Session relue
  → metadata parsées puis recoupées avec profil/paiement/relation serveur
  → Subscription relue si plan récurrent
  → accès projeté seulement si Stripe est active ou trialing
  → paiement finalisé ou inséré
  → événement success
```

Pour `client_lifetime`, le webhook projette `subscription_status = lifetime` sans `stripe_subscription_id`. Pour un checkout tardif dont la subscription est déjà annulée, le fait financier peut être finalisé sans réactiver l'accès.

### 3. Invoice payée

`invoice.payment_succeeded` ne traite que `billing_reason = subscription_cycle`. L'invoice et sa subscription sont relues. Le profil doit correspondre au couple `(stripe_customer_id, stripe_subscription_id)`. Le paiement est inséré avec `stripe_event_id`; la période locale n'est renouvelée que si la subscription courante est `active` ou `trialing`.

Les périodes locales sont encore estimées à 30 ou 365 jours depuis l'horloge de traitement. Elles ne reflètent pas encore directement `current_period_start/end` de Stripe : c'est une dette connue.

### 4. Subscription mise à jour ou annulée

`customer.subscription.updated` propage le statut relu uniquement au profil possédant encore le couple customer/subscription. Une valeur autre que `active` n'accorde pas d'accès canonique.

`customer.subscription.deleted` écrit `canceled` et retire `stripe_subscription_id`, également sous contrôle du couple d'autorité. Un événement tardif concernant une ancienne subscription ne peut donc pas annuler sa remplaçante.

### 5. Replay, concurrence et désordre

`event.id` est la clé de claim durable. Un événement `success` ou `skipped` est terminal ; `failed` et un `processing` abandonné depuis plus de cinq minutes peuvent être réclamés. Deux claims concurrents produisent une seule exécution métier.

Le désordre n'est pas résolu par un horodatage global Stripe : les handlers relisent l'objet courant et bornent leurs mutations à l'autorité subscription. Un paiement tardif reste un fait financier, jamais une preuve suffisante d'accès.

### 6. Réconciliation

L'[audit de réconciliation](BILLING_RECONCILIATION.md) compare en lecture seule les claims anciens, paiements, customers, subscriptions, checkouts et comptes Connect. Il signale les statuts divergents ou inconnus et recommande une investigation ou un replay. Il ne corrige, ne supprime et ne rejoue rien automatiquement.

## Sources d'autorité

| Source | Autorité | Limite |
|---|---|---|
| Stripe | État du Customer, de la Subscription, de l'Invoice, du Checkout et du compte Connect. | Ne connaît pas l'autorité métier des identités et relations MoovX. |
| Session serveur | Identité MoovX à l'origine d'un checkout ou onboarding Connect. | Aucun identifiant navigateur ne peut la remplacer. |
| `coach_clients` actif | Autorise le scope coach/client au moment du checkout et du webhook. | N'est jamais créé par Billing ou par un paiement. |
| `stripe_webhook_events` | Claim, replay, concurrence et état technique du traitement. | `success` ne constitue pas seul un entitlement. |
| `profiles` | Projection legacy des statuts, périodes et références Stripe. | Mélange encore plusieurs sources d'accès et les deux catégories d'abonnement. |
| `payments` | Ledger financier local partiel et idempotence par `stripe_event_id`. | Une ligne `paid` n'accorde aucun droit à elle seule. |
| Entitlements futurs | Autorité cible explicite pour produit, bénéficiaire, source et période. | Aucun stockage d'entitlements n'existe encore. |
| Cache/UI | Présentation et accélération éventuelle. | Jamais autoritaire pour paiement, subscription ou accès. |

Le service-role est réservé aux webhooks et frontières serveur contrôlées. Les utilisateurs authentifiés ne peuvent pas muter `payments`; la RLS limite leur lecture au propriétaire ou au coach activement lié.

## Invariants communs

1. Un paiement seul n'accorde jamais d'accès et ne crée jamais une relation coach/client.
2. Les metadata Stripe sont un contrat de transport, pas une preuve ; elles sont confrontées aux identités, rôles, paiements préparés et relations serveur.
3. L'abonnement plateforme et l'abonnement coach/client sont deux contrats métier indépendants.
4. Une relation coach/client active est obligatoire pour démarrer et confirmer le billing coach.
5. Seuls `active` et `trialing` relus auprès de Stripe permettent actuellement une projection d'accès récurrent ; tout autre statut est fail-closed.
6. Le cache, le navigateur et les réponses Stripe non signées ne sont jamais des autorités d'accès.
7. Les capacités service-role et secrets Stripe restent dans des frontières serveur après les contrôles applicables.
8. Le rejeu du même événement ne produit pas de double paiement ou double mutation métier.

## Projection legacy et indépendance incomplète

Le domaine distingue `PlatformSubscription` et `CoachSubscription`, mais le schéma actuel ne possède pas deux projections persistées indépendantes. Les handlers utilisent encore les champs partagés `profiles.subscription_type`, `subscription_status`, `subscription_end_date`, `stripe_customer_id` et `stripe_subscription_id`.

En particulier, Coach Pro (`coach_monthly` acheté par un coach) et l'accompagnement coach/client (`coach_paid` projeté sur le client) traversent des champs historiques qui ne constituent pas un agrégat Billing canonique. L'indépendance est donc un invariant cible protégé dans les décisions et les tests, mais pas encore une garantie structurelle complète de la base. Une future migration expand/contract devra introduire subscriptions/entitlements explicites avant de retirer ces champs legacy.

## Couverture actuelle

- Checkout plateforme : identité serveur, rôle/plan, metadata, idempotence, paiement pending et frontière Stripe locale.
- Checkout coach : relation active unique, rôle, Connect, tarif serveur, Customer, metadata et refus des identités injectées.
- Webhook : signature, claims, replay `failed`, concurrence, événements supportés et finalisation durable.
- Ordre : ancienne mise à jour/suppression, invoice tardive et checkout tardif sans réactivation.
- Accès : paiement distinct de subscription/entitlement, produits plateforme et coach indépendants dans le noyau pur, statuts inconnus fail-closed.
- Réconciliation : audit borné, expurgé, partiel sur panne Stripe et strictement sans mutation.

Les deux E2E Checkout exercent Next.js, Supabase local et la véritable frontière HTTP du SDK vers un faux Stripe local. Ils ne reproduisent ni le réseau Stripe réel, ni tout le cycle de renouvellement, ni les refunds/disputes.

## Limites restantes

- `setup-products` est non idempotent et crée de nouveaux objets à chaque appel autorisé.
- Les mutations profil, paiement et finalisation webhook ne sont pas une transaction PostgreSQL unique.
- Aucun entitlement explicite n'est persisté ; les projections legacy restent autoritaires pour plusieurs consommateurs.
- Refunds, partial refunds, disputes, annulations planifiées et reprises après impayé ne possèdent pas de handlers métier complets.
- La réconciliation est audit-only et n'applique aucune correction.
- Les périodes locales sont approximées, au lieu d'utiliser systématiquement les bornes de période Stripe.
- Le faux Stripe E2E valide la frontière et les contrats MoovX, pas toute la sémantique opérationnelle du fournisseur.
- Les colonnes historiques utilisées par certains flux divergent encore des types générés/canoniques documentés.

## Rollback et mode dégradé

### Ce qui peut être désactivé

- Les nouveaux checkouts peuvent être masqués côté produit ou rendus indisponibles en retirant leur configuration serveur, avec les réponses d'erreur existantes.
- L'onboarding Connect et `setup-products` peuvent être désactivés sans supprimer les comptes, subscriptions ou références existantes.
- La réconciliation read-only peut être interrompue sans muter l'état Billing.

### Ce qui doit continuer ou être conservé

- Le webhook signé doit continuer à recevoir et réclamer les événements des subscriptions déjà actives, même si les nouveaux checkouts sont désactivés.
- `stripe_webhook_events`, `payments` et les références Stripe de `profiles` ne doivent pas être supprimés ou réécrits pour « nettoyer » une panne.
- En cas de panne transitoire, l'événement doit rester `failed` ou `processing` retentable ; il ne doit jamais être marqué `success` sans mutation métier complète.
- L'audit de réconciliation doit être utilisé pour identifier les écarts avant toute correction manuelle.

### Interdictions de régression Phase 1

- Ne jamais réintroduire `clientId`, `coachId`, compte Connect, rôle ou prix du navigateur comme autorité.
- Ne jamais contourner la relation active pour un checkout ou webhook coach/client.
- Ne jamais élargir les mutations `payments` à `authenticated`, ni désactiver la RLS.
- Ne jamais traiter un webhook sans corps brut, signature valide et claim durable.
- Ne jamais supprimer l'idempotence `event.id`/`stripe_event_id` lors d'un rollback applicatif.
- Ne jamais journaliser secret, signature, cookie, payload Stripe brut, e-mail ou identité complète.

Le rollback applicatif général reste décrit dans [PHASE_1_ROLLBACK.md](PHASE_1_ROLLBACK.md). Toute évolution du stockage Billing devra être additive, compatible avec au moins une version applicative précédente et accompagnée d'un rollback vers l'avant.

## Prochaine évolution

La Phase 6 formalise le domaine et sécurise les frontières, mais ne crée pas encore le stockage canonique. Les prochaines évolutions Billing devront commencer par comparer silencieusement les projections legacy à des subscriptions/entitlements explicites, puis migrer par expand → double lecture contrôlée → bascule → contract.
