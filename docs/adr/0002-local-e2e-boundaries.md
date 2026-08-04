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

Un parcours critique est défini comme une entrée exécutable nommée unique du runner canonique, rattachée à une spécification métier principale. Le nombre de tests Playwright contenus dans cette spécification ne change pas le décompte et les suites de performance en sont exclues. La matrice cible comporte 15 parcours; douze sont intégrés. L'attribution du coach par défaut rejoint la suite après qualification locale : le runner fournit `DEFAULT_COACH_EMAIL` et la spec crée l'unique profil coach correspondant. Sans ce profil local valide, la route échoue fermée en `503` sans mutation.

Le webhook Platform reste distinct du webhook Connect. Son parcours canonique active `--stripe`, fournit un secret de signature synthétique et dirige le SDK Stripe exclusivement vers le faux serveur local. Il signe puis livre un événement `checkout.session.completed` à la route Platform réelle, vérifie le claim durable et la finalisation du payment, puis rejoue le même événement. Le rejeu est accepté comme doublon sans seconde mutation et aucun accès Stripe réel n'est possible dans ce flux.

Les interceptions Playwright des routes critiques sont évitées : intercepter une route Next.js ou fabriquer sa réponse dans le navigateur contournerait précisément la frontière HTTP serveur que ces parcours doivent caractériser. La simulation est placée à la frontière réseau du fournisseur, après le code applicatif et le transport réels.

Les origines navigateur Supabase sont dérivées de l'URL locale injectée au run. La garde accepte uniquement `127.0.0.1` ou `localhost` avec le protocole et le port configurés; elle refuse un autre port local, un domaine Supabase distant et toute origine Production. Les fixtures Auth relisent le profil créé par le trigger `auth.users → profiles` et ne créent jamais un second profil.

Le cycle Training canonique utilise un programme hebdomadaire synthétique, reprend une séance après reload, finalise les séries, vérifie progression et historique, exerce une frontière RLS étrangère et nettoie les tables Training avant la sortie du scénario.

Le journal Nutrition canonique exige un catalogue `food_items` vide, traverse le fallback local `FITNESS_FOODS`, ajoute un snapshot de 100 g, le retrouve après reload, le modifie à 200 g puis le supprime. Il vérifie une ligne unique avec `food_id` nul, les recalculs calories/macros et les frontières RLS propriétaire, coach actif en lecture seule et client étranger sans accès. La relation coach inactive reste hors de ce sous-batch.

## Conséquences

- Un test peut être qualifié d'E2E local seulement si ses frontières principales ne sont pas remplacées dans le navigateur.
- Les faux fournisseurs ont des ports dédiés, un état inspectable et un cycle de vie borné au scénario.
- La suite critique est plus lente que Vitest et reste séquentielle ; elle est destinée aux changements de frontière et aux validations avant fusion ou déploiement.
- Les erreurs de fournisseur sont déterministes et reproductibles sans secret réel.

## Limites et dette restante

- Chromium est le navigateur intégré actuel ; la matrice multi-navigateurs et mobile réel reste à construire.
- Les faux fournisseurs valident les requêtes attendues, pas l'ensemble du comportement des plateformes distantes.
- Trois parcours de la matrice cible restent planifiés : Progression, Realtime et réconciliation Billing.
- Le parcours d'attribution du coach par défaut utilise uniquement Supabase et Next.js locaux; son `503` hors préconditions ne déclenche aucun accès distant.
- Une suite locale verte n'est pas une preuve de santé d'un environnement déployé.

## Références

- [Stratégie de tests](../TESTING_STRATEGY.md)
- [Harnais invitation](../E2E_INVITATION_HARNESS.md)
- [Harnais checkout](../E2E_CHECKOUT_HARNESS.md)
- [Harnais push](../E2E_PUSH_HARNESS.md)
- [Harnais chat](../E2E_CHAT_HARNESS.md)
- [Mocks de fournisseurs Vitest](../TEST_PROVIDER_MOCKS.md)
