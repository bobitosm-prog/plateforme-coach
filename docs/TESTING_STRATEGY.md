# Stratégie de tests MoovX

> État mesuré le 12 juillet 2026 après ajout des fixtures partagées et du reset Supabase local canonique de Phase 2. Cette stratégie décrit le dépôt réel puis la cible. Aucun test ne doit contacter la production.

## 1. Pyramide réelle et vocabulaire

Un **niveau technique** indique quelles couches et quels processus sont exécutés. « Contrat », « caractérisation », « régression », « hostile » ou « concurrence » indiquent le **but** d'un test, pas un niveau supplémentaire : un test de contrat peut être unitaire, PostgreSQL ou E2E selon les frontières qu'il traverse.

| Niveau technique actuel | Outil et emplacement | Mesure actuelle | Ce qui est réellement exécuté |
|---|---|---:|---|
| Tests unitaires et de modules | Vitest, `tests/unit/**/*.test.ts` | 29 fichiers, 382 actifs, 3 `todo` | Fonctions pures, validation, autorisation isolée, modules serveur, contrats statiques et routes chargées avec dépendances simulées. |
| Test de rendu React | Vitest + `renderToStaticMarkup`, `chat-markdown-renderer.test.ts` | 1 fichier inclus dans les 25 | Rendu serveur de `ChatMarkdown`; pas de navigateur, d'événement DOM ou de suite de composants interactive. |
| Intégration PostgreSQL/RPC | `tests/integration` | 8 fichiers; 49 appels `test.assert`, 12 `ASSERT` SQL, 1 scénario de concurrence | Migrations sur base vide, personas, schéma, droits, RLS, RPC, rollback transactionnel, claims Stripe et concurrence invitation. |
| E2E Chromium | Playwright, `e2e/*.spec.ts` | 5 fichiers, 7 cas techniques, 5 parcours produit | Chromium, Next.js et Supabase Auth/PostgREST/PostgreSQL locaux; fournisseurs simulés seulement à leur frontière réseau. |
| Vérifications statiques | TypeScript, ESLint, i18n, build | commandes séparées | Contrats TypeScript, règles ESLint, parité des traductions et compilation Next.js. |

