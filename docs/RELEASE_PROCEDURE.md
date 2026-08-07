# Procédure de release MoovX

## Statut et portée

Cette procédure définit les contrôles reproductibles d'un candidat de release.
Elle ne déclenche ni déploiement, ni migration distante, ni rollback. La Phase 9
est active, mais la stabilité de la CI n'est pas encore attestée par une
configuration versionnée.

La Production est hors exécution automatique. Toute action Production exige
une autorisation séparée, une cible confirmée et un rollback disponible.

## Rôles

- **Opérateur** : prépare le candidat, exécute les gates autorisées et produit
  le journal expurgé.
- **Approbateur** : examine les preuves et autorise ou refuse l'étape suivante.
- **Responsable go/no-go** : consigne la décision finale et sa justification.
- **Autorité Production** : confirme séparément la cible, la fenêtre et
  l'autorisation Production. Aucun autre rôle ne peut déduire cette autorité.

Une même personne peut cumuler des rôles si l'organisation l'autorise, mais le
journal conserve les rôles plutôt que des identités nominatives.

## États et décisions

| État | Signification |
|---|---|
| `READY_FOR_PREVIEW` | Gates locales vertes; déploiement Preview non attesté |
| `PREVIEW_VALIDATED` | Preview et preuves fournies conformes |
| `GO` | Verdict technique favorable, encore soumis à approbation humaine |
| `NO_GO` | Une preuve obligatoire ou un invariant candidat échoue |
| `BLOCKED` | Rapport invalide, garde de sécurité ou autorité absente |
| `ROLLBACK_REQUIRED` | Une anomalie post-déploiement impose la procédure de rollback |

Le préflight retourne une décision technique `GO`, `NO_GO` ou `BLOCKED`. Un
`GO` n'est jamais une promotion automatique.

## 1. Préparer le candidat

1. Utiliser uniquement la branche `phase-6-staging` pour la validation
   actuelle.
2. Exiger un worktree propre et une divergence `0/0` avec la branche distante.
3. Figer le SHA candidat; `HEAD` doit rester identique pendant les contrôles.
4. Inventorier les commits depuis le dernier candidat validé.
5. Inventorier les migrations et vérifier le manifeste versionné.
6. Refuser toute dépendance à un `.env`, artefact, secret ou fichier local non
   versionné.

Commandes de lecture minimales :

```bash
git branch --show-current
git status --short
git log -1 --oneline --decorate
git fetch origin phase-6-staging
git rev-list --left-right --count origin/phase-6-staging...HEAD
git diff --check
```

## 2. Frontières d'environnement

| Environnement | Usage | Autorité |
|---|---|---|
| Local | Tests, build et preuves sans réseau distant | Dépôt et stacks locales |
| Preview | Validation du SHA candidat sur Vercel Preview | Scope branché `phase-6-staging` |
| Supabase staging | Inventaires read-only et opérations séparément autorisées | Projet staging explicitement vérifié |
| Production | Hors de ce préflight | Autorisation Production séparée obligatoire |

Les paramètres Preview ne sont jamais hérités implicitement par Production.
`--prod`, `VERCEL_ENV=production`, Stripe live et les références Production
imposent `BLOCKED`.

## 3. Gates locales obligatoires

Les onze preuves suivantes sont obligatoires et doivent toutes être `PASS` :

| Preuve | Commande ou autorité |
|---|---|
| `unitTests` | `npm test` |
| `typecheck` | `npx tsc --noEmit` |
| `lint` | `npm run lint` ou périmètre explicitement approuvé |
| `build` | `npm run build` |
| `criticalE2E` | `npm run test:e2e:critical` — 15/15 |
| `emptyDatabaseRebuild` | `npm run test:migrations:empty-db` |
| `migrationAlignment` | `npm run test:migrations:staging-alignment -- --inventory <fichier-local>` |
| `supabaseTypes` | `npm run supabase:types:check` |
| `supabaseFactories` | `npm run supabase:factories:check` |
| `i18n` | `npm run i18n:check` |
| `performanceBudget` | `npm run perf:budget:check` |

Le champ `source` n'est pas libre. Les identifiants correspondants sont, dans
le même ordre : `npm-test`, `tsc-noemit`, `eslint`, `next-build`,
`critical-e2e`, `empty-database-rebuild`, `staging-migration-alignment`,
`supabase-types-check`, `supabase-factories-check`, `i18n-check` et
`performance-budget-check`.

Chaque preuve contient uniquement :

```json
{
  "status": "PASS",
  "durationMs": 100,
  "source": "npm-test",
  "capturedAt": "2026-08-06T15:00:00.000Z"
}
```

Les statuts autorisés sont `PASS`, `FAIL`, `MISSING` et `SKIPPED`. Pour une
preuve obligatoire, `FAIL`, `MISSING` ou `SKIPPED` impose `NO_GO`.

Ces exécutions locales ne démontrent pas encore une CI stable. Tant qu'aucune
CI versionnée et mesurée n'existe, le rapport conserve l'avertissement
`CI_STABILITY_NOT_ATTESTED`.

## 4. Gate migrations staging

