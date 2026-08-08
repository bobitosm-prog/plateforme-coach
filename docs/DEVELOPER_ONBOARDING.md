# Developer Onboarding — MoovX

## 1. Objectif

Ce guide permet à un nouveau développeur de lancer, tester et comprendre
MoovX avec la documentation versionnée. Le parcours standard est entièrement
local : aucun accès staging ou Production, aucun projet Supabase lié et aucun
fournisseur réel ne sont nécessaires.

## 2. Prérequis

Installer les outils suivants :

- Node.js et npm ; les versions supportées évoluent et `package.json` ainsi
  que son lockfile font autorité sur les dépendances du projet ;
- Docker avec un daemon actif ;
- le client PostgreSQL `psql` ;
- la CLI Supabase fournie par les dépendances du dépôt et appelée par les
  scripts npm, sans installation globale imposée ;
- Playwright et Chromium, installés avec les dépendances puis, si nécessaire,
  avec `npx playwright install chromium`.

Les versions observées sur une machine ne constituent pas un contrat. En cas
d'écart, vérifier d'abord `package.json`, `package-lock.json` et les scripts du
dépôt.

## 3. Installation

Depuis la racine du dépôt :

```bash
npm ci --legacy-peer-deps
```

Cette option est actuellement nécessaire au contrat reproductible sous npm 11
à cause d'une dette de peer dependencies documentée. Ne pas régénérer le
lockfile pour contourner un conflit d'installation.

## 4. Configuration locale

`.env.example` inventorie les noms de variables et leurs catégories ; ne
jamais y écrire de valeur réelle. Créer un `.env.local` non versionné pour
l'application locale.

Le minimum local est constitué des URL et clés **locales** Supabase générées
par la stack ainsi que de `NEXT_PUBLIC_APP_URL` et `NEXT_PUBLIC_SITE_URL`
pointant vers `http://127.0.0.1:3000`. Les clés Anthropic, Gemini, Seedance,
Stripe et Push sont optionnelles pour le développement ordinaire : utiliser
les faux fournisseurs des tests, jamais une clé réelle par défaut.

`.env.e2e.local` est généré en permissions restreintes par le harnais Supabase
et est réservé aux E2E. Il ne remplace pas `.env.local` et ne doit pas servir
de compte développeur. Les variables opérateur, staging et Production restent
hors du parcours d'onboarding et exigent une autorisation séparée.

Ne jamais partager ou committer un fichier `.env`, une clé `service_role`, un
cookie, un jeton, une URL signée ou une chaîne de connexion.

## 5. Démarrer Supabase local

Docker doit être actif et les ports locaux du projet libres. Utiliser
uniquement les scripts du dépôt :

```bash
npm run supabase:local:start
npm run supabase:local:status
npm run supabase:local:reset
npm run supabase:local:verify
```

Le reset supprime les données de la stack locale ciblée, rejoue les migrations
canoniques puis vérifie le schéma. Vérifier la cible avant de l'exécuter. Les
commandes avec `--linked` sont interdites dans ce parcours, tout comme
`supabase db push`.

Mailpit est exposé localement sur <http://127.0.0.1:55324>. La base PostgreSQL
locale écoute sur `127.0.0.1:55322` et l'API Supabase sur
`127.0.0.1:55321`. Pour arrêter la stack :

```bash
npm run supabase:local:stop
```

## 6. Démarrer l'application

Lancer le serveur Next.js avec le contrat actuel :

```bash
npm run dev:webpack
```

Le script court `dev` est volontairement bloqué tant que la dette Turbopack
locale demeure. Vérifier ensuite les deux routes de fumée :

- <http://127.0.0.1:3000/login>
- <http://127.0.0.1:3000/fr/landing>

## 7. Premier compte local

Après un reset canonique, aucun compte développeur persistant n'est garanti.
Créer un client ou un coach depuis l'interface locale d'inscription, puis se
connecter par `/login`. Les confirmations Auth sont désactivées dans la
configuration locale actuelle ; lorsqu'un flux envoie une invitation ou un
e-mail, l'inspecter dans Mailpit.

Les personas et fixtures E2E décrits dans [TEST_FIXTURES.md](TEST_FIXTURES.md)
sont synthétiques, éphémères et nettoyés après test. Ils ne sont pas des
comptes de développement. Aucun identifiant admin ou mot de passe partagé
n'est défini par ce guide.

## 8. Carte minimale du dépôt

| Zone | Rôle |
|---|---|
| `app/` | App Router, pages, composants et routes HTTP |
| `lib/` | services, repositories, politiques et adaptateurs |
| `supabase/` | configuration locale et migrations PostgreSQL |
| `scripts/` | garde-fous et orchestrateurs locaux/préproduction |
| `tests/` | tests Vitest, fixtures et intégration SQL |
| `e2e/` | parcours Playwright locaux |
| `docs/` | contrats, procédures et décisions d'architecture |

## 9. Architecture en 5 minutes

Next.js App Router porte l'interface et les routes serveur. Supabase fournit
Auth, PostgreSQL, Storage et Realtime ; la RLS reste la frontière d'autorité
des données. Le code métier privilégie services et repositories plutôt que les
accès directs dispersés. Billing isole Stripe derrière ses ports et webhooks.
Les E2E utilisent Supabase réel local et des faux fournisseurs limités à la
boucle locale.

