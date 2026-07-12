# Harnais E2E — checkout plateforme

## Frontières traversées

Le scénario utilise Chromium, le composant `Paywall`, `POST /api/stripe/checkout`, Supabase Auth/PostgREST/PostgreSQL local et le SDK Stripe Node réel. Seul le transport HTTP final du SDK est redirigé vers un serveur factice déterministe sur `http://127.0.0.1:55326`.

La redirection Stripe est inactive par défaut. Elle exige simultanément `MOOVX_E2E=1` et `STRIPE_E2E_BASE_URL`, et la route refuse tout protocole autre que HTTP, tout hôte non local et tout chemin autre que `/`. Ces variables sont injectées uniquement dans le processus Next.js par le runner serveur ; le navigateur ne peut pas les piloter.

Le faux serveur accepte uniquement la création de session utilisée par ce parcours. Il conserve en mémoire la méthode, le chemin et les paramètres encodés nécessaires aux assertions, sans enregistrer le header d'autorisation. Il peut répondre en erreur pour caractériser la panne Stripe et ses éventuels retries.

## Commandes

```bash
npm run supabase:local:reset
npm run test:e2e:checkout
npm run test:e2e:invitation
```

Le runner lance Next.js sur `127.0.0.1:3210` et, pour le checkout, le faux Stripe sur `127.0.0.1:55326`. Les deux groupes de processus sont arrêtés dans un bloc `finally`. Playwright utilise un seul worker, sans trace ni capture afin de ne pas exposer cookie ou jeton.

## Contrat vérifié

- le producteur frontend envoie exactement `{ planId: "client_monthly" }` ;
- la route dérive `clientId` de la session Supabase locale ;
- Stripe reçoit le prix local attendu, le mode `subscription`, les URLs locales et les métadonnées serveur ;
- le paiement `pending` n'est écrit qu'après une réponse Stripe réussie ;
- anonyme, identifiants injectés, plan inconnu et plan coach incompatible sont refusés avant Stripe ;
- un second client ne peut pas injecter l'identité du premier ;
- une panne Stripe renvoie le contrat `500` existant sans nouvelle écriture de paiement ;
- les origines navigateur observées sont limitées à l'application, Supabase local et le faux Stripe.

Deux exécutions consécutives après reset ont réussi en environ 13,2 secondes chacune. Le checkout coach n'est pas couvert par cette tranche.
