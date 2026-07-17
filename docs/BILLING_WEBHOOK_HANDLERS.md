# Service des handlers webhook Billing

## Statut

Contrat appliqué depuis le 17 juillet 2026. Il complète le [modèle métier Billing](BILLING_DOMAIN_MODEL.md), le [modèle d'accès](BILLING_ACCESS_MODEL.md) et l'[ADR Billing](adr/0005-billing-domain-model.md).

## Frontière HTTP conservée

[`app/api/stripe/webhook/route.ts`](../app/api/stripe/webhook/route.ts) reste propriétaire de la frontière Stripe et du cycle durable :

- lecture du corps brut et vérification de `stripe-signature` ;
- claim atomique de `event.id` par `claim_stripe_webhook_event` ;
- distinction `claimed`, replay `failed`, `already_success`, `already_skipped` et `already_processing` ;
- classement des événements non supportés en `skipped` ;
- finalisation `success`, `failed` ou `skipped` par `finalize_stripe_webhook_event` ;
- conservation des réponses HTTP legacy `200`, `400`, `409`, `500` et `503`.

La route ne délègue qu'après une signature valide, un claim acquis et la reconnaissance d'un type supporté. Une panne de finalisation reste un `503` retentable. Un événement `failed` peut donc être réclamé de nouveau sans permettre deux claims concurrents.

## Handlers métier extraits

[`lib/billing/webhook`](../lib/billing/webhook) expose `processWebhookEvent` derrière deux ports testables :

- `WebhookStripePort` relit auprès de Stripe les Checkout Sessions, Subscriptions et Invoices qui font autorité ;
- `WebhookBillingRepository` concentre les lectures et mutations Supabase nécessaires.

Le service traite actuellement :

| Événement | Relecture Stripe | Décision métier |
|---|---|---|
| `checkout.session.completed` | Checkout Session puis Subscription | Valide les metadata, le rôle, la propriété du paiement ou la relation coach active. Le paiement est finalisé, mais l'accès n'est accordé que si la subscription relue est `active` ou `trialing`. |
| `customer.subscription.updated` | Subscription | Répercute le statut seulement sur le profil identifié par le couple customer/subscription serveur. |
| `invoice.payment_succeeded` | Invoice puis Subscription | Enregistre le paiement idempotent. La période n'est renouvelée que pour la subscription courante si elle est `active` ou `trialing`. |
| `customer.subscription.deleted` | Subscription | Annule uniquement la subscription qui fait encore autorité sur le profil et retire sa référence Stripe. |
| `account.updated` | Objet signé de l'événement | Marque l'onboarding Connect terminé seulement si charges et payouts sont actifs. |

Le parsing suit le [contrat Stripe central](BILLING_STRIPE_CONTRACTS.md) dans [`lib/stripe/metadata.ts`](../lib/stripe/metadata.ts). Les metadata de checkout ne suffisent jamais seules : elles sont confrontées au profil, au rôle, au paiement préparé côté serveur ou à une relation coach/client active.

## Idempotence et absence de double mutation

Le service ne possède volontairement pas le claim. L'idempotence globale reste assurée avant son appel par la RPC atomique et après son exécution par la finalisation durable. L'upsert des paiements de renouvellement ou coach conserve `stripe_event_id` comme clé de conflit avec `ignoreDuplicates`.

Cette séparation permet de tester les décisions métier sans simuler le protocole HTTP, tout en gardant les tests de route et PostgreSQL responsables des replays, de la concurrence et des transitions durables.

## Confidentialité

Les journaux de la route ne contiennent que le type d'événement et, si nécessaire, l'échec de finalisation. Ils ne journalisent ni secret, ni signature, ni corps brut, ni payload Stripe complet, ni e-mail. Les réponses d'échec métier restent génériques.

## Tests

- `npx vitest run tests/unit/billing-webhook-handlers.test.ts` : décisions pures et ports du service ;
- `npx vitest run tests/unit/stripe-webhook-metadata-replay.test.ts` : contrat HTTP, metadata, replay, concurrence et finalisation ;
- `psql postgresql://postgres:postgres@127.0.0.1:55322/postgres -v ON_ERROR_STOP=1 -f tests/integration/stripe-webhook-claims.sql` : claim durable sur Supabase local.
- `MOOVX_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres bash tests/integration/stripe-webhook-concurrency.sh` : deux claims PostgreSQL réellement concurrents.

Les garanties de replay, concurrence et livraison désordonnée sont détaillées dans [le contrat d'ordre des webhooks](BILLING_WEBHOOK_ORDERING.md).

## Limites et dette

- Les mutations de profil et paiement d'un même événement ne sont pas transactionnelles ; la réconciliation Billing reste nécessaire.
- La finalisation persiste encore un message d'erreur borné par le contrat historique ; elle ne doit jamais devenir une source de logs contenant un payload fournisseur.
- `account.updated` utilise l'objet signé plutôt qu'une relecture `accounts.retrieve`, conformément au comportement existant.
- Les clés Checkout restent temporelles et ne représentent pas encore une commande métier durable.
