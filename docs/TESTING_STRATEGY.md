# Stratégie de tests MoovX

La campagne Core Web Vitals anti-cherry-picking du 24 juillet 2026 a
pré-déclaré exactement deux captures normatives. Une capture défavorable est
conservée et ne doit jamais être remplacée par une relance ; voir
[`PERFORMANCE_CWV_COMPARISON.md`](PERFORMANCE_CWV_COMPARISON.md).
La calibration qui en résulte est portée par le registre de budgets v2 et doit
toujours être vérifiée sur les six artefacts conservés.

> État mesuré le 15 juillet 2026 après intégration de la suite E2E critique canonique de Phase 2. Cette stratégie décrit le dépôt réel puis la cible. Aucun test ne doit contacter la production.

Les invariants de cache (TTL, propriétaire, version, autorité et invalidation) et l'inventaire statique du legacy sont décrits dans [`CACHE_STRATEGY.md`](CACHE_STRATEGY.md).

## 1. Pyramide réelle et vocabulaire

Un **niveau technique** indique quelles couches et quels processus sont exécutés. « Contrat », « caractérisation », « régression », « hostile » ou « concurrence » indiquent le **but** d'un test, pas un niveau supplémentaire : un test de contrat peut être unitaire, PostgreSQL ou E2E selon les frontières qu'il traverse.

| Niveau technique actuel | Outil et emplacement | Mesure actuelle | Ce qui est réellement exécuté |
|---|---|---:|---|
| Tests unitaires et de modules | Vitest, `tests/unit/**/*.test.ts` | 34 fichiers, 400 actifs, 3 `todo` | Fonctions pures, validation, autorisation isolée, modules serveur, contrats statiques et routes chargées avec dépendances simulées. |
| Test de rendu React | Vitest + `renderToStaticMarkup`, `chat-markdown-renderer.test.ts` | 1 fichier inclus dans les 34 | Rendu serveur de `ChatMarkdown`; pas de navigateur, d'événement DOM ou de suite de composants interactive. |
| Intégration PostgreSQL/RPC | `tests/integration` | 11 fichiers; 114 attentes RLS bloquantes, assertions structurelles et 1 scénario de concurrence | Migrations sur base vide, personas, schéma, droits, RLS, RPC, rollback transactionnel, claims Stripe et concurrence invitation. |
| E2E Chromium critique | Playwright, `e2e/*.spec.ts` | 12 parcours intégrés sur une cible canonique de 15 | Chromium, Next.js et Supabase Auth/PostgREST/PostgreSQL locaux; fournisseurs simulés seulement à leur frontière réseau. |
| Vérifications statiques | TypeScript, ESLint, i18n, build | commandes séparées | Contrats TypeScript, règles ESLint, parité des traductions et compilation Next.js. |

Les 400 tests Vitest comprennent donc des objectifs différents : tests purs, caractérisation du comportement existant, contrats de sécurité, tests hostiles et tests de routes. Leur présence sous `tests/unit` décrit le runner et l'isolation technique, pas nécessairement la nature métier.

## 2. Commandes vérifiées

### Boucle rapide

```bash
npm test
npm run test:watch
npx vitest run tests/unit/<fichier>.test.ts
npx tsc --noEmit
npx eslint <fichiers-touchés>
npm run i18n:check
```

`npm test`, `test:watch`, `lint` et `i18n:check` existent dans `package.json`. TypeScript ciblé et Vitest par fichier utilisent les binaires locaux. `npm run lint` exécute actuellement ESLint sur tout le dépôt et peut exposer de la dette historique; le contrôle ciblé reste obligatoire sur les fichiers touchés.

### PostgreSQL et migrations

La reconstruction Supabase locale officielle du projet est :

```bash
npm run supabase:local:start
npm run supabase:local:status
npm run supabase:local:reset
npm run supabase:local:stop
```

Après reset, les suites actuelles s'exécutent contre la base locale jetable :

```bash
psql postgresql://postgres:postgres@127.0.0.1:55322/postgres -v ON_ERROR_STOP=1 -f tests/integration/supabase-baseline-assertions.sql
psql postgresql://postgres:postgres@127.0.0.1:55322/postgres -v ON_ERROR_STOP=1 -f tests/integration/coach-invitations-rpc.sql
psql postgresql://postgres:postgres@127.0.0.1:55322/postgres -v ON_ERROR_STOP=1 -f tests/integration/stripe-webhook-claims.sql
MOOVX_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres bash tests/integration/coach-invitations-concurrency.sh
npm run test:integration:rls
```

Pour prouver une reconstruction sur un PostgreSQL vide indépendant, créer une base locale jetable puis lancer :

```bash
MOOVX_TEST_DATABASE_URL=postgresql://<utilisateur-local>@127.0.0.1:<port-local>/<base-jetable> bash tests/integration/reset-migrations.sh
```

Le script refuse une URL qui ne contient ni `127.0.0.1` ni `localhost`. La procédure et les limites historiques sont détaillées dans [la stratégie de baseline Supabase](./SUPABASE_BASELINE_STRATEGY.md).

### E2E locaux

```bash
npm run test:e2e:critical
npm run test:e2e:invitation
npm run test:e2e:checkout
npm run test:e2e:coach-checkout
npm run test:e2e:push
npm run test:e2e:chat
npm run test:e2e -- e2e/auth-registration-flow.spec.ts
npm run test:e2e:client-journey
npm run test:e2e:coach-journey
npm run test:e2e:default-coach
npm run test:e2e -- e2e/platform-webhook-runtime.spec.ts --stripe
npm run test:e2e -- e2e/nutrition-daily-journal.spec.ts
npm run test:e2e -- e2e/billing-subscription-reconciliation.spec.ts --stripe
```

`npm run test:e2e:critical` est la validation canonique avant fusion ou déploiement. Elle effectue un reset Supabase, puis exécute séquentiellement les quinze parcours intégrés avec un seul worker. Les commandes dédiées restent préférables pendant le développement d'un seul flux. `npm run test:e2e` lance les spécifications sans orchestrer toutes les frontières optionnelles et ne remplace donc pas la suite critique.

### Frontière de stockage Seedance en développement

Preview sur `phase-6-staging` utilise le stockage HTTPS privé dédié aux références Seedance. Le fallback local reste absent par défaut et `SEEDANCE_LOCAL_STORAGE_FALLBACK_ENABLED` est classé `TEMPORARY_ACTIVE` : il n'est accepté qu'avec `NODE_ENV=development`, une URL Supabase HTTP sur `localhost` ou `127.0.0.1` avec port explicite et sans credentials. Production et toute origine distante sont refusées. Deux cas positifs de `tests/unit/seedance-image-route.test.ts` dépendent encore de ce chemin local. Sa suppression est donc différée tant qu'un parcours local canonique de remplacement n'est pas défini et couvert ; cette décision n'autorise aucun fallback vers un stockage distant ou Production.

### Suite E2E critique canonique

Prérequis : Docker actif, dépendances installées et ports locaux libres. La commande refuse tout contexte Supabase lié ou distant, sérialise les exécutions avec `.critical-e2e.lock`, vérifie automatiquement les **149 migrations actuelles** et laisse la stack Supabase locale active à la fin, comme les autres lanceurs locaux.

Un **parcours critique** est une entrée exécutable nommée unique de `scripts/run-critical-e2e.mjs`, rattachée à une spécification métier principale. Plusieurs tests Playwright dans cette spécification comptent comme un seul parcours. Les suites de performance ne font pas partie de ce décompte.

La matrice cible canonique est versionnée dans `scripts/e2e-local-contract.mjs` :

