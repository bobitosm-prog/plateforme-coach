# Replay, concurrence et ordre des webhooks Billing

## Statut et périmètre

Ce contrat est appliqué depuis le 17 juillet 2026. Il complète le [service des handlers webhook](BILLING_WEBHOOK_HANDLERS.md) et les [contrats Stripe centralisés](BILLING_STRIPE_CONTRACTS.md), sans modifier le contrat HTTP de [`POST /api/stripe/webhook`](../app/api/stripe/webhook/route.ts) ni le schéma SQL.

Il couvre les replays, les claims concurrents et les événements supportés reçus dans un ordre différent de leur ordre métier. Il ne prétend pas rendre atomiques les mutations multi-tables.

## Replay et concurrence

La route conserve le protocole durable existant :

- `event.id` est réclamé atomiquement par `claim_stripe_webhook_event` avant toute mutation métier ;
- un événement `success` ou `skipped` est acquitté sans nouvelle mutation ;
- un événement `processing` déjà réclamé reçoit la réponse de conflit existante ;
- un événement `failed` peut être réclamé de nouveau ;
- la finalisation tardive d'un ancien essai ne peut pas écraser l'état d'un nouvel essai ;
- deux connexions PostgreSQL réclamant simultanément le même `event.id` obtiennent exactement `claimed` et `already_processing`, avec une seule ligne durable.

Le service métier reste sans état de claim : il suppose que la route a acquis le droit de traiter l'événement. Les upserts de paiements utilisent toujours `stripe_event_id` comme autorité d'idempotence.

## Événements désordonnés

Les metadata ne déterminent jamais seules l'accès produit. Les objets Stripe nécessaires sont relus et les mutations d'abonnement sont bornées par le couple d'autorité `(stripe_customer_id, stripe_subscription_id)`.

Les règles sont les suivantes :

- une mise à jour ou suppression tardive d'une ancienne subscription ne modifie pas la subscription de remplacement ;
- une invoice tardive est enregistrée comme fait financier idempotent, mais ne réactive pas une subscription actuellement annulée ;
- un checkout tardif peut finaliser le paiement local, mais n'accorde pas d'accès durable si la subscription relue n'est plus `active` ou `trialing` ;
- une invoice sans référence de subscription vérifiable échoue de manière retentable au lieu de rechercher un profil par customer seul ;
- tout statut inconnu est fail-closed pour l'octroi ou le renouvellement d'accès.

Cette séparation maintient deux faits distincts : un paiement peut être observé sans que l'accès produit soit accordé.

## Tests canoniques

```bash
npx vitest run tests/unit/billing-webhook-ordering.test.ts tests/unit/billing-webhook-handlers.test.ts tests/unit/stripe-webhook-metadata-replay.test.ts
psql postgresql://postgres:postgres@127.0.0.1:55322/postgres -X -v ON_ERROR_STOP=1 -f tests/integration/stripe-webhook-claims.sql
MOOVX_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres bash tests/integration/stripe-webhook-concurrency.sh
```

Le test de concurrence supprime sa ligne synthétique et ses fichiers temporaires via un trap, y compris après échec.

## Limites

- Les mises à jour de profil et de paiement d'un événement ne forment pas encore une transaction unique ; l'[audit de réconciliation](BILLING_RECONCILIATION.md) reste nécessaire.
- Refunds, disputes et plusieurs familles d'invoices ne sont pas encore supportés.
- Les événements Stripe ne portent pas tous un ordre global exploitable ; la protection repose donc sur l'autorité courante relue, pas sur l'horodatage de livraison.
- Une invoice legacy sans autorité de subscription est désormais retentable et doit être examinée par réconciliation plutôt que d'accorder un accès ambigu.