Le plan final comprend 149 sources, cinq exclusions explicites et un overlay,
soit **145 versions staging attendues**. Le comparateur reçoit uniquement un
inventaire JSON local acquis séparément avec l'autorisation appropriée.

Seul le verdict `ALIGNED` autorise la suite. Tout autre verdict impose
`NO_GO`; l'audit ne remédie jamais les divergences.

État documenté au 6 août 2026 : 141 versions observées et quatre absentes :

- `20260718150000`;
- `20260729100000`;
- `20260805100000`;
- `20260806100000`.

Le verdict actuel `HISTORY_AND_STRUCTURE_DRIFT` est donc un exemple réel de
`NO_GO`. Sa remédiation relève d'un plan et d'une autorisation distincts.

Le plan de remédiation est documenté dans
[`PHASE_9_STAGING_MIGRATION_REMEDIATION.md`](PHASE_9_STAGING_MIGRATION_REMEDIATION.md).
Il reste séparé de la release : après toute remédiation autorisée, une nouvelle
photographie read-only et un verdict exact `ALIGNED` sont obligatoires. Une
application réussie ne réactive jamais automatiquement la promotion Preview.

## 5. Préflight local pur

Préparer manuellement un JSON local conforme au contrat, sans secret ni URL
signée, puis exécuter :

```bash
npm run release:preflight -- --input /chemin/local/preflight.json
```

Le préflight :

- lit exactement un fichier local explicite;
- ne charge aucun `.env`;
- n'exécute aucune commande ni requête réseau;
- ne modifie aucun fichier;
- retourne zéro uniquement pour une décision technique `GO`;
- imprime uniquement le SHA candidat, les raisons bornées, les gates et les
  compteurs de preuves.

## 6. Gate Preview

Avant tout déploiement Preview autorisé :

- branche et SHA identiques au candidat;
- cible Vercel Preview et branche `phase-6-staging` confirmées;
- `--prod` et `VERCEL_ENV=production` absents;
- variables contrôlées par présence et scope, jamais par valeur affichée;
- Supabase staging explicitement identifié;
- Stripe test uniquement;
- aucun héritage de variable Production.

Après déploiement, exiger le statut `READY` et vérifier à nouveau le SHA. La
création du déploiement reste une action opérateur séparément autorisée.

## 7. Smoke tests Preview

Le minimum requis après un Preview autorisé couvre :

- santé et cohérence de l'environnement;
- Auth et session;
- navigation minimale client et coach;
- absence d'erreur `5xx` sur les parcours critiques;
- Billing et réconciliation en lecture seule;
- médias privés/publics et configuration Stripe test;
- aucune donnée sensible dans les réponses ou preuves.

Une anomalie critique, un SHA différent, un environnement ambigu ou un drift
migrations impose `NO_GO`.

## 8. Décision go/no-go

Le responsable go/no-go consigne :

- SHA, branche et environnement;
- résultat de chaque gate et durée;
- décision et raison obligatoire en cas de `NO_GO` ou `BLOCKED`;
- approbation humaine explicite par rôle.

Le préflight peut établir un `GO` technique ou `READY_FOR_PREVIEW`, mais ne
peut ni approuver ni promouvoir une release.

## 9. Frontière Production

Aucune commande Production n'est fournie dans cette procédure. Avant toute
autorisation future, il faudra confirmer séparément :

- la cible exacte;
- l'autorité Production;
- les variables et secrets propres à cet environnement;
- l'ordre application/migrations;
- le SHA sain de retour;
- le rollback disponible et approuvé.

Une autorisation Preview ou staging ne vaut jamais autorisation Production.

## 10. Interface rollback

Les déclencheurs comprennent : mauvais SHA/environnement, régression critique,
erreurs `5xx` persistantes, Auth indisponible, données incohérentes, webhooks
mal scopés ou média privé exposé.

Avant une release autorisée, identifier le dernier SHA sain. En cas de
déclenchement, passer à
[`ROLLBACK_PROCEDURE.md`](ROLLBACK_PROCEDURE.md), puis utiliser
[`RC1_DEPLOYMENT_ROLLBACK_RUNBOOK.md`](RC1_DEPLOYMENT_ROLLBACK_RUNBOOK.md)
pour les contrôles opérateur autorisés.
La définition et la répétition du rollback sont une tâche Phase 9 distincte;
un rollback en moins de 30 minutes n'est pas encore démontré.

Le préflight rollback est local, pur et sans réseau :

```bash
npm run rollback:preflight -- --input /chemin/local/rollback-preflight.json
```

Il ne déclenche aucune action. Le drift staging
`HISTORY_AND_STRUCTURE_DRIFT` impose `NO_GO` pour Preview. Seule une répétition
locale isolée, sur schéma reconstruit et compatible, peut rendre l'alignement
distant explicitement non applicable. Aucune capacité de sauvegarde ou PITR
n'est supposée sans attestation.

## 11. Journal de preuve expurgé

```text
Horodatage UTC :
Branche :
SHA candidat :
Environnement :
Résultats et durées des gates :
État :
Décision :
Raison :
Approbateur (rôle uniquement) :
```

Sont interdits : secrets, clés, JWT, cookies, headers d'autorisation, prompts,
payloads complets, URLs signées et données personnelles.