| # | Parcours cible | État canonique |
|---:|---|---|
| 1 | Invitation coach | Intégré |
| 2 | Checkout plateforme | Intégré |
| 3 | Checkout coach | Intégré |
| 4 | Notification Push | Intégré |
| 5 | Chat Athena | Intégré |
| 6 | Inscription, authentification et reprise de session | Intégré dans ce sous-batch |
| 7 | Parcours client rattaché à un coach | Intégré dans ce sous-batch |
| 8 | Parcours coach gérant un client | Intégré dans ce sous-batch |
| 9 | Attribution du coach par défaut | Intégré dans ce sous-batch |
| 10 | Webhook Platform signé, rejeu et idempotence | Intégré dans ce sous-batch |
| 11 | Cycle d’une séance Training | Intégré dans ce sous-batch |
| 12 | Journal nutritionnel quotidien | Intégré dans ce sous-batch |
| 13 | Suivi de progression | Intégré dans ce sous-batch |
| 14 | Messagerie coach-client et synchronisation Realtime | Intégré dans ce sous-batch |
| 15 | Réconciliation abonnement et Billing | Intégré dans ce sous-batch |

L'ordre exécutable est stable : invitation, checkout plateforme, checkout coach, push, chat, Auth/inscription/reprise de session, parcours client rattaché à un coach, parcours coach gérant un client, attribution du coach par défaut, webhook Platform, cycle Training, journal Nutrition, suivi de progression, messagerie Realtime, puis réconciliation abonnement/Billing. Le neuvième parcours injecte une valeur locale de `DEFAULT_COACH_EMAIL` et crée le profil coach correspondant; hors de ces préconditions, la route échoue fermée en `503` sans mutation et sans bloquer les autres parcours. Le dixième utilise `--stripe`, un secret synthétique et le faux Stripe local pour signer `checkout.session.completed`, finaliser le payment puis rejouer exactement le même événement; le rejeu est reconnu comme doublon sans seconde mutation. Le onzième traverse un programme hebdomadaire, saisit deux séries, reprend la séance après reload, finalise la session, vérifie historique, progression et frontières RLS, puis nettoie toutes ses données synthétiques. Le douzième exige `food_items` vide, utilise le fallback `FITNESS_FOODS`, vérifie ajout, reload, modification, suppression et frontières RLS sur `daily_food_logs`; son horloge capture l'instant réel avant authentification afin de stabiliser la date UTC sans avancer au-delà de l'émission du JWT. Le treizième vérifie poids, graphique, mensurations, record personnel, reload et frontières RLS du suivi de progression. Le quatorzième utilise deux contextes Chromium et Supabase Realtime local pour vérifier les échanges client→coach et coach→client sans reload, l'état non-lu/lu, la persistance après reconnexion, l'absence de doublon et les refus RLS des tiers non liés. Le quinzième utilise le faux Stripe local et la route Platform réelle pour vérifier payment initial, renouvellement, replay, annulation, reprise d'un claim `failed` avec le même Event ID et réconciliation read-only finale `issues=[]`. Aucun fournisseur Stripe réel n'est contacté. Un seul reset a lieu au début; chaque scénario doit isoler ses identifiants et nettoyer ses comptes, profils et écritures dans son propre `finally`/`afterEach`. Next.js et uniquement le faux fournisseur requis sont démarrés pour le scénario courant puis arrêtés avant le suivant. La suite désactive les proxies externes, limite `NO_PROXY` à la boucle locale et force `--workers=1`.

Après le quinzième parcours, l'orchestrateur vérifie qu'il ne reste aucun compte Auth synthétique, profil, relation, invitation, paiement, abonnement push, message, historique Athena, usage IA, programme client, mesure corporelle, séance, série, record personnel, poids, journal nutritionnel, planning, badge, XP ou diagnostic hebdomadaire, que Mailpit est vide et que les ports `3210`, `55326`, `55328`, `55329` et `55330` sont fermés. Les parcours webhook et Billing contrôlent et nettoient en plus leurs claims dédiés dans leur propre `finally`. Son résumé indique statut et durée par parcours, durée totale et nature d'un échec : fonctionnel, infrastructure ou nettoyage incomplet. Toute sortie d'échec est expurgée des jetons, cookies, clés et champs conversationnels sensibles. Les traces/captures ne sont conservées sous `test-results/critical-e2e/` qu'en cas d'échec; elles sont supprimées après une suite verte.

Preuves du 15 juillet 2026 :

- stack arrêtée : cinq parcours verts en **184,7 s**;
- stack déjà active, immédiatement après : cinq parcours verts en **159,7 s**;
- les cinq commandes individuelles restent vertes; le push renforcé nettoie aussi ses fixtures dans un `afterEach` après timeout.

Qualification Auth du 30 juillet 2026 :

- `e2e/auth-registration-flow.spec.ts` traverse Chromium, Next.js, Supabase Auth/PostgREST/PostgreSQL et le trigger de profil sans fournisseur externe;
- deux exécutions ciblées consécutives sont vertes;
- après chaque exécution, les comptes Auth, identités, sessions et profils synthétiques sont absents et les ports temporaires sont fermés;
- l'intégration canonique progresse de **5/15 à 6/15**; les neuf autres parcours restent planifiés.

Qualification du parcours client du 30 juillet 2026 :

- `e2e/coach-client-client.spec.ts` traverse Chromium mobile, Next.js et Supabase Auth/PostgREST/PostgreSQL locaux avec un coach, des clients liés/non liés et des relations active/inactive synthétiques;
- deux exécutions ciblées consécutives réussissent, sans résidu Auth, identité, session, profil, relation ou donnée métier;
- la suite canonique complète réussit ses sept parcours et son audit final étendu;
- l'intégration canonique progresse de **6/15 à 7/15**; le parcours coach reste distinct, planifié et non intégré, et huit parcours restent à intégrer.

Qualification du parcours coach du 30 juillet 2026 :

- `e2e/coach-client-coach.spec.ts` traverse Chromium, Next.js et Supabase Auth/PostgREST/PostgreSQL locaux avec un coach, un client lié, un coach/client étrangers et une relation inactive;
- les capacités coach sur la fiche du client lié et les refus anonyme, étranger et inactif sont exercés avec les données et règles RLS réelles;
- deux exécutions ciblées consécutives réussissent, sans résidu Auth, identité, session, profil, relation ou donnée métier, puis la suite canonique complète réussit ses huit parcours;
- l'intégration canonique progresse de **7/15 à 8/15**; l'attribution du coach par défaut reste distincte, planifiée et non intégrée, et sept parcours restent à intégrer.

Qualification de l'attribution du coach par défaut du 30 juillet 2026 :

- `e2e/default-coach-assignment.spec.ts` traverse Chromium, Next.js et Supabase Auth/PostgREST/PostgreSQL locaux avec une session client et un coach résolu exclusivement par la configuration serveur locale;
- le parcours refuse l'accès anonyme et l'autorité forgée, crée une seule relation active, conserve l'abonnement et valide le rejeu idempotent;
- la configuration dédiée crée le profil correspondant à `DEFAULT_COACH_EMAIL`; lorsqu'il est volontairement absent des autres parcours, le `503` est un échec fermé conforme, sans mutation ni dépendance distante;
- l'intégration canonique progresse de **8/15 à 9/15** et six parcours restent à intégrer.

Qualification du webhook Platform du 3 août 2026 :

- `e2e/platform-webhook-runtime.spec.ts` traverse Chromium, Next.js, Supabase local et le SDK Stripe avec le faux transport Stripe limité à `127.0.0.1`;
- la signature est générée avec un secret synthétique local; `checkout.session.completed` fait passer le payment de `pending` à `paid`, persiste `stripe_event_id` et finalise le claim durable;
- le rejeu strict du même `event.id` répond `duplicate: true` et ne produit aucune seconde mutation;
- l'intégration canonique progresse de **9/15 à 10/15**; cinq parcours restent planifiés et aucun fournisseur Stripe réel n'est utilisé.

Qualification du cycle Training du 3 août 2026 :

