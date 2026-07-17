# ADR 0002 — Frontières E2E locales

- Statut : accepted
- Date : 2026-07-17

## Contexte

Les parcours critiques doivent exercer l'application Next.js et ses frontières réseau sans contacter un environnement distant. Des mocks Vitest sont adaptés aux contrats unitaires, mais ils ne prouvent pas qu'une route serveur appelle correctement un fournisseur ni que le parcours navigateur traverse Auth, PostgREST et PostgreSQL.

## Décision

Les E2E critiques s'exécutent entièrement en local et séquentiellement :

- Supabase local fournit Auth, PostgREST et PostgreSQL ;
- Mailpit reçoit les invitations SMTP ;
- un faux serveur Stripe reçoit les requêtes Checkout ;
- un faux serveur Web Push reçoit les livraisons push ;
- un faux serveur Anthropic reçoit le transport du chat Athena.

Les lanceurs refusent les origines et URLs fournisseurs non locales, appliquent le reset canonique, utilisent un seul worker lorsque l'état partagé l'exige et nettoient les données et processus temporaires. La commande canonique est `npm run test:e2e:critical`; les commandes par parcours restent disponibles pour une boucle ciblée.

Les interceptions Playwright des routes critiques sont évitées : intercepter une route Next.js ou fabriquer sa réponse dans le navigateur contournerait précisément la frontière HTTP serveur que ces parcours doivent caractériser. La simulation est placée à la frontière réseau du fournisseur, après le code applicatif et le transport réels.

## Conséquences

- Un test peut être qualifié d'E2E local seulement si ses frontières principales ne sont pas remplacées dans le navigateur.
- Les faux fournisseurs ont des ports dédiés, un état inspectable et un cycle de vie borné au scénario.
- La suite critique est plus lente que Vitest et reste séquentielle ; elle est destinée aux changements de frontière et aux validations avant fusion ou déploiement.
- Les erreurs de fournisseur sont déterministes et reproductibles sans secret réel.

## Limites et dette restante

- Chromium est le navigateur intégré actuel ; la matrice multi-navigateurs et mobile réel reste à construire.
- Les faux fournisseurs valident les requêtes attendues, pas l'ensemble du comportement des plateformes distantes.
- Les cinq parcours ne couvrent pas encore séance, nutrition, reprise mobile ni réconciliation Billing.
- Une suite locale verte n'est pas une preuve de santé d'un environnement déployé.

## Références

- [Stratégie de tests](../TESTING_STRATEGY.md)
- [Harnais invitation](../E2E_INVITATION_HARNESS.md)
- [Harnais checkout](../E2E_CHECKOUT_HARNESS.md)
- [Harnais push](../E2E_PUSH_HARNESS.md)
- [Harnais chat](../E2E_CHAT_HARNESS.md)
- [Mocks de fournisseurs Vitest](../TEST_PROVIDER_MOCKS.md)
