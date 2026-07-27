# Phase 6 — Webhooks Stripe séparés par scope

## Statut

La séparation locale est prête, sans endpoint Stripe, bypass Vercel, secret
réel, déploiement ou accès distant. La route historique reste disponible et
conserve son contrat.

## Architecture

| Scope | Route | Secret | Événements |
|---|---|---|---|
| Compte plateforme (`connect=false`) | `/api/stripe/webhook/platform` | `STRIPE_PLATFORM_WEBHOOK_SECRET` | `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_succeeded`, `customer.subscription.deleted` |
| Comptes connectés (`connect=true`) | `/api/stripe/webhook/connect` | `STRIPE_CONNECT_WEBHOOK_SECRET` | `account.updated` |
| Historique | `/api/stripe/webhook` | `STRIPE_WEBHOOK_SECRET` | Contrat historique inchangé pendant la transition |

Les nouvelles routes partagent
[`scoped-http-handler.ts`](../lib/billing/webhook/scoped-http-handler.ts).
Cette frontière ne remplace ni le service métier, ni le repository, ni les RPC
d'idempotence existants.

## Ordre fail-closed

Pour les deux nouvelles routes :

1. lire le corps brut avec `request.text()`;
2. lire `stripe-signature`;
3. exiger le secret propre à la route, `STRIPE_SECRET_KEY` et une valeur
   explicite de `STRIPE_WEBHOOK_EXPECTED_LIVEMODE`;
4. vérifier la signature avec le secret propre à la route;
5. comparer `event.livemode` au mode attendu;
6. refuser tout type absent de l'inventaire du scope;
7. refuser un événement connecté sur la route plateforme; pour Connect, exiger
   `event.account` et son égalité avec l'`Account.id` signé;
8. exiger la configuration Supabase serveur;
9. seulement alors appeler `deliverWebhookEvent`, qui possède le claim durable
   et les mutations métier.

Une configuration absente ou invalide retourne `503`, car le serveur ne peut
pas établir son autorité. Une signature, un mode ou un scope de requête
incompatible retourne `400`. Ces rejets n'appellent ni
`claim_stripe_webhook_event`, ni un repository Billing.

`STRIPE_WEBHOOK_EXPECTED_LIVEMODE` accepte exclusivement `true` ou `false`.
Le staging devra recevoir `false`. Une valeur absente ou différente empêche
tout traitement.

## Confidentialité

Les secrets de signature sont indépendants. Aucun secret, signature, corps
brut ou payload complet n'est inclus dans une réponse ou un journal. Le fichier
`.env.example` ne fournit aucune valeur Stripe.

## Plan opérateur suivant — non exécuté

Préconditions supplémentaires :

- credential Stripe test ou sandbox chargé uniquement en mémoire;
- Protection Bypass for Automation Vercel explicitement autorisé;
- deux endpoints, jamais la route historique:
  - plateforme avec `connect=false`;
  - Connect avec `connect=true`;
- deux secrets `whsec_…` conservés séparément;
- variables limitées à Preview + `phase-6-staging`;
- `STRIPE_WEBHOOK_EXPECTED_LIVEMODE=false`;
- un nouveau déploiement Preview du même code;
- validation technique sans événement métier.

Modèle d'URL expurgé :

```text
https://<preview>.vercel.app/api/stripe/webhook/platform?x-vercel-protection-bypass=<secret Vercel non persisté>
https://<preview>.vercel.app/api/stripe/webhook/connect?x-vercel-protection-bypass=<secret Vercel non persisté>
```

La méthode envisagée pour charger les variables dans un processus opérateur
doit garantir le projet, l'environnement Preview et la branche avant usage.
Elle ne doit écrire aucun fichier d'environnement.

La CLI locale expose bien les deux sélecteurs requis :

```bash
npx vercel env run \
  --environment preview \
  --git-branch phase-6-staging \
  -- <commande fail-closed>
```

La prochaine étape devra encore contrôler le project/team lié avant cette
commande et refuser toute variable absente, désactivée ou live.

## Tests

[`stripe-scoped-webhook-routes.test.ts`](../tests/unit/stripe-scoped-webhook-routes.test.ts)
couvre les deux inventaires, les secrets croisés, le corps brut, le mode,
l'autorité Connect, l'absence de workflow durable avant validation et les
réponses HTTP conservées. Les tests historiques restent propriétaires de la
route `/api/stripe/webhook`.