- `e2e/training-workout-cycle.spec.ts` traverse Chromium mobile, Next.js et Supabase Auth/PostgREST/PostgreSQL locaux avec un programme hebdomadaire synthétique et des personas client, coach et client étranger;
- le parcours saisit deux séries, reprend le brouillon après reload, finalise une session unique, vérifie séries, planning, records, XP, badge, historique et refus RLS étranger, puis nettoie Auth et toutes les tables Training concernées;
- deux exécutions ciblées consécutives réussissent avec `1 passed (13.6s)` et zéro résidu; 71 tests Training ciblés réussissent;
- la fixture Invitation relit désormais le profil créé par le trigger Auth avant de compléter ses champs synthétiques, et sa navigation directe vers le lien élimine une course avec la redirection de landing;
- les gardes navigateur dérivent l'origine Supabase de `API_URL` et acceptent uniquement le protocole et le port local explicitement configurés; `127.0.0.1` et `localhost` restent interchangeables sur cette frontière, tandis qu'un port différent ou un hôte distant est refusé;
- la suite canonique isolée réussit ses onze parcours en `329.2 s`; l'intégration progresse de **10/15 à 11/15** et quatre parcours restent planifiés, à commencer par le journal nutritionnel.

Le reset initial est volontairement destructif pour la stack locale. Pour une itération sur un seul parcours, lancer sa commande dédiée; pour une modification transverse, une correction de sécurité, une fusion ou un déploiement, lancer la suite critique complète.

### Vérifications de livraison

```bash
npx tsc --noEmit
npx eslint <fichiers-touchés>
npm run i18n:check
npm run build
git diff --check
```

Les polices applicatives sont auto-hébergées via `next/font/local`; le build ne doit effectuer aucun téléchargement de police. Toute tentative réseau de police est une régression bloquante.

Qualification du journal Nutrition du 4 août 2026 :

- `e2e/nutrition-daily-journal.spec.ts` traverse Chromium mobile, Next.js et Supabase Auth/PostgREST/PostgreSQL locaux avec un propriétaire, son coach actif et un client étranger synthétiques;
- avec `food_items` vide, la recherche `poulet` utilise exclusivement le fallback local et trouve notamment « Blanc de poulet cuit » et « Cuisse de poulet cuite sans peau »;
- l'ajout de 100 g persiste une ligne unique avec `food_id` nul et le snapshot 165 kcal, 31 g protéines, 0 g glucides, 3,6 g lipides; après reload, la modification à 200 g produit 330 kcal, 62 g protéines, 0 g glucides et 7,2 g lipides, sans duplication, puis la suppression ramène les totaux à zéro;
- le propriétaire conserve son CRUD, le coach actif lit sans pouvoir écrire et le client étranger ne lit ni ne modifie; la relation coach inactive reste hors scope;
- deux runs dédiés réussissent avec `1 passed` en `26.0 s` puis `13.4 s`; 121 tests Nutrition/contrat réussissent;
- la suite canonique isolée réussit ses douze parcours en `500.7 s`, sans résidu Auth ou métier et sans altérer l'admin local principal;
- l'intégration progresse de **11/15 à 12/15**; Progression 13/15 reste planifiée et la tâche globale demeure ouverte.

Qualification du suivi de progression du 5 août 2026 :

- `e2e/progression-tracking.spec.ts` traverse Chromium mobile, Next.js et Supabase Auth/PostgREST/PostgreSQL locaux avec un propriétaire, son coach actif et un client étranger synthétiques;
- le parcours vérifie les poids historiques, l'ajout puis la correction à 81,4 kg sur une ligne unique, un graphique à trois points, les mensurations 81/95/100, le record Squat, le reload et la persistance;
- le propriétaire lit et écrit, le coach actif lit sans muter et le client étranger ne lit ni ne modifie les poids, mensurations ou records; la relation inactive, les photos, le Storage, l'IA corporelle, l'export, les bras/cuisses, `profiles.current_weight` et Realtime restent hors scope;
- deux runs dédiés Progression réussissent en `20.8 s` puis `13.5 s`, puis un run de non-régression réussit en `16.2 s`; chaque audit retrouve zéro résidu Auth ou métier;
- l'horloge du test Nutrition capture désormais l'instant réel avant authentification au lieu d'avancer systématiquement à midi UTC; deux runs Nutrition réussissent avant midi UTC en `19.2 s` puis `11.3 s`, sans retour vers `/login` et sans changement du contrat journal;
- la suite canonique isolée réussit ses treize parcours en `428.7 s`, sans résidu et sans altérer la stack principale;
- l'intégration progresse de **12/15 à 13/15**; Realtime/Messagerie 14/15 reste non commencé et la tâche globale demeure ouverte.

Qualification de la messagerie Realtime du 5 août 2026 :

- `e2e/messaging-realtime.spec.ts` traverse deux contextes Chromium, Next.js, Supabase Auth/PostgREST/PostgreSQL et le serveur Realtime local avec un coach, un client lié, un client étranger et un coach non lié;
- les messages client→coach et coach→client sont reçus sans reload; le badge non-lu est observé puis effacé après lecture, les deux messages restent ordonnés après reload et la reconnexion ne crée aucun doublon;
- les lectures et écritures des tiers non liés sont refusées par les politiques RLS réelles; les pièces jointes, Push, présence, saisie en cours, pagination avancée et historique long restent hors scope;
- Realtime local est activé explicitement et la migration idempotente `20260805100000_publish_messages_realtime.sql` publie `public.messages` une seule fois dans `supabase_realtime`, sans modifier les policies ni les données;
- deux exécutions dédiées réussissent avec `1 passed (26.0s)` puis `1 passed (29.5s)`; les audits trouvent zéro compte, identité, session, profil, relation ou message synthétique après chaque run;
- le runner critique utilise une capture asynchrone bornée et expurgée afin d'éviter le blocage de l'orchestration imbriquée tout en conservant la limite de sortie de 40 MiB et la classification des échecs;
- la suite canonique isolée réussit ses quatorze parcours en `438.9 s`, dont Messagerie Realtime en `28.0 s`; l'audit final est vide, les ports temporaires sont fermés et la stack principale avec son admin local reste inchangée;
- l'intégration progresse de **13/15 à 14/15**; seule la réconciliation abonnement/Billing reste planifiée et la tâche globale demeure ouverte.

Qualification de la réconciliation abonnement et Billing du 6 août 2026 :

- `e2e/billing-subscription-reconciliation.spec.ts` traverse Chromium, Next.js, Supabase Auth/PostgREST/PostgreSQL, les routes Checkout et webhook Platform, le claim durable et le service de réconciliation, avec le SDK Stripe dirigé uniquement vers `127.0.0.1:55326`;
- le parcours vérifie payment `pending`, checkout signé et finalisé, replay sans mutation, `subscription.updated`, renouvellement `invoice.payment_succeeded` unique, annulation et reprise du même Event ID après un premier claim `failed` (`attempt_count` 1 puis 2 et état final `success`);
- la réconciliation finale reste read-only, non partielle, non tronquée et sans issue; le correctif applicatif préalable est isolé dans `9aca3ba`;
- deux exécutions dédiées réussissent avec `1 passed`, en `18.2 s` puis `9.8 s`, et chaque audit retrouve zéro résidu Auth, profil, payment ou claim;
- la suite canonique isolée réussit ses quinze parcours en `452.5 s`, dont Billing en `23.7 s`; l'audit final est vide, les ports temporaires sont fermés et la stack principale conserve son admin local;
- l'intégration progresse de **14/15 à 15/15** et la tâche d'extension de la suite critique est terminée, sans clôturer les autres tâches de Phase 9.

## 3. Les quinze parcours E2E actuels

