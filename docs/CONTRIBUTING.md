# Contribuer à MoovX

Ce guide décrit le processus actuellement applicable au dépôt. La [roadmap](../ROADMAP_CODEX.md) reste l'autorité sur l'ordre des travaux et le [journal de session](../SESSION_LOG_CODEX.md) conserve leur état réel.

## Démarrage local

Prérequis : Git, Node.js avec npm, Docker actif et une CLI Supabase compatible avec le projet. Ne réutiliser ni URL, ni compte, ni secret de production.

```bash
npm install
npm run supabase:local:start
npm run supabase:local:reset
npm run supabase:local:verify
npm run dev:webpack
```

Les variables locales partent du contrat documenté dans `.env.example`. Les fichiers `.env`, `.env.local` et `.env.e2e.local` restent locaux et ne doivent contenir que des valeurs dédiées au développement ou aux tests. `npm run dev` est volontairement bloqué ; utiliser `npm run dev:webpack` jusqu'à résolution de la dette Turbopack documentée par le script.

Au début de chaque session : lire la roadmap, la dernière entrée du journal, puis vérifier branche, commit et `git status`. Ne jamais écraser une modification utilisateur non liée.

## Boucle de validation

Choisir les validations proportionnées au changement, puis élargir avant livraison.

| Changement | Minimum pendant le développement | Avant fusion ou déploiement |
|---|---|---|
| Règle métier pure | Vitest ciblé | `npm test`, TypeScript et ESLint ciblé |
| Route API | Tests route/service/schema ciblés | `npm test`, TypeScript, ESLint ciblé ; E2E si frontière critique |
| RLS, RPC ou autorisation | Test SQL/PostgREST concerné | `npm run test:integration:rls` et reset canonique |
| Migration Supabase | Tests SQL ciblés et types si affectés | reset, vérification/fingerprint et matrice RLS pertinente |
| Fournisseur externe | Mock Vitest à la frontière du module | faux fournisseur E2E local pour un flux critique |
| Parcours critique transversal | Parcours E2E individuel | `npm run test:e2e:critical` |
| Documentation seule | validation des liens et `git diff --check` | même périmètre, avec preuve des fichiers modifiés |

Commandes usuelles :

```bash
npm test
npx tsc --noEmit
npx eslint <fichiers-modifies>
npm run i18n:check
npm run build
npm run supabase:types:check
npm run test:integration:rls
npm run test:e2e:critical
git diff --check
```

`npm run lint` peut encore révéler une dette historique hors tranche ; le lint ciblé des fichiers modifiés reste obligatoire et toute nouvelle erreur est refusée. Le build doit être exécuté avant livraison dans un environnement réseau approprié : `next/font/google` peut le bloquer lorsque les polices externes sont inaccessibles. Un build ainsi bloqué est déclaré comme tel, jamais présenté comme vert.

Lancer un seul E2E pendant une boucle ciblée ; lancer la suite critique complète lorsqu'un changement traverse plusieurs frontières ou avant fusion/déploiement. La suite critique exécute, dans un ordre stable, invitation, checkout plateforme, checkout coach, push et chat sur Chromium local.

## Sécurité des tests et des journaux

- Aucun test ne contacte la production ou une URL distante.
- Aucun secret, e-mail, identifiant ou mot de passe réel n'entre dans une fixture.
- Les fournisseurs sont simulés à leur frontière réseau pour les E2E ; une route critique interceptée dans Playwright ne constitue pas la même preuve.
- Ne jamais journaliser `authorization`, cookie, session, clé, jeton, e-mail, body brut, URL complète, prompt/profil complet ou stack complète.
- Utiliser des données synthétiques, des identifiants contrôlés et le reset local ; nettoyer même après échec.
- Un test intermittent est une défaillance à diagnostiquer, pas un résultat à ignorer ou à relancer silencieusement jusqu'au vert.

Voir la [stratégie de tests](TESTING_STRATEGY.md), les [fixtures](TEST_FIXTURES.md) et les [mocks de fournisseurs](TEST_PROVIDER_MOCKS.md).

