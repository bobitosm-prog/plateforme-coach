# Adaptateurs HTTP Stripe

## Statut

Contrat appliqué depuis le 17 juillet 2026. Il complète le [modèle Billing](BILLING_DOMAIN_MODEL.md), le [service Checkout](BILLING_CHECKOUT_SERVICE.md), le [service Connect](BILLING_CONNECT_SERVICE.md), les [handlers webhook](BILLING_WEBHOOK_HANDLERS.md) et les [contrats Stripe](BILLING_STRIPE_CONTRACTS.md).

Les routes conservent uniquement la frontière HTTP, l'authentification serveur, les contrôles d'autorité indispensables avant service-role, la vérification de signature webhook, l'appel aux services et le mapping des réponses legacy.

## Inventaire mesuré

| Route | Avant | Après | État |
|---|---:|---:|---|
| `POST /api/stripe/checkout` | 82 lignes | 66 lignes | Repository Supabase extrait ; auth, parsing et mapping legacy conservés. |
| `POST /api/stripe/coach-checkout` | 81 lignes | 61 lignes | Repository coach/client extrait ; identité de session et création admin bornée conservées. |
| `POST /api/stripe/connect` | 90 lignes | 80 lignes | Repository de claim Connect extrait ; lecture du profil et contrôle du rôle restent avant service-role. |
| `POST /api/stripe/check-account` | 36 lignes | 36 lignes | Déjà conforme ; lecture du profil soumis à RLS, contrôle coach et mapping du statut uniquement. |
| `POST /api/stripe/webhook` | 89 lignes | 48 lignes | Raw body et signature conservés ; claim, dispatch et finalisation durable déplacés dans Billing. |
| `POST /api/stripe/setup-products` | 73 lignes | 21 lignes | Auth admin et mapping legacy conservés ; création des produits/prix extraite. |

Total : 451 → 312 lignes. Toutes les routes respectent le seuil cible de 80 lignes, sans découpage artificiel du mapping HTTP.

## Responsabilités extraites

- [`lib/billing/checkout/repository.ts`](../lib/billing/checkout/repository.ts) construit les ports de données des checkouts plateforme et coach. Le client service-role reste créé côté serveur et seulement après authentification ; le checkout plateforme conserve sa création paresseuse après validation du profil, de l'offre et du prix.
- [`lib/billing/connect/repository.ts`](../lib/billing/connect/repository.ts) isole la lecture et le claim atomique de `stripe_account_id`.
- [`lib/billing/webhook/delivery.ts`](../lib/billing/webhook/delivery.ts) orchestre le claim durable, les replays, le dispatch métier et la finalisation. La route conserve obligatoirement `req.text()` et `webhooks.constructEvent`.
- [`lib/billing/products`](../lib/billing/products) porte les valeurs historiques des deux produits et quatre prix. La route reste protégée par le contrat `verifyAdmin`.

## Compatibilité et sécurité

- Aucun statut HTTP, corps JSON, URL, prix, metadata ou clé d'idempotence n'est modifié.
- Les identités client et coach viennent toujours de la session serveur et des relations relues en base.
- Les données envoyées par le navigateur ne deviennent jamais une autorité Billing.
- Le service-role n'est utilisé qu'après authentification et contrôles applicables ; aucune clé n'est journalisée.
- Le webhook vérifie toujours la signature sur le corps brut avant de créer le client service-role ou d'acquérir un claim.
- Les objets Stripe requis restent relus par les ports Checkout, Connect et Webhook.
- `setup-products` conserve volontairement son comportement historique non idempotent ; cette dette n'est pas masquée par l'extraction.

## Validation

Le test statique [`tests/unit/stripe-route-adapters.test.ts`](../tests/unit/stripe-route-adapters.test.ts) inventorie exactement les six routes, contrôle leur taille et les frontières critiques. Les tests de route existants continuent de caractériser leurs réponses legacy.

Commandes ciblées :

```bash
npx vitest run tests/unit/billing-products-service.test.ts tests/unit/stripe-route-adapters.test.ts tests/unit/stripe-checkout-authorization.test.ts tests/unit/stripe-coach-checkout-authorization.test.ts tests/unit/stripe-connect-authorization.test.ts tests/unit/stripe-connect-status-route.test.ts tests/unit/stripe-setup-products-authorization.test.ts tests/unit/stripe-webhook-metadata-replay.test.ts tests/unit/billing-webhook-handlers.test.ts tests/unit/billing-webhook-ordering.test.ts tests/unit/billing-reconciliation.test.ts
psql postgresql://postgres:postgres@127.0.0.1:55322/postgres -X -v ON_ERROR_STOP=1 -f tests/integration/stripe-webhook-claims.sql
MOOVX_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres bash tests/integration/stripe-webhook-concurrency.sh
npm run test:e2e:checkout
npm run test:e2e:coach-checkout
```

## Limites

- Le mapping d'erreurs reste volontairement dupliqué entre routes tant que les consommateurs dépendent de réponses legacy différentes.
- Connect et `check-account` conservent leur lecture de profil soumise à la session/RLS dans la route, car elle établit l'autorité avant toute capacité privilégiée.
- La création service-role et Stripe reste une responsabilité d'assemblage de la frontière HTTP ; les décisions métier sont portées par les services injectés.
- Les mutations multi-tables du webhook ne sont pas transactionnelles et restent surveillées par la [réconciliation read-only](BILLING_RECONCILIATION.md).