| Parcours | Frontières réelles | Frontière simulée | Documentation |
|---|---|---|---|
| Invitation coach | Chromium, UI coach et `/join`, Next.js, Supabase Auth/PostgREST/PostgreSQL, RPC et SMTP | Mailpit local reçoit le vrai message Nodemailer; aucun SMTP distant | [Invitation](./E2E_INVITATION_HARNESS.md) |
| Checkout plateforme | Chromium, `Paywall`, route Next.js, Auth/PostgREST/PostgreSQL et SDK Stripe | transport Stripe HTTP local sur `127.0.0.1:55326` | [Checkouts](./E2E_CHECKOUT_HARNESS.md) |
| Checkout coach | Chromium, relation coach/client, route, persistance client Stripe et SDK Stripe | même frontière Stripe locale, y compris Connect/destination | [Checkouts](./E2E_CHECKOUT_HARNESS.md) |
| Notification push | producteur coach, route, Auth/PostgREST/PostgreSQL, `web-push` et vrai service worker Chromium | terminaison Web Push HTTPS locale `55328`, contrôle `55329` | [Push](./E2E_PUSH_HARNESS.md) |
| Chat Athena | Chromium mobile, `ChatAI`, route, Auth/PostgREST/PostgreSQL, profil, historique et persistance | endpoint Anthropic local strict `127.0.0.1:55330/v1/messages` | [Chat](./E2E_CHAT_HARNESS.md) |
| Auth, inscription et reprise | Chromium, inscriptions client/coach, trigger profil, login, onboarding et reload de session | aucune frontière externe | stratégie canonique ci-dessus |
| Parcours coach | Chromium desktop, dashboard coach, relation active, détail client, Auth/PostgREST/RLS | aucune frontière externe | [Coach/client](./E2E_COACH_CLIENT_HARNESS.md) |
| Parcours client | Chromium mobile, dashboard client, relation, navigation et rechargement | aucune frontière externe | [Coach/client](./E2E_COACH_CLIENT_HARNESS.md) |
| Attribution du coach par défaut | Chromium, route serveur, session client, RPC et relation active idempotente | configuration `DEFAULT_COACH_EMAIL` locale | [Attribution par défaut](./DEFAULT_COACH_ASSIGNMENT.md) |
| Webhook Platform signé et rejeu | Chromium, checkout, route Platform, Supabase, claim durable et finalisation payment | signature et transport Stripe synthétiques locaux via `--stripe` | stratégie canonique ci-dessus |
| Cycle d’une séance Training | Chromium mobile, programme, brouillon, reload, finalisation, historique, progression et RLS | aucune frontière externe | stratégie canonique ci-dessus |
| Journal nutritionnel quotidien | Chromium mobile, fallback local, journal, reload, modification, suppression et RLS `daily_food_logs` | aucune frontière externe | stratégie canonique ci-dessus |
| Suivi de progression | Chromium mobile, poids, graphique, mensurations, record, reload et RLS | aucune frontière externe | stratégie canonique ci-dessus |
| Messagerie coach-client et Realtime | Deux contextes Chromium, messagerie client/coach, état non-lu/lu, reconnexion, persistance et RLS | serveur Supabase Realtime local; aucune frontière externe | stratégie canonique ci-dessus |
| Réconciliation abonnement et Billing | Chromium, Checkout Platform, webhooks signés, claims, payments, profil et réconciliation read-only | Customer, Checkout Session, Subscription et Invoice via faux Stripe local | stratégie canonique ci-dessus |

Un test n'est appelé **E2E MoovX** que si ses frontières principales — navigateur, interface, route, identité et persistance — sont réellement traversées. Intercepter `/api/*`, simuler Supabase Auth/PostgREST ou remplacer la persistance principale par un mock transforme le test en test de composant ou de route, même s'il utilise Playwright.

## 4. Gardes contre les accès distants

- Playwright valide que l'application et Supabase ciblent uniquement `127.0.0.1` ou `localhost`.
- `scripts/run-local-e2e.mjs` valide toutes les origines configurées, impose `MOOVX_E2E=1`, injecte seulement les clés locales et démarre les fournisseurs locaux.
- Le SMTP E2E est explicitement limité à `127.0.0.1:55325` et Mailpit à `55324`.
- Les transports Stripe, Push et Anthropic valident mode E2E, protocole, hôte et chemin autorisés côté serveur; le navigateur ne choisit pas leur destination.
- Les spécifications observent les origines navigateur attendues lorsque le parcours l'exige.
- Le reset et les scripts PostgreSQL refusent les URLs non locales.
- Les traces et captures Playwright sont désactivées par défaut; la suite critique les conserve uniquement après échec. Les runners expurgent jetons, cookies, clés et champs sensibles.

Ces gardes réduisent le risque mais ne constituent pas un bac à sable réseau système. Aucune clé réelle, URL hébergée ou configuration production ne doit être présente dans l'environnement de test.

## 5. Matrice minimale selon le changement

| Changement | Validation minimale |
|---|---|
| Règle métier pure | Vitest ciblé sur succès, bornes et erreurs; TypeScript; lint ciblé. |
| Route API | Tests Vitest de validation/autorisation/erreurs, identité serveur et absence de mutation avant refus; intégration ou E2E si persistance ou fournisseur critique. |
| Autorisation ou RLS | Matrice SQL avec rôles réels (`anon`, `authenticated`, service/admin si pertinent), données propres/étrangères et preuve d'absence de mutation. |
| Migration | Reconstruction depuis base vide, assertions structurelles et métier, idempotence/compatibilité, rollback ou correction vers l'avant documentée. |
| Fournisseur externe | Tests de route avec transport simulé, succès/pannes/retry/idempotence; au moins un parcours vertical via une frontière réseau locale. |
| Interface critique | Caractérisation du composant ou module, puis Playwright réel pour navigation, saisie, erreurs et persistance concernées. |
| Correctif de sécurité | Test hostile ou matrice qui échoue avant le correctif, refus avant fournisseur/mutation, tests voisins et E2E du flux critique. |
| Refactoring sans changement fonctionnel | Tests de caractérisation avant déplacement, comparaison des sorties, suite ciblée, TypeScript/lint et E2E seulement pour les frontières affectées. |

## 6. Cadence de validation

### Baseline de performance production

`npm run perf:baseline` construit exclusivement avec Webpack, démarre
`next start`, exécute trois passages client mobile et coach desktop, puis écrit
`perf/baseline/phase-8-baseline.json`. Le harnais refuse les origines navigateur
externes, exige les manifests complets, nettoie fixtures, Mailpit, processus et
port temporaire. Le protocole et les métriques sont détaillés dans la
[baseline Phase 8](./PERFORMANCE_BASELINE.md).

`npm run perf:budget:check` relit les deux artefacts sans démarrer aucun
service et applique les [budgets locaux anti-régression](./PERFORMANCE_BUDGETS.md).
Un dépassement bloquant, une métrique requise indisponible ou un artefact
invalide produit un code non nul.

`npm run perf:compare` relit exactement deux références avant et deux captures
après, valide leur protocole commun et écrit un rapport JSON déterministe sans
démarrer build, navigateur, Supabase ou réseau. Le comparateur et ses limites
sont documentés dans la
[comparaison Core Web Vitals Phase 8](./PERFORMANCE_CWV_COMPARISON.md).

Le [test de charge ciblé Phase 9](./PHASE_9_TARGETED_LOAD_TEST.md) prépare une
baseline locale de `GET /api/feedback/mine`. `npm run perf:load:targeted` refuse
toute origine distante et utilise cinq clients avec cent rapports synthétiques,
un profil borné à cinq utilisateurs virtuels, cinq requêtes par seconde et cinq
minutes, puis exige un cleanup sans résidu. Son mode `--smoke` reste limité à
deux secondes. Le protocole collecte débit, p50/p95/p99 et erreurs, mais aucun
seuil de performance définitif n'est encore fixé. Cette commande ne fait pas
partie des quality gates CI.

