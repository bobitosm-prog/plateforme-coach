# Contrats Stripe Billing : metadata et idempotence

## Statut

Contrat central appliqué depuis le 17 juillet 2026. Il complète le [modèle Billing](BILLING_DOMAIN_MODEL.md), le [service Checkout](BILLING_CHECKOUT_SERVICE.md) et les [handlers webhook](BILLING_WEBHOOK_HANDLERS.md).

## Metadata canoniques

[`lib/stripe/metadata.ts`](../lib/stripe/metadata.ts) est l'unique frontière de construction et de parsing des metadata de checkout. Les noms et valeurs legacy restent inchangés.

### Checkout plateforme

```ts
{
  clientId,
  planId: 'client_monthly' | 'client_yearly' | 'client_lifetime' | 'coach_monthly',
  coachId: 'platform',
  subType: planId,
}
```

### Checkout coach

```ts
{
  clientId,
  coachId,
  subType: 'coach_monthly',
  type: 'coach_subscription',
}
```

Les metadata de Subscription et PaymentIntent conservent `{ clientId, subType }`. La création éventuelle du Stripe Customer coach conserve `{ userId: clientId, coachId }`. Ces sous-contrats ont aussi des builders centralisés afin d'éviter une divergence silencieuse.

Le parseur webhook exige désormais exactement les clés de l'un des deux contrats de checkout. Il refuse :

- une clé requise absente ou une clé inconnue ;
- un UUID client ou coach invalide ;
- un `planId` différent de `subType` ;
- une offre coach sans `type: coach_subscription` et coach UUID ;
- une offre plateforme sans `coachId: platform`.

Une metadata valide n'est jamais une preuve d'autorité. Le webhook relit ensuite le profil, le rôle, le paiement plateforme préparé côté serveur ou la relation coach/client active.

## Idempotence canonique

[`lib/billing/idempotency.ts`](../lib/billing/idempotency.ts) centralise les formats et classifications actuels :

| Frontière | Clé ou autorité |
|---|---|
| Checkout plateforme | `checkout-{userId}-{planId}-{nowMs}` |
| Checkout coach | `coach-checkout-{clientId}-{coachId}-{nowMs}` |
| Claim webhook | `stripe_webhook_events.event_id`, via `claim_stripe_webhook_event` |
| Paiement webhook | conflit sur `payments.stripe_event_id`, doublons ignorés |

Les résultats `already_success` et `already_skipped` sont terminaux et renvoient le succès duplicate. `already_processing` interdit un traitement concurrent. Un événement `failed` reste réclamable ; une panne de claim ou de finalisation reste retentable avec un statut HTTP non réussi.

## Limites actuelles

- Les clés Checkout incluent l'heure à la milliseconde. Deux clics à des instants différents créent donc deux commandes Stripe distinctes ; ce n'est pas encore une idempotence métier durable.
- L'insertion locale du paiement plateforme intervient après la création Stripe et n'est pas transactionnelle.
- L'idempotence webhook empêche le double traitement concurrent, mais les mutations multiples d'un handler ne forment pas encore une transaction unique.
- Le faux Stripe local vérifie la vraie sérialisation SDK et l'en-tête d'idempotence, mais ne reproduit pas toute la sémantique de Stripe.

## Tests

- `npx vitest run tests/unit/billing-stripe-contracts.test.ts` vérifie builders, parsing strict, clés d'idempotence et inventaire statique ;
- les suites Checkout vérifient les paramètres et clés transmis au SDK ;
- la suite webhook vérifie metadata, replay, concurrence et retry `failed` ;
- les E2E checkout plateforme et coach vérifient la compatibilité avec la frontière Stripe HTTP locale.