Les 382 tests Vitest comprennent donc des objectifs différents : tests purs, caractérisation du comportement existant, contrats de sécurité, tests hostiles et tests de routes. Leur présence sous `tests/unit` décrit le runner et l'isolation technique, pas nécessairement la nature métier.

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
npm run test:e2e:invitation
npm run test:e2e:checkout
npm run test:e2e:coach-checkout
npm run test:e2e:push
npm run test:e2e:chat
```

`npm run test:e2e` lance toutes les spécifications, mais sans démarrer automatiquement toutes les frontières fournisseurs optionnelles. Tant que le runner n'orchestre pas Stripe, Push et Anthropic ensemble, utiliser les cinq commandes dédiées pour la validation complète.

### Vérifications de livraison

```bash
npx tsc --noEmit
npx eslint <fichiers-touchés>
npm run i18n:check
npm run build
git diff --check
```

Le build peut nécessiter un environnement réseau approprié car `app/layout.tsx` utilise `next/font/google`. Une panne de téléchargement de police doit être déclarée comme blocage d'environnement, jamais présentée comme un build vert. La cible Phase 8 est d'auto-héberger les polices nécessaires.

## 3. Les cinq parcours E2E actuels

| Parcours | Frontières réelles | Frontière simulée | Documentation |
|---|---|---|---|
| Invitation coach | Chromium, UI coach et `/join`, Next.js, Supabase Auth/PostgREST/PostgreSQL, RPC et SMTP | Mailpit local reçoit le vrai message Nodemailer; aucun SMTP distant | [Invitation](./E2E_INVITATION_HARNESS.md) |
| Checkout plateforme | Chromium, `Paywall`, route Next.js, Auth/PostgREST/PostgreSQL et SDK Stripe | transport Stripe HTTP local sur `127.0.0.1:55326` | [Checkouts](./E2E_CHECKOUT_HARNESS.md) |
| Checkout coach | Chromium, relation coach/client, route, persistance client Stripe et SDK Stripe | même frontière Stripe locale, y compris Connect/destination | [Checkouts](./E2E_CHECKOUT_HARNESS.md) |
| Notification push | producteur coach, route, Auth/PostgREST/PostgreSQL, `web-push` et vrai service worker Chromium | terminaison Web Push HTTPS locale `55328`, contrôle `55329` | [Push](./E2E_PUSH_HARNESS.md) |
| Chat Athena | Chromium mobile, `ChatAI`, route, Auth/PostgREST/PostgreSQL, profil, historique et persistance | endpoint Anthropic local strict `127.0.0.1:55330/v1/messages` | [Chat](./E2E_CHAT_HARNESS.md) |

Un test n'est appelé **E2E MoovX** que si ses frontières principales — navigateur, interface, route, identité et persistance — sont réellement traversées. Intercepter `/api/*`, simuler Supabase Auth/PostgREST ou remplacer la persistance principale par un mock transforme le test en test de composant ou de route, même s'il utilise Playwright.

## 4. Gardes contre les accès distants

- Playwright valide que l'application et Supabase ciblent uniquement `127.0.0.1` ou `localhost`.
- `scripts/run-local-e2e.mjs` valide toutes les origines configurées, impose `MOOVX_E2E=1`, injecte seulement les clés locales et démarre les fournisseurs locaux.
- Le SMTP E2E est explicitement limité à `127.0.0.1:55325` et Mailpit à `55324`.
- Les transports Stripe, Push et Anthropic valident mode E2E, protocole, hôte et chemin autorisés côté serveur; le navigateur ne choisit pas leur destination.
- Les spécifications observent les origines navigateur attendues lorsque le parcours l'exige.
- Le reset et les scripts PostgreSQL refusent les URLs non locales.
- Les traces et captures Playwright sont désactivées; le runner expurge les chaînes assimilables à des jetons.

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
- cinq E2E dédiés pour une modification transverse de sécurité ou d'infrastructure;
- `npm run i18n:check`;
- build dans un environnement pouvant résoudre les polices externes;
- procédure de rollback et migrations vérifiées.

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
- applique les 135 migrations actuelles avec `ON_ERROR_STOP`, sans seed implicite ;
- exécute la baseline structurelle, les fixtures SQL puis leur nettoyage, et vérifie l'absence de comptes, profils, relations, paiements et invitations ;
- vide Mailpit et régénère `.env.e2e.local` en mode `0600`, sans afficher les clés ;
- publie une empreinte stable des relations, colonnes, contraintes, index, fonctions, policies et migrations.

Commandes :

```bash
npm run supabase:local:reset       # reconstruction destructive strictement locale
npm run supabase:local:status      # pile active + liste de migrations exacte
npm run supabase:local:verify      # contrat de migrations + assertions structurelles
npm run supabase:local:fingerprint # empreinte comparable entre deux resets
```

Les lanceurs E2E appellent `ensure` via `scripts/run-local-e2e.mjs`. Ils vérifient ainsi le même contrat et régénèrent l'environnement local, sans réimplémenter le reset. `tests/integration/reset-migrations.sh` reste réservé aux bases PostgreSQL locales isolées qui ne fournissent pas Auth/PostgREST/Mailpit; il ne constitue pas le reset E2E canonique.

La reproductibilité attendue est : état arrêté ou actif → même empreinte; données synthétiques contaminantes → reset → même empreinte; deuxième reset concurrent → refus immédiat. Toute empreinte différente doit être expliquée par une modification versionnée du schéma ou de la liste des migrations.

## 8. Sécurité des tests

- Production, préproduction partagée et services hébergés sont interdits par défaut.
- Aucun secret réel, cookie, jeton, profil complet ou payload sensible dans le dépôt, les assertions, captures ou journaux.
- Toute URL distante fait échouer le test; seules les boucles locales explicitement autorisées sont acceptées.
- Stripe, SMTP, Web Push et Anthropic sont simulés à leur frontière réseau finale, sans remplacer les routes, SDK, règles d'autorisation ou écritures MoovX.
- Les jetons temporaires sont gardés en mémoire et expurgés de stdout/stderr.
- Un test avec une frontière principale mockée doit être nommé selon sa réalité : test de route, module ou composant, pas E2E.

## 9. Conventions de fichiers et de nommage

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
- **Build et polices** : un échec réseau de `next/font/google` est enregistré comme limite d'environnement. Le build doit être rejoué dans un environnement réseau approprié avant fusion/déploiement.

## 11. Pyramide cible réaliste

La cible n'est pas un pourcentage. Elle suit le coût et la précision :

1. Beaucoup de tests rapides autour des fonctions pures, schémas, erreurs et autorisations isolées afin de fournir un retour immédiat.
2. Des tests de composants ciblés pour les interactions complexes qui ne justifient pas un navigateur complet.
3. Des intégrations PostgreSQL/RPC/RLS pour chaque invariant de données, migration et matrice de rôles.
4. Des tests de routes avec adaptateurs fournisseurs réutilisables pour succès, panne, retry et idempotence.
5. Un petit ensemble croissant de parcours E2E verticaux à forte valeur, chacun traversant les frontières réelles et documentant précisément ce qui reste simulé.

On ajoute un test au niveau le plus bas capable de détecter fidèlement la régression, puis un niveau supérieur uniquement pour protéger une frontière ou une intégration réelle.

## 12. Lacunes prioritaires

- Les fixtures partagées existent, mais plusieurs anciens E2E recréent encore leurs comptes localement et migreront progressivement.
- Matrices RLS automatisées limitées principalement aux invitations; les domaines profil, training, nutrition, messaging et billing restent incomplets.
- Les mocks Vitest Stripe, Anthropic, SMTP et Web Push sont partagés; les anciennes suites Stripe restantes migreront seulement lorsqu'elles seront modifiées.
- Une seule caractérisation de rendu React et aucune vraie suite de composants interactifs.
- Pas de commandes npm distinctes pour intégration PostgreSQL, E2E complet orchestré, TypeScript ou lint ciblé.
- `npm run test:e2e` ne démarre pas simultanément toutes les frontières optionnelles.
- Parcours critiques encore absents : séance/reprise mobile, nutrition, messaging/realtime, onboarding, abonnement/webhook complet et administration.
- Mesure du taux de tests intermittents et build hermétique aux polices non encore disponibles.

## 13. Documents liés

- [Baseline Supabase](./SUPABASE_BASELINE_STRATEGY.md)
- [Rollback Phase 1](./PHASE_1_ROLLBACK.md)
- [Contrat invitation coach](./COACH_INVITATION_CONTRACT.md)
- [Harnais invitation](./E2E_INVITATION_HARNESS.md)
- [Harnais checkouts](./E2E_CHECKOUT_HARNESS.md)
- [Harnais push](./E2E_PUSH_HARNESS.md)
- [Harnais chat](./E2E_CHAT_HARNESS.md)
- [Roadmap Codex](../ROADMAP_CODEX.md)
- [Fixtures de personas](./TEST_FIXTURES.md)
- [Mocks de fournisseurs Vitest](./TEST_PROVIDER_MOCKS.md)
- [Matrices RLS automatisées](./RLS_TEST_MATRIX.md)