Le second scénario local cible le cycle réel du journal Nutrition avec
`npm run perf:load:nutrition`. Le hook et le runner appellent le même
coordinateur read-only : journal du jour, calendrier sur 30 jours et eau du
jour restent trois lectures Supabase parallèles. Le runner prépare cinq clients,
`1 240 daily_food_logs` et `40 water_intake`, puis mesure avec des sessions
utilisateur soumises aux RLS; le service-role local reste hors chrono et limité
au setup/cleanup. Son instrumentation opt-in mesure total, trois lectures et
agrégation sans journaliser de donnée sensible. `--smoke` exécute exactement une
lecture logique; le profil complet de 300 secondes n'est pas lancé par les tests
et la commande ne fait partie d'aucune Gate CI.

### À chaque modification

- test Vitest du fichier ou domaine touché;
- `npx tsc --noEmit` lorsque types ou code TypeScript changent;
- ESLint ciblé;
- `git diff --check`;
- i18n si messages ou clés changent.

Cette boucle doit rester rapide, locale et sans Docker lorsque le comportement ne dépend pas de PostgreSQL.

### Avant commit

- `npm test`;
- TypeScript et lint ciblé;
- intégration SQL ciblée si schéma, RPC, RLS ou persistance changent;
- E2E dédié si une frontière critique a changé;
- documentation et état Git vérifiés.

### Avant fusion ou déploiement

- suite unitaire complète;
- reconstruction et assertions PostgreSQL concernées;
- `npm run test:e2e:critical` pour une modification transverse de sécurité ou d'infrastructure;
- `npm run i18n:check`;
- build dans un environnement pouvant résoudre les polices externes;
- procédure de rollback et migrations vérifiées.

### Préflight de release Phase 9

La procédure canonique est décrite dans
[`RELEASE_PROCEDURE.md`](RELEASE_PROCEDURE.md). Son préflight local consomme
uniquement un fichier JSON explicitement fourni :

```bash
npm run release:preflight -- --input /chemin/local/preflight.json
```

Le contrat exige onze preuves `PASS` : tests unitaires, TypeScript, lint,
build, E2E critiques 15/15, reconstruction depuis une base vide, alignement
migrations staging, types et factories Supabase, i18n et budget performance.
Chaque preuve contient uniquement `status`, `durationMs`, `source` et
`capturedAt`; `FAIL`, `MISSING` ou `SKIPPED` impose `NO_GO`.

Le comparateur doit retourner exactement `ALIGNED`. L'état staging documenté
à 141/145 versions, avec verdict `HISTORY_AND_STRUCTURE_DRIFT`, impose donc
`NO_GO` sans lancer de remédiation. Le préflight ne charge aucun `.env`, ne
lance aucune commande, ne contacte aucun service et ne déploie rien.

Ces preuves locales et la première exécution complète de la CI ne remplacent
pas encore une attestation de stabilité : aucune mesure multi-runs du p95 ou du
flaky rate n'est encore disponible.
Un verdict technique `GO` requiert toujours une approbation humaine avant
toute action distante, et Production demeure soumise à une autorisation
séparée.

### Gates CI progressifs — première preuve complète

Le workflow `MoovX Quality Gates` introduit uniquement un premier gate rapide
sur les pull requests, les pushes vers `phase-6-staging` et les déclenchements
manuels munis d'un SHA de base explicite. Il utilise Node 24 et le lockfile npm,
puis vérifie le diff, TypeScript, les fichiers JavaScript/TypeScript modifiés
avec ESLint, la parité i18n, le contrat des factories Supabase et les contrats
documentaires rapides.

Le lint global reste non bloquant tant que sa dette historique n'est pas
résorbée; le lint différentiel refuse néanmoins toute nouvelle erreur dans les
fichiers touchés. Son premier run réel a réussi sans retry en `83 s`.

Gate B — Standard s'exécute en parallèle de Gate A et lance, dans trois étapes
mesurées séparément, la suite Vitest complète (`npm test`), le build
(`npm run build`) puis le contrôle statique des budgets performance
(`npm run perf:budget:check`). Il n'utilise ni Docker, ni Supabase local, ni
E2E. Le build reçoit uniquement une URL localhost et une clé publique
synthétique afin de compiler les consommateurs navigateur ; aucun service
Supabase n'est démarré et aucun secret serveur ou Stripe n'est fourni. Gate C —
Heavy sépare les validations locales coûteuses sur deux runners indépendants.

**Gate C1 — Database Heavy** démarre uniquement pour un push vers
`phase-6-staging` ou un déclenchement manuel. Il reconstruit la stack Supabase
canonique, vérifie deux reconstructions depuis une base vide, les types
Supabase puis les contrats RLS/PostgREST. Son cleanup `always()` contrôle les
données synthétiques, arrête la stack sans backup et refuse tout conteneur,
volume ou port local résiduel.

**Gate C2 — Browser Heavy** utilise un runner distinct avec Chromium installé
explicitement. Il exécute la suite canonique `test:e2e:critical` avec ses quinze
parcours séquentiels, un worker, aucun retry et uniquement des fournisseurs
locaux simulés. Son audit final refuse les comptes ou tables synthétiques non
nettoyés, puis un cleanup `always()` ferme Supabase et contrôle les processus,
volumes et ports réservés.

Les deux jobs Heavy sont indépendants de Gates A/B et l'un de l'autre : ils
peuvent donc s'exécuter en parallèle sur des runners isolés. Ils sont ignorés
sur les pull requests ordinaires, où seuls les contrôles Fast et Standard sont
requis. Gate C ne contacte ni staging ni Production, ne déploie rien et
n'exécute jamais `--linked`, `db push` ou `migration repair`.

La première exécution réelle des quatre gates, le run GitHub Actions
`31317128115`, est entièrement verte : Gate A, Gate B, Gate C1 et Gate C2 sont
`PASS`. Sa durée murale est de `16 min 07 s`. Gate C1 a validé la
reconstruction depuis une base vide, les types Supabase, les contrats
RLS/PostgREST et son cleanup. Gate C2 a validé les quinze parcours E2E critiques
sur quinze et son cleanup. Cette preuve démontre une exécution complète verte.
Elle ne constitue pas encore une attestation de stabilité CI.

Les objectifs restent un p95 strictement inférieur à 20 minutes et un flaky
rate strictement inférieur à 2 %. Ils nécessitent plusieurs observations
indépendantes ; ce premier run ne suffit pas à les attester.

Le [contrat statistique Phase 9](CI_STABILITY_STATISTICAL_CONTRACT.md) fixe
désormais l'échantillon à 150 runs primaires complets sur au moins 7 dates
UTC distinctes, la méthode nearest-rank, le registre append-only et le retour
automatique à `CI_STABILITY_CANDIDATE` en cas de dégradation. Il ne déclare pas
la CI stable : le registre formel démarre sans backfill spéculatif.

Le job séparé `CI Stability Observation` collecte après A/B/C1/C2 un fragment
par attempt et le conserve comme artefact 90 jours. Il est non bloquant et ne
change aucun gate. L'intégration au registre Git reste un import local explicite
et revu : le workflow ne possède aucune permission d'écriture repository et ne
commit/push jamais automatiquement.

L'inventaire vidéo exécuté par Vitest dépend de `ffprobe`. Gate B installe donc
explicitement le paquet Ubuntu `ffmpeg`, sans ImageMagick ni autre paquet
système. Cette dépendance bornée concerne uniquement Gate B ; Gate A ne réalise
aucune installation système.

Ces quatre jobs restent en observation : le seuil de 20 minutes est atteint sur
la première preuve complète, mais son p95 et le flaky rate inférieur à 2 % ne
sont pas encore attestés. Le warning de compatibilité Node 20 émis par les
actions GitHub v4 reste à qualifier séparément. Aucun accès distant, secret
fournisseur ou déploiement n'est effectué par les quality gates.

### Préflight de rollback Phase 9

Le contrat canonique est documenté dans
[`ROLLBACK_PROCEDURE.md`](ROLLBACK_PROCEDURE.md). Son préflight local s'exécute
uniquement à partir d'un JSON local explicite :

```bash
npm run rollback:preflight -- --input /chemin/local/rollback-preflight.json
```