## Règles Supabase

- Utiliser les [factories browser/server/admin](SUPABASE_CLIENT_FACTORIES.md) et les [types générés](SUPABASE_TYPES.md) pour tout nouvel accès.
- Utiliser les [repositories](SUPABASE_REPOSITORIES.md) existants avant d'ajouter un accès direct.
- La RLS est une frontière d'autorité ; un filtre côté interface ou route ne la remplace pas.
- Ne jamais exposer `service_role` au navigateur ni le créer avant authentification et contrôle métier d'un flux utilisateur.
- Une migration est additive, versionnée et suit `expand → migrate → contract`. Ne pas modifier une ancienne migration déjà partagée.
- Après changement du schéma, régénérer les types et vérifier qu'ils concordent avec le schéma local.
- Pour une visibilité coach/client, une relation inactive ne confère aucun accès.

La [matrice RLS](RLS_TEST_MATRIX.md) documente les garanties testées et la dette restante.

## Règles API

- Une route valide l'entrée, appelle un service et mappe le résultat HTTP ; ajouter `schema.ts` lorsque l'entrée le requiert.
- Réutiliser le [contrat de réponse](API_RESPONSE_CONTRACT.md), la [taxonomie d'erreurs](API_ERROR_TAXONOMY.md) et le [helper Zod](API_VALIDATION.md).
- L'identité et l'autorisation sont établies côté serveur. Un identifiant navigateur n'est jamais une autorité suffisante.
- Conserver les formes et statuts legacy pendant une migration progressive, sauf évolution explicitement documentée et testée.
- Propager un correlation ID et utiliser les [journaux structurés expurgés](API_OBSERVABILITY.md).

Le modèle de référence et ses limites sont décrits dans la [migration des huit routes simples](API_SIMPLE_ROUTE_MIGRATION.md).

## Règles de cache

Appliquer la [stratégie de cache par domaine](CACHE_STRATEGY.md). Par défaut, données utilisateur, autorisation, Billing, quotas IA, notifications et écritures restent dynamiques ou `no-store`. Un cache partagé exige une preuve que la donnée n'est ni privée ni dépendante de l'identité, une clé complète et une invalidation documentée. Mesurer avant et après toute optimisation.

## Taille et périmètre d'une contribution

- Une seule tâche structurante et un seul domaine principal par tranche.
- Tests de caractérisation avant un refactoring sensible.
- Ne pas mélanger déplacement mécanique, changement fonctionnel et nouveau design.
- Viser environ 400 lignes modifiées ; jusqu'à 800 pour un déplacement mécanique isolé.
- Préserver les contrats publics et documenter rollback, dette ou suppression du legacy.

Une décision structurante est enregistrée selon l'[index des ADR](adr/README.md).

## Commits et Git

Utiliser un message court de type Conventional Commits cohérent avec le dépôt : `feat`, `fix`, `refactor`, `test`, `docs` ou `chore`, suivi d'un scope utile lorsque pertinent. Un commit doit rester focalisé et ne contenir que les fichiers validés.

Avant de proposer un commit :

```bash
git status --short
git diff --check
git diff --cached --check
```

Ne jamais pousser, publier, déployer ou ouvrir une PR sans demande explicite. Ne pas créer de commit lorsqu'une session demande seulement une préparation ou une recommandation de message.

## Roadmap et journal de session

Une case de la roadmap n'est cochée que lorsque sa définition de terminé et les validations de la tranche sont satisfaites. À la fin de chaque session :

1. mettre à jour le statut et les compteurs réellement concernés dans `ROADMAP_CODEX.md` ;
2. ajouter une entrée complète à `SESSION_LOG_CODEX.md` avec travail, décisions, problèmes, risques, tests, mesures, temps et une seule prochaine action ;
3. vérifier le périmètre final avec `git status` ;
4. communiquer les fichiers touchés, validations exécutées et limites restantes.

La prochaine action doit être unique, prioritaire et directement exécutable selon l'ordre de la roadmap.