Lire ensuite l'[index des ADR](adr/README.md), notamment les frontières E2E,
Supabase, API, Billing, médias et Nutrition. Les cartes de domaines détaillées
restent une tâche Phase 9 distincte.

## 10. Commandes utiles

```bash
# développement et contrôles statiques
npm run dev:webpack
npx tsc --noEmit
npm run lint
npm run i18n:check

# tests rapides et complets
npm test -- tests/unit/<fichier>.test.ts
npm test
npm run test:e2e:critical

# Supabase, types et factories
npm run supabase:local:status
npm run supabase:local:verify
npm run supabase:types:generate
npm run supabase:types:check
npm run supabase:factories:check
npm run test:integration:rls

# performance
npm run perf:baseline
npm run perf:budget:check
npm run perf:compare
```

`npx tsc` et les commandes Playwright utilisent les binaires locaux. Pour
ESLint, préférer `npx eslint <fichiers-touchés>` pendant la boucle courte ; le
lint global peut encore exposer une dette historique documentée.

## 11. Tests

Commencer par le test le plus proche du changement, puis élargir selon le
risque. Un changement transversal ou une frontière critique exige la suite
appropriée ; la suite canonique `npm run test:e2e:critical` exécute 15 parcours
avec Chromium, Next.js et Supabase locaux, sans fournisseur réel.

La [stratégie de tests](TESTING_STRATEGY.md) décrit les niveaux, commandes et
preuves attendues. Le [contrat des fixtures](TEST_FIXTURES.md) décrit leur
isolation et leur nettoyage. Un test intermittent doit être diagnostiqué, pas
masqué par des relances jusqu'au vert.

## 12. Migrations / Supabase / RLS

Une migration partagée reste versionnée : ne jamais la réécrire. Ajouter une
migration additive ou compensatoire, idempotente lorsque le contrat le permet,
puis valider reset, types et matrices concernées. La RLS est obligatoire sur
les tables sensibles et un filtre UI ne la remplace jamais.

La clé `service_role` reste côté serveur, après authentification et contrôle
métier, ou dans les harnais locaux explicitement bornés. Après une évolution
de schéma, utiliser `supabase:types:generate`, puis
`supabase:types:check`. Références : [types Supabase](SUPABASE_TYPES.md),
[factories](SUPABASE_CLIENT_FACTORIES.md), [matrice RLS](RLS_TEST_MATRIX.md)
et [stratégie de baseline](SUPABASE_BASELINE_STRATEGY.md).

## 13. Git et revue

Suivre le [guide de contribution](CONTRIBUTING.md) et la
[checklist de revue](CODE_REVIEW_CHECKLIST.md) : périmètre minimal, aucun
secret, validations proportionnées au risque, self-review obligatoire et
revue indépendante. Toute case `N/A` est justifiée. Préserver les changements
utilisateur non liés et produire des commits isolés, faciles à bisecter.

## 14. Release et rollback

La [procédure de release](RELEASE_PROCEDURE.md) et la
[procédure de rollback](ROLLBACK_PROCEDURE.md) sont réservées aux opérateurs,
avec artefacts immuables, gates et autorisations explicites. Les lire pour
comprendre l'exploitation ; ne jamais déduire du développement local une
autorisation Preview, staging ou Production.

## 15. Troubleshooting

- **Le démarrage court est refusé** : utiliser `npm run dev:webpack`.
- **Docker est arrêté** : démarrer le daemon avant la stack Supabase.
- **Un port Supabase est occupé** : inspecter la stack locale existante avec
  `npm run supabase:local:status`; ne pas tuer un processus inconnu.
- **`psql` est introuvable** : installer le client PostgreSQL et vérifier le
  `PATH`.
- **Chromium manque** : exécuter `npx playwright install chromium`.
- **Le schéma local est incohérent** : après avoir confirmé la cible locale,
  lancer `npm run supabase:local:reset`; cette commande efface ses données.
- **La CLI Supabase signale télémétrie ou permissions** : le script utilise la
  CLI du dépôt ; ne pas contourner la garde avec un contexte lié ou distant.
- **Le build tente de charger une police distante** : les polices sont locales
  via `next/font/local`; traiter l'appel réseau comme une régression.

## 16. Checklist premier jour

- [ ] Lire ce guide, `CONTRIBUTING.md` et l'index des ADR.
- [ ] Installer les dépendances avec le lockfile sans le modifier.
- [ ] Vérifier Docker, `psql`, la CLI Supabase locale et Chromium.
- [ ] Créer `.env.local` avec uniquement des valeurs locales.
- [ ] Démarrer puis vérifier la stack Supabase locale.
- [ ] Lancer l'application avec Webpack et ouvrir `/login` puis `/fr/landing`.
- [ ] Créer un compte local par l'interface, sans réutiliser une fixture E2E.
- [ ] Exécuter un test unitaire ciblé, TypeScript et ESLint ciblé.
- [ ] Comprendre la frontière RLS et l'interdiction d'exposer `service_role`.
- [ ] Lire les procédures release/rollback sans les exécuter.
- [ ] Effectuer une self-review avant toute proposition de commit.