Le module ne charge aucun `.env`, ne contient aucun client réseau et n'exécute
aucune commande. Il vérifie l'identité immuable des artefacts, la compatibilité
schéma, les approbations, les preuves, les smoke tests et l'expurgation. Pour
Preview et staging, tout verdict différent de `ALIGNED` impose `NO_GO`. Une
répétition locale isolée utilise un schéma reconstruit et peut marquer la preuve
d'alignement distant `NOT_APPLICABLE`; cette exception ne s'étend jamais à un
environnement distant.

Le préflight est mesuré séparément. Le chronomètre officiel inclut action,
attente plateforme et validations; il commence à l'approbation de
`ROLLBACK_REQUIRED` et se termine après confirmation du SHA servi, smoke tests
verts et journal minimal. Aucune capacité de sauvegarde ou PITR n'est supposée.

La répétition locale isolée s'exécute avec un fichier JSON local explicite :

```bash
npm run rollback:rehearse:local -- --input /chemin/local/rollback-rehearsal.json
```

Le runner refuse les ports des stacks principales, les URL distantes,
Production, Stripe live, `--prod` et `--linked`. Il matérialise deux artefacts
synthétiques immuables distincts dans un répertoire temporaire, confirme
l'incident, restaure l'artefact sain, vérifie le SHA servi, exécute les sept
catégories de smoke tests et nettoie systématiquement processus, port et
répertoire.

Le 6 août 2026, deux runs indépendants sur les ports `62310` et `63310` ont
réussi en `87,429 ms` et `69,295 ms`. Ils n'ont créé aucune donnée synthétique
et n'ont pas modifié la stack Supabase principale. Cette preuve est locale et
synthétique : elle ne prouve ni Preview/Production, ni restauration de
données/PITR.

Le 8 août 2026, après confirmation read-only du staging `145/145 ALIGNED`, une
répétition réelle Vercel Preview a utilisé deux deployments immuables et
distincts. Le préflight a retourné `READY_FOR_REHEARSAL / READY`. L'action de
rollback a duré `2,588 s`, l'attente et la confirmation plateforme `18,249 s`,
puis les smoke tests et le journal `156,646 s`, pour un total officiel de
`177,483 s` (`2 min 57,483 s`). L'alias final sert le SHA sain attendu, le
deployment est `READY`, les contrôles environnement, Auth, navigation,
Seedance, Realtime, Billing read-only, données et médias privés sont verts, et
zéro erreur critique `5xx` est observée. Le verdict
`ROLLBACK_REHEARSAL_VERIFIED` satisfait le seuil Phase 9 inférieur à 30
minutes, sans Production, migration ou Stripe live.

Les resets de base, E2E Chromium et tests de concurrence sont volontairement plus lents et séquentiels. Ils ne doivent pas alourdir chaque sauvegarde locale, mais restent obligatoires avant livraison lorsqu'ils couvrent le risque modifié.

## 7. Déterminisme

- Utiliser uniquement des comptes et données synthétiques, reconnaissables et supprimés en `finally`.
- Repartir d'un reset local pour les suites qui dépendent du schéma complet.
- Utiliser un worker Playwright lorsque les fixtures, ports ou limites sont partagés.
- Réserver des ports locaux dédiés : application `3210`, Supabase `55321/55322`, Mailpit `55324/55325`, Stripe `55326`, Push `55328/55329`, Anthropic `55330`.
- Arrêter Next.js et les faux fournisseurs même après échec; restaurer les fichiers temporairement ajustés.
- Attendre un état observable avec timeout borné (`expect`, polling de santé), jamais un délai arbitraire comme preuve de réussite.
- Contrôler dates, identifiants, réponses et ordre lorsque la règle dépend de l'horloge, de l'idempotence ou de la concurrence; sinon utiliser des identifiants uniques par exécution.
- Nettoyer lignes métier, profils et comptes Auth; une seconde exécution doit réussir après reset.

### Reset Supabase local canonique

`npm run supabase:local:reset` est l'unique reconstruction de référence pour Auth, PostgREST, PostgreSQL et Mailpit. Elle utilise le binaire Supabase installé dans le dépôt, démarre la pile si nécessaire, exécute `supabase db reset --no-seed`, puis applique les migrations SQL par nom de fichier en ordre lexical. Le compteur et l'ordre enregistrés sont comparés aux fichiers présents : une migration ajoutée, absente ou réordonnée fait échouer `status`, `ensure`, `verify` et les E2E tant qu'un reset n'a pas été effectué.

Le reset :

- refuse les URLs non locales et tout contexte CLI portant `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` ou `SUPABASE_DB_URL` ;
- exige Docker et les ports définis par `supabase/config.toml` (API 55321, PostgreSQL 55322, Mailpit HTTP/SMTP 55324/55325) ;
- sérialise les exécutions avec `.supabase-local-reset.lock`, supprimé même après échec ;
- applique les 149 migrations actuelles avec `ON_ERROR_STOP`, sans seed implicite ;
- exécute la baseline structurelle, les fixtures SQL puis leur nettoyage, et vérifie l'absence de comptes, profils, relations, paiements et invitations ;
- vide Mailpit et régénère `.env.e2e.local` en mode `0600`, sans afficher les clés ;
- publie une empreinte stable des relations, colonnes, contraintes, index, fonctions, policies et migrations.

Commandes :

```bash
npm run supabase:local:reset       # reconstruction destructive strictement locale
npm run supabase:local:status      # pile active + liste de migrations exacte
npm run supabase:local:verify      # contrat de migrations + assertions structurelles
npm run supabase:local:fingerprint # empreinte comparable entre deux resets
npm run test:migrations:empty-db  # deux reconstructions locales jetables indépendantes
npm run test:migrations:staging-alignment -- \
  --inventory /chemin/local/inventaire-staging.json
```

Les lanceurs E2E appellent `ensure` via `scripts/run-local-e2e.mjs`. Ils vérifient ainsi le même contrat et régénèrent l'environnement local, sans réimplémenter le reset. `tests/integration/reset-migrations.sh` reste réservé aux bases PostgreSQL locales isolées qui ne fournissent pas Auth/PostgREST/Mailpit; il ne constitue pas le reset E2E canonique.

La reproductibilité attendue est : état arrêté ou actif → même empreinte; données synthétiques contaminantes → reset → même empreinte; deuxième reset concurrent → refus immédiat. Toute empreinte différente doit être expliquée par une modification versionnée du schéma ou de la liste des migrations.

La preuve Phase 9 dédiée utilise deux `project_id`, volumes Docker, plages de
ports et répertoires temporaires distincts. Elle refuse le projet et les ports
de la stack principale, tout contexte Supabase distant et l'option `--linked`.
Chaque run part d'une stack neuve, applique les 149 migrations en ordre lexical,
compare le manifeste versionné, exécute les assertions structurelles et de
propreté, calcule l'empreinte puis supprime ses seules ressources dans un
`finally`. Les collisions historiques de préfixes date à huit chiffres restent
explicitement gérées par le manifeste de reversioning; les noms source et les
versions staging résultantes restent uniques et ordonnés.

Le comparateur d'alignement staging est un outil local pur : il reconstruit le
plan final à partir du manifeste versionné puis compare ses **145 versions** à
un inventaire JSON local explicitement fourni. Les 149 sources ne sont jamais
utilisées comme séquence distante attendue : cinq sources restent exclues par
décision opérateur et un overlay schema-only complète les 144 sources retenues.
Il détecte manque, ajout, doublon et ordre divergent sans corriger ni
normaliser l'inventaire. Le ref staging explicite est obligatoire; ref/host
Production, `--linked`, URL distante en argument et champs ressemblant à des
secrets sont refusés. L'acquisition de l'inventaire distant et toute
remédiation restent hors de cette commande et nécessitent des autorisations
séparées.

### Restauration logique locale isolée

`scripts/preproduction/restore-staging-backup-locally.mjs` diagnostique et
répète une restauration logique sans connexion distante. Il exige les cinq
artefacts SQL séparés (`roles`, `schema`, `data`, `history_schema` et
`history_data`) sous un répertoire temporaire, refuse les options et entrées
distantes, puis accepte exactement un ou deux runs. Le défaut est deux. Le mode
`--runs 1` qualifie une première restauration opérateur dans une seule stack
jetable, sans comparaison cross-run. Le mode `--runs 2` utilise deux stacks,
ports, volumes et répertoires indépendants et compare obligatoirement leurs
preuves. Zéro, plus de deux, une valeur négative, décimale ou non numérique
produit `INVALID_RUN_COUNT`.

Le contrat accepte zéro occurrence du grant officiel `cli_login_postgres`
lorsque la CLI Supabase l'a déjà omis, sans modifier le contenu. Il accepte
aussi exactement une occurrence officielle, retirée uniquement dans une copie
en mémoire parce qu'elle échoue localement avec SQLSTATE `42501`. Une occurrence
multiple ou une instruction apparentée mais non reconnue produit un blocage
expurgé. Le fichier source, les autres propriétaires et les autres permissions
restent inchangés. Le harnais refuse notamment `--no-owner` et toute
neutralisation large des `OWNER` ou `GRANT`.

Les classifications sont respectivement
`OFFICIAL_GRANT_ALREADY_OMITTED`, `OFFICIAL_GRANT_FILTERED`,
`MULTIPLE_OFFICIAL_GRANTS` et `UNRECOGNIZED_PRIVILEGE_GRANT`.

La fixture synthétique de référence vérifie données, historique, RLS, policy,
fonction `SECURITY DEFINER`, publication et propriétaires des schémas Supabase
gérés. Deux runs doivent produire des compteurs, propriétaires et fingerprints
strictement identiques, puis nettoyer toutes leurs ressources, y compris en
cas d'échec. Cette preuve locale ne remplace pas l'acquisition et la validation
d'une sauvegarde staging sous autorisation distincte.

Les deux formes de `roles.sql` sont chacune restaurées deux fois avec la
fixture synthétique. Leurs états finaux doivent être fonctionnellement
identiques. Aucun dump staging réel n'a encore été restauré sous ce contrat;
la capacité réelle reste non attestée et Preview demeure `NO_GO`.

Le mode `--runs 1` a également été validé localement pour chacune des deux
formes synthétiques; `--runs 2` conserve la preuve de reproductibilité. Aucun
nouveau dump staging réel n'a été acquis ou restauré avec ce mode borné.

Le préflight SQL du harnais est contextuel et fail-closed. Un lexer
déterministe masque commentaires, chaînes, identifiants quoted, corps
dollar-quoted et blocs de données `COPY ... FROM STDIN` en conservant les
lignes et positions. Il bloque une vraie méta-commande `psql` `\!` placée au
début d'une ligne et tout statement
top-level `COPY ... FROM/TO PROGRAM`, mais accepte ces motifs lorsqu'ils sont
uniquement documentaires. Un commentaire, une chaîne ou un dollar quote non
terminé produit `SQL_LEXING_INCOMPLETE`. Les fixtures dangereuses doivent être
refusées avant la création d'une stack; la fixture documentaire doit être
`RESTORABLE` avec `--runs 1` et reproductible avec `--runs 2`. Aucun dump
staging réel n'a encore été restauré après ce correctif; la capacité réelle
reste non attestée et Preview demeure `NO_GO`.

Le contrat `roles.sql` couvre aussi l'unique forme officielle
`GRANT SET ON PARAMETER "log_min_messages" TO "supabase_realtime_admin"`.
La reproduction locale synthétique doit obtenir `42501` sous `postgres`, puis
prouver que le rôle géré préexistant `supabase_admin` applique le privilège. Le
harnais retire ensuite seulement cette occurrence de sa copie mémoire. Zéro
occurrence est accepté; une variante ou plusieurs occurrences sont refusées.
Les tests préservent les autres permissions, le contrat `cli_login_postgres`,
`ON_ERROR_STOP`, les modes `--runs 1`/`--runs 2`, l'absence de réseau et le
cleanup succès/échec. Le backup staging réel n'est pas rejoué dans ce
sous-batch; Preview reste `NO_GO`.
La première fixture temporaire ayant atteint `inventory` omettait la table
`supabase_migrations.schema_migrations`; le comptage d'historique échouait donc
avec `42P01`. Le harnais classe désormais cette absence comme
`INVENTORY_REQUIRED_OBJECT_ABSENT` et expose, pour chaque catégorie,
`PRESENT`, `ABSENT`, `ERROR` ou `NOT_APPLICABLE`. Une permission refusée ou une
requête catalogue invalide reste `ERROR`, jamais `ABSENT`.

La fixture canonique complète doit être `RESTORABLE` en `--runs 1` et en
`--runs 2`; les deux runs doivent partager fingerprint, compteurs, owners et
statuts d'inventaire. La preuve du 7 août 2026 produit l'empreinte
`ba98812d295b81320b298a35cc650ec3`. Une fixture sans historique doit rester
bloquée. Aucune de ces preuves synthétiques n'atteste le backup staging réel;
la capacité staging reste non attestée et Preview demeure `NO_GO`.

La preuve opérateur ultérieure du 7 août 2026 a restauré deux fois, dans deux
stacks indépendantes, le même backup staging réel. Les deux runs sont
`RESTORABLE` avec un fingerprint, des compteurs et des owners identiques : la
capacité de récupération est `RECOVERY_CAPABILITY_VERIFIED`. Preview reste
néanmoins `NO_GO` tant que le plan de migrations distant n'est pas `ALIGNED`.

La première tentative de dry-run réel `141 → 145` a été stoppée avant SQL car
Supabase CLI tronque le Project ID Docker à 40 caractères. Le garde corrigé
utilise les labels exacts `com.supabase.cli.project` et
`com.docker.compose.project`, puis vérifie le conteneur DB, son port publié, le
volume monté et le répertoire temporaire. L'apparition des ressources est
pollée toutes les 250 ms pendant trois secondes au maximum; seul l'état
`ISOLATION_RESOURCE_MISSING` est retenté. Deux validations synthétiques
indépendantes ont produit `ISOLATION_RESOURCES_CONFIRMED` et un cleanup complet.
Aucun backup réel ni dry-run `141 → 145` n'a été rejoué après ce correctif.

## 8. Sécurité des tests

- Production, préproduction partagée et services hébergés sont interdits par défaut.
- Aucun secret réel, cookie, jeton, profil complet ou payload sensible dans le dépôt, les assertions, captures ou journaux.
- Toute URL distante fait échouer le test; seules les boucles locales explicitement autorisées sont acceptées.
- Stripe, SMTP, Web Push et Anthropic sont simulés à leur frontière réseau finale, sans remplacer les routes, SDK, règles d'autorisation ou écritures MoovX.
- Les jetons temporaires sont gardés en mémoire et expurgés de stdout/stderr.
- Un test avec une frontière principale mockée doit être nommé selon sa réalité : test de route, module ou composant, pas E2E.

## 9. Conventions de fichiers et de nommage

Les contrats IA utilisent en complément [`tests/fixtures/ai-golden`](../tests/fixtures/ai-golden) : manifeste typé, données synthétiques lisibles et empreintes exactes des invocations. La suite normale ne réécrit jamais ces goldens. Toute mise à jour suit la revue explicite décrite dans [la politique des golden fixtures IA](./AI_GOLDEN_FIXTURES.md).

- `tests/unit/<domaine>-<comportement>.test.ts` : Vitest; nommer le comportement ou contrat observé.
- `tests/integration/<domaine>-<sujet>.sql` : assertions PostgreSQL/RPC/RLS avec `ON_ERROR_STOP`.
- `tests/integration/<domaine>-<sujet>.sh` : orchestration locale, concurrence ou reconstruction.
- `e2e/<parcours>.spec.ts` : parcours Chromium vertical; un fichier par flux produit cohérent.
- `scripts/fake-<fournisseur>-server.mjs` : frontière réseau locale minimale et déterministe.
- `docs/E2E_<DOMAINE>_HARNESS.md` : frontières traversées, commandes, gardes, limites et résultats.

Les titres de tests décrivent résultat et contexte. Les noms « contract », « characterization », « regression » ou « hostile » sont utiles comme intention, sans changer le niveau technique du fichier.

## 10. Politique qualité

- **`todo`** : autorisé seulement pour un contrat explicite, avec dette visible et condition de réalisation. Il ne compte jamais comme test actif ni comme preuve de sortie. Les 3 `todo` actuels concernent rollback d'invitation et endpoint super-admin audité.
- **Régression** : tout bug corrigé reçoit d'abord un test qui reproduit le défaut au niveau le plus bas fiable; ajouter l'E2E seulement si la frontière verticale est en cause.
- **Hostile** : obligatoire pour rendu, URL, Markdown/HTML, identité, metadata et entrées de sécurité; inclure variantes encodées et malformées pertinentes.
- **Concurrence** : utiliser plusieurs sessions PostgreSQL et une synchronisation observable; ne pas simuler la course avec des appels purement séquentiels.
- **Intermittence** : aucun retry masquant par défaut. Isoler la cause, borner les attentes et mesurer; un test instable connu est une dette bloquante pour la confiance CI.
- **Lint historique** : ne pas élargir la dette. Le lint ciblé doit être vert; le lint global est suivi séparément jusqu'à résorption.
- **Build et polices** : le build doit réussir sans réseau de police grâce aux assets locaux vérifiés. Un import Google Fonts ou une origine CSS/font distante est une régression bloquante.

## 11. Pyramide cible réaliste

La cible n'est pas un pourcentage. Elle suit le coût et la précision :

1. Beaucoup de tests rapides autour des fonctions pures, schémas, erreurs et autorisations isolées afin de fournir un retour immédiat.
2. Des tests de composants ciblés pour les interactions complexes qui ne justifient pas un navigateur complet.
3. Des intégrations PostgreSQL/RPC/RLS pour chaque invariant de données, migration et matrice de rôles.
4. Des tests de routes avec adaptateurs fournisseurs réutilisables pour succès, panne, retry et idempotence.
5. Un petit ensemble croissant de parcours E2E verticaux à forte valeur, chacun traversant les frontières réelles et documentant précisément ce qui reste simulé.

On ajoute un test au niveau le plus bas capable de détecter fidèlement la régression, puis un niveau supérieur uniquement pour protéger une frontière ou une intégration réelle.

Pour la remédiation Seedance, le contrôle local ne déduit pas l'accès aux
lignes de `has_table_privilege` seul. Le backup staging restaure des privilèges
par défaut sur les nouvelles tables publiques, tandis que RLS sans policy ferme
les lignes à `anon` et `authenticated`. Le rapport de postconditions distingue
donc explicitement ACL, activation/forçage RLS et policies, avec des statuts
bornés `PASS`, `FAIL`, `ABSENT` et `ERROR`. Une assertion agrégée ou une attente
implicite d'absence de grant est interdite pour ce scénario.

Le diagnostic de restauration du 8 août 2026 distingue aussi le périmètre du
dump de son contenu. Une séquence locale minimale `roles.sql` puis `schema.sql`
a identifié, sans exécuter les données ni l'historique, un `CREATE TYPE` dans
le schéma géré `auth` échouant avec SQLSTATE `42501` sous `postgres`. La fixture
synthétique confirme que `auth` appartient à `supabase_admin`, que `postgres`
n'y possède pas `CREATE` et que le rôle géré peut produire l'effet attendu sans
modifier les privilèges. Cette preuve n'autorise ni un changement global de
rôle, ni un filtre de statements : un backup multi-schémas est refusé et doit
être réacquis avec le périmètre applicatif canonique. Le backup frais réel n'a
pas été rejoué intégralement et reste `NOT_RESTORABLE`; Preview reste `NO_GO`.

La prochaine preuve devra acquérir séparément les rôles, le schéma `public`,
les données `public` et les deux artefacts d'historique, puis restaurer sur une
stack dont `auth`, `storage` et `realtime` restent gérés localement. Cette
stratégie n'est pas encore validée. Les gardes doivent refuser `--no-owner`,
les filtres génériques `OWNER`/`GRANT`, toute élévation artificielle de
`postgres` et toute interprétation de l'ancienne preuve de récupération comme
validation du nouveau scope.

Le contrat de récupération structurelle Auth/Realtime est couvert par
`tests/unit/staging-structural-recovery.test.ts` et le runner pur
`scripts/preproduction/validate-staging-structural-recovery.mjs`. Il capture
des snapshots catalogues bornés, vérifie les effets exacts des migrations Auth
et Realtime, construit uniquement les compensations ciblées, puis exige que le
fingerprint après compensation égale celui d'avant migration et que les
compteurs métier soient inchangés. Toute absence, multiplicité ou divergence
d'objet bloque avant compensation.

Le 8 août 2026, deux stacks locales jetables indépendantes ont restauré le
backup applicatif public/historique à 141 versions et obtenu le même verdict
`STRUCTURAL_RECOVERY_VERIFIED`. Auth revient au fingerprint
`831357d9f4c833b383f02206a3a7a00b959bad05512e4abf737eb7fd2427cd3c`, incluant
les grants de la fonction, et Realtime
au fingerprint
`1ca743d36c0fb62675f041be3c6c4785cb20750ac2c7280c4317fe225cac068a`; les
comptes d'utilisateurs et de messages sont inchangés et le cleanup est complet.
Aucun accès distant ou nouveau dump n'a été utilisé. Cette preuve prépare la
remédiation des quatre migrations, mais ne change ni l'historique staging à
141 versions ni le statut Preview `NO_GO`.

## 12. Lacunes prioritaires

- Les fixtures partagées existent, mais plusieurs anciens E2E recréent encore leurs comptes localement et migreront progressivement.
- Matrices RLS automatisées limitées principalement aux invitations; les domaines profil, training, nutrition, messaging et billing restent incomplets.
- Les mocks Vitest Stripe, Anthropic, SMTP et Web Push sont partagés; les anciennes suites Stripe restantes migreront seulement lorsqu'elles seront modifiées.
- Une seule caractérisation de rendu React et aucune vraie suite de composants interactifs.
- Pas de commandes npm distinctes pour TypeScript ou lint ciblé; l'intégration RLS et la suite E2E critique possèdent désormais leurs commandes.
- `npm run test:e2e` reste générique et ne démarre pas toutes les frontières optionnelles; `test:e2e:critical` est le point d'entrée transverse.
- Les 15 parcours critiques cibles sont intégrés; la couverture multi-navigateurs, mobile réel et les variantes d'administration restent à construire.
- Mesure du taux de tests intermittents et build hermétique aux polices non encore disponibles.

## 13. Documents liés

- [Baseline Supabase](./SUPABASE_BASELINE_STRATEGY.md)
- [Rollback Phase 1](./PHASE_1_ROLLBACK.md)
- [Contrat invitation coach](./COACH_INVITATION_CONTRACT.md)
- [Harnais invitation](./E2E_INVITATION_HARNESS.md)
- [Harnais checkouts](./E2E_CHECKOUT_HARNESS.md)
- [Harnais push](./E2E_PUSH_HARNESS.md)
- [Harnais chat](./E2E_CHAT_HARNESS.md)
- [Harnais coach/client](./E2E_COACH_CLIENT_HARNESS.md)
- [Roadmap Codex](../ROADMAP_CODEX.md)
- [Fixtures de personas](./TEST_FIXTURES.md)
- [Mocks de fournisseurs Vitest](./TEST_PROVIDER_MOCKS.md)
- [Matrices RLS automatisées](./RLS_TEST_MATRIX.md)
- [Types Supabase canoniques](./SUPABASE_TYPES.md)
