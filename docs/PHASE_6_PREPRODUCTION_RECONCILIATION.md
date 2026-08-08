# Phase 6 — préproduction et réconciliation

## Verdict

**Statut : `blocked`.**

Le projet Supabase isolé `moovx-staging` existe désormais, le dépôt est lié,
mais aucun schéma n'y a été appliqué. L'inventaire CLI
authentifié confirme le ref `cycbnnojcymjnaqomlyj`, l'organisation
`mlasmyrpaaqnhuuhuzma`, la région `eu-central-2` et l'état
`ACTIVE_HEALTHY`. Le ref production `njlzossopgknanhkzcbk` reste explicitement
interdit. Aucune réconciliation distante n'a donc encore été exécutée et
aucune preuve de sortie n'est fabriquée.

Un second écart de périmètre est déterminant :

- la Phase 6 de [`ROADMAP_CODEX.md`](../ROADMAP_CODEX.md) est le domaine
  **Billing et subscriptions** ;
- son critère de sortie exige une réconciliation **Stripe/base** sans
  divergence en préproduction ;
- la demande analysée décrit une réconciliation **Nutrition** entre sources
  legacy et frontières canoniques.

Une preuve Nutrition, même parfaite, ne peut pas satisfaire à elle seule le
critère Billing de Phase 6. Elle reste utile comme contrôle distinct, mais ne
doit pas faire passer la Phase 6 à `met`.

## Environnements réellement identifiés

Les fichiers d'environnement sont ignorés par Git. Seuls les noms de
variables, les identifiants non sensibles et les classes de clés ont été
inspectés. Aucun secret n'a été affiché ou archivé.

| Environnement | Identifiant non sensible | État | Production ? | Représentativité | Décision |
|---|---|---|---|---|---|
| Supabase distant configuré | projet `njlzossopgknanhkzcbk` | credentials présents dans `.env`/`.env.local` | **oui** : `VERCEL_ENV=production`, application `app.moovx.ch`, clés Stripe `live` | données runtime réelles, mais production | exclu ; aucune lecture métier exécutée |
| Vercel lié | projet `plateforme-coach`, `prj_WI7LdZkzqU2SlXUCPCfBaASO52NJ` | lien local présent | cible locale déclarée `production` | aucune branche preview isolée ni source de données preview identifiée | non exploitable |
| fichier Vercel temporaire | même host Supabase et mêmes classes de clés live | présent | oui ou indifférenciable de la production | aucune isolation démontrée | exclu |
| Supabase local canonique | `plateforme-coach`, API `127.0.0.1:55321`, PostgreSQL `127.0.0.1:55322` | sain, contrat de migrations courant | non | schéma historique local et données synthétiques/incomplètes | contrôle local seulement, pas préproduction |
| projet Supabase staging | `moovx-staging`, ref `cycbnnojcymjnaqomlyj`, organisation `mlasmyrpaaqnhuuhuzma` | `ACTIVE_HEALTHY`, Free/Nano, `eu-central-2`; lié | non | historique distant vide, aucun schéma/seed MoovX appliqué | plan bloqué par 17 collisions de versions et une migration de données de référence |
| snapshot anonymisé restauré | aucun fichier, manifeste ou empreinte | absent | non | aucune | indisponible |

La commande locale `supabase:local:status` a actualisé automatiquement
`supabase/.temp/cli-latest`. Le fichier n'a pas été inspecté et a été restauré
immédiatement à sa version HEAD. Il ne conserve aucun diff et reste hors
périmètre du chantier.

## Mesure read-only de l'environnement local

La seule base non-production disponible a été mesurée dans une transaction
`BEGIN READ ONLY`. Aucun identifiant ni contenu de ligne n'a été affiché.

| Source | Lignes | Owners distincts ou profils ciblés |
|---|---:|---:|
| `meal_plans` | 0 | 0 |
| `client_meal_plans` | 0 | 0 |
| `saved_meals` | 0 | 0 |
| `daily_food_logs` | 9 | 9 |
| `meal_tracking` | 0 | 0 |
| `profiles` | 61 | 36 avec au moins un objectif Nutrition |

Cette base ne peut pas satisfaire le critère « nombre d'éléments contrôlés non
nul » pour les plans personnels, plans coach, repas sauvegardés et tracking.
Elle ne représente pas non plus le schéma runtime :

- local : `meal_plans.plan/active`; runtime observé :
  `plan_data/is_active` et colonnes de totaux ;
- local : `meal_tracking.completed`; runtime observé : `is_completed`;
- les types et migrations locaux restent en retard sur plusieurs projections
  déployées déjà documentées.

Un succès local aurait donc comparé un contrat différent et ne constituerait
pas une preuve de préproduction.

## Inventaire des outils existants

### Nutrition

Le dépôt contient les briques pures et leurs tests :

- repositories Nutrition ;
- `NutritionPlanEnvelopeV1` et adaptateurs legacy ;
- `createActivePersonalMealPlanReader` ;
- `createClientDetailAssignedPlanReader` ;
- readers de repas sauvegardés et snapshot v1 ;
- agrégateurs Home, Analytics, desktop, diagnostic et coach ;
- resolvers d'objectifs ;
- douze fixtures de concordance et fixtures d'enveloppe/producteurs.

Il ne contient cependant :

- aucun runner de réconciliation Nutrition multi-owner ;
- aucun format de rapport Nutrition archivable ;
- aucun manifeste de préproduction ;
- aucun snapshot de données anonymisées ;
- aucune commande qui compare les mêmes lignes legacy et canoniques sur un
  environnement distant.

Les tests existants prouvent les contrats sur fixtures synthétiques. Ils ne
prouvent ni le volume, ni le schéma, ni les données d'une préproduction.

### Billing, Phase 6 officielle

[`lib/billing/reconciliation`](../lib/billing/reconciliation) fournit un
service read-only :

- trois lectures Supabase parallèles ;
- uniquement des opérations Stripe `retrieve*`/`list*` ;
- erreurs de base levées, jamais transformées en snapshot vide ;
- indisponibilité Stripe signalée par `partial: true` ;
- références d'entités hachées ;
- limites 1–500 lignes et 1–500 issues ;
- aucun port de mutation, route publique ou commande admin.

Il manque encore le runner serveur authentifié, la cible staging, les
credentials Stripe test associés et l'archive d'un rapport réel. Le service
ne peut donc pas être exécuté en préproduction depuis le dépôt seul.

### Outils Supabase locaux

`npm run supabase:local:*` refuse toute URL non locale et les variables
`SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` ou `SUPABASE_DB_URL`. Ces
gardes empêchent de transformer accidentellement un reset local en opération
distante. Elles ne savent ni restaurer un snapshot anonymisé représentatif, ni
exécuter une réconciliation hébergée.

## Audit de sécurité des outils

| Risque | Résultat |
|---|---|
| production ciblée par défaut | aucun runner de réconciliation exécutable ; les scripts locaux refusent le distant |
| écriture sans confirmation | aucune mutation dans le service Billing ; aucun runner Nutrition |
| secret exposé | rapports Billing expurgés ; aucun secret affiché pendant l'audit |
| erreur transformée en succès | repository Billing lève les erreurs ; Stripe indisponible rend le rapport partiel |
| lignes divergentes ignorées | bornes et troncature sont explicites ; aucun rapport Nutrition n'existe encore |
| exceptions historiques trop larges | fixtures 600/500 et 0/18 protégées par nom, valeurs, statut et SHA ; aucune allowlist runtime n'existe |
| inconnue transformée en zéro | frontières Nutrition ciblées couvertes par leurs tests ; aucune exécution de données distante |
| owner mélangé | readers owner-scoped existants ; aucun orchestrateur multi-owner de preuve |

## Architecture d'isolation proposée

```text
branche Git phase-6-staging
  → Vercel Preview, variables limitées à cette branche
      → Supabase moovx-staging, projet et base distincts
      → Stripe sandbox/test, customers/subscriptions/Connect distincts
      → webhooks test vers l'URL Preview

opérateur autorisé
  → garde anti-production fail-closed
  → migration + seed synthétique staging
  → runner Billing read-only
  → runner Nutrition read-only
  → rapports expurgés + empreintes
  → nettoyage du namespace de seed ou suppression autorisée des ressources
```

### Frontières obligatoires

| Frontière | Garantie |
|---|---|
| Supabase | projet ref différent de `njlzossopgknanhkzcbk`; aucune branche `--with-data`; aucun bucket, base ou secret production |
| Vercel | Preview liée uniquement à la branche `phase-6-staging`; aucune variable héritée implicitement de Production |
| Stripe | sandbox ou test mode; clés `sk_test_*`/`pk_test_*`; objets et webhooks `livemode=false`; aucun compte Connect live |
| secrets | valeurs dans un secret store ou fichiers `0600` hors dépôt; seuls les noms et classes sont documentés |
| runners | credentials read-only séparés des credentials de seed; aucun port `insert/update/upsert/delete/rpc` |
| rapports | références hachées, volumes et codes; aucun e-mail, UUID brut, payload alimentaire, token ou URL signée |
| arrêt | variable manquante, cible inconnue, host/ref interdit, clé live, rapport partiel/tronqué ou famille vide provoque un échec non nul |

Le garde préalable doit comparer les valeurs effectives, pas seulement leur
nom. Il refuse au minimum :

- project ref de production ;
- hosts `app.moovx.ch`, `moovx.ch` et
  `njlzossopgknanhkzcbk.supabase.co`;
- `VERCEL_ENV=production` ou déploiement `--prod`;
- clé Stripe contenant `_live_`;
- webhook Stripe avec `livemode=true`;
- URL locale en tant que preuve hébergée ;
- fallback vers `.env`, `.env.local` ou `.env.vercel.tmp`;
- absence du manifeste signé/empreinté de staging.

## Ressources à créer

Chaque création ou configuration ci-dessous nécessite une autorisation
explicite :

1. un projet Supabase `moovx-staging` dans une région européenne compatible ;
2. une branche Preview Vercel `phase-6-staging` sur le projet existant, sans
   domaine production ;
3. un sandbox Stripe, ou le mode test isolé, avec deux customers, trois
   subscriptions, un compte Connect test complet et un endpoint webhook test ;
4. un rôle SQL de seed temporaire et un rôle de réconciliation `SELECT` seul ;
5. un namespace de données déterministes ;
6. un stockage sécurisé hors Git pour les secrets et rapports bruts ;
7. une archive expurgée versionnable avec empreinte SHA-256.

L'organisation `mlasmyrpaaqnhuuhuzma` est confirmée `free` par le Management
API. Elle contient `CoachPlatform` (`ACTIVE_HEALTHY`, production interdite) et
`MyPulse` (`INACTIVE`). Un Nano est fonctionnellement suffisant : la Phase 6
n'impose aucun débit ou test de charge, et ses quotas Postgres/Auth/Storage/
Functions dépassent largement le seed déterministe. La
[tarification Supabase](https://supabase.com/pricing) annonce Nano à `0 USD`
et deux projets Free actifs, mais le compteur de slot restant n'est pas exposé
par la CLI/API. Le dialogue Dashboard doit encore confirmer explicitement
`0 USD`, aucun upgrade et que `MyPulse` ne consomme pas le slot actif.
Vercel Preview consomme les quotas du plan Vercel courant. Stripe test/sandbox
ne déplace pas d'argent réel, mais exige Stripe CLI et la configuration
Connect test. Dépendances opérateur : Node.js, `psql`, Supabase CLI, Vercel
CLI, Stripe CLI et un secret store.

## Variables nécessaires

Aucune valeur ne doit être ajoutée au dépôt.

### Contrôle et manifeste

- `MOOVX_ENVIRONMENT`
- `MOOVX_STAGING_MANIFEST`
- `MOOVX_PRODUCTION_SUPABASE_PROJECT_REF`
- `MOOVX_PRODUCTION_APP_HOST`
- `MOOVX_REPORT_HASH_SALT`
- `MOOVX_REPORT_OUTPUT_DIR`

### Supabase staging

- `SUPABASE_STAGING_PROJECT_REF`
- `SUPABASE_STAGING_DB_PASSWORD`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_STAGING_DB_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MOOVX_RECONCILIATION_DB_URL`

`SUPABASE_SERVICE_ROLE_KEY` est réservé aux routes serveur staging et au seed
autorisé. Les runners de preuve doivent utiliser
`MOOVX_RECONCILIATION_DB_URL`, associé à un rôle SQL `SELECT` seul.

### Vercel Preview

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `MOOVX_PREVIEW_DEPLOYMENT`
- `MOOVX_STAGING_ALIAS`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- les identifiants de prix Stripe test déjà requis par l'application

### Stripe test

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_PRICE_CLIENT_MONTHLY`
- `NEXT_PUBLIC_PRICE_CLIENT_YEARLY`
- `NEXT_PUBLIC_PRICE_CLIENT_LIFETIME`
- `NEXT_PUBLIC_PRICE_COACH_MONTHLY`
- `STRIPE_RECONCILIATION_KEY`

Le garde exige `sk_test_*` ou un credential sandbox équivalent,
`pk_test_*`, et des webhooks `livemode=false`.

## Données minimales représentatives

### Manifest synthétique recommandé

Le seed crée exactement neuf identités Auth/profils, toutes reconnaissables
par un namespace aléatoire d'exécution et supprimables :

| Donnée | Volume minimal | Cas |
|---|---:|---|
| profils/Auth | 9 | 1 admin, 1 coach, 7 clients |
| `coach_clients` | 1 | relation coach/client active |
| customers Stripe test | 3 | active, `past_due`, canceled |
| subscriptions Stripe test | 3 | statuts identiques aux profils locaux |
| compte Connect test | 1 | charges/payouts/details complets |
| webhooks locaux | 2 | checkout et invoice réussis, claims complets |
| paiements locaux | 2 | IDs d'événement uniques et autorités Stripe cohérentes |
| `meal_plans` | 6 | canonical, legacy, conflit à deux lignes, invalid, version unsupported |
| `client_meal_plans` | 2 | plan coach valide et cas legacy |
| `saved_meals` | 4 | snapshot canonical, alias legacy pluriel, vrai zéro, conflit d'alias |
| `daily_food_logs` | 14 | deux jours par client, zéros réels et macros connues |
| `meal_tracking` | 7 | suivi connu complet/incomplet |
| profils avec objectifs | 7 | objectifs complets, nullables et un cas invalide isolé |

Les sept clients couvrent les résultats Nutrition :

1. `canonical`;
2. `legacy_converted`;
3. `not_found`;
4. `conflict`;
5. `invalid`;
6. `legacy_unsupported`;
7. valeurs valides de contrôle pour agrégations journalières/hebdomadaires.

`failure` ne doit pas être créé en corrompant staging. Il est prouvé par un
test de transport contrôlé du runner : port de lecture injecté en échec, puis
vérification que le rapport échoue et n'enregistre pas `not_found` ou une
collection vide. Le rapport staging de succès doit compter zéro `failure`.

Les exceptions 600/500 kcal et 0/18 g restent des fixtures contrôlées. Elles
ne sont pas injectées dans le seed de succès et ne peuvent être allowlistées
que si nom, source, valeurs, statut et empreinte correspondent exactement à
la [décision Phase 4](NUTRITION_PHASE_4_DIVERGENCE_DECISION.md).

## Options de données

| Critère | A — seed synthétique déterministe | B — snapshot production anonymisé |
|---|---|---|
| couverture | volontairement complète sur les contrats Billing et statuts Nutrition | forte diversité runtime, mais couverture des cas rares non garantie |
| Stripe | objets test cohérents créés dans le sandbox | IDs live inutilisables en test; seed Stripe toujours nécessaire |
| risque | faible, données fictives | élevé : santé, identité et paiement même après anonymisation |
| confidentialité | aucun utilisateur réel | DPIA/revue sécurité et preuve d'anonymisation nécessaires |
| complexité initiale | moyenne : seed DB + Stripe + cleanup | élevée : export, transformation FK/Auth/JSON, validation de non-réidentification |
| maintenance | manifeste versionné avec schéma | pipeline à réviser à chaque évolution du schéma production |
| reproductibilité | élevée, volumes et statuts exacts | moyenne, dépend de la date et du contenu du snapshot |
| durée estimée | 3–5 jours d'implémentation, puis moins d'une heure par preuve | 5–10 jours hors validation juridique/sécurité, puis 1–2 heures par restauration |
| réversibilité | suppression du namespace ou du projet | suppression possible, mais copies intermédiaires et traces à contrôler |
| capacité à satisfaire Phase 6 | oui, avec Stripe test et rapport Billing sans issue | pas seule; exige encore Stripe test synthétique |

**Option recommandée : A, seed synthétique déterministe.**

C'est l'option minimale qui peut réellement produire un rapport Billing
Stripe/base sans divergence, couvrir les états Nutrition demandés, éviter les
données sensibles et être rejouée après suppression complète. L'option B ne
doit être envisagée qu'ensuite pour un audit de réalisme séparé, après
autorisation données/sécurité; elle n'est pas requise pour clôturer Phase 6.
Sa représentativité est **structurelle et comportementale** : schéma staging,
vraies APIs Stripe test, vrais webhooks signés, owners/RLS et frontières
applicatives. Elle ne prétend pas reproduire la distribution statistique des
données production.

## Plan d'exécution minimal reproductible

Ce plan nécessite une validation explicite avant toute création de ressource,
configuration, restauration ou écriture. Les commandes suivantes sont
**spécifiées mais n'ont pas été exécutées**.

### 1. Créer ou désigner la préproduction

```bash
export MOOVX_ENVIRONMENT=staging
export MOOVX_STAGING_MANIFEST=/secure/moovx/staging/manifest.json
export SUPABASE_ORG_ID=<supabase-org-id>
export SUPABASE_STAGING_PROJECT_REF=<new-staging-project-ref>
export SUPABASE_DB_PASSWORD=<loaded-from-secret-store>

MOOVX_ENVIRONMENT=staging \
SUPABASE_STAGING_PROJECT_REF=cycbnnojcymjnaqomlyj \
node scripts/preproduction/assert-environment.mjs \
  --mode pre-link \
  --manifest "$MOOVX_STAGING_MANIFEST"

npx supabase link \
  --project-ref cycbnnojcymjnaqomlyj
```

La création est terminée manuellement et ne doit pas être rejouée. Le
manifeste privé doit être copié depuis
`scripts/preproduction/staging-manifest.example.json` vers un chemin absolu
hors du dépôt avec permissions `0600`. Il ne contient aucun secret. Le mot de
passe DB est chargé depuis un secret store dans `SUPABASE_DB_PASSWORD`; il
n'est ni écrit dans le manifeste, ni passé dans la conversation, ni journalisé.
Si la variable manque, l'opérateur s'arrête avant `link`.

### 2. Valider anti-production avant toute mutation

Le garde `scripts/preproduction/assert-environment.mjs` refuse toute
organisation, taille, région, project ref, état ou variable non autorisée. Le
mode `pre-create` reste disponible pour l'historique; la commande obligatoire
après création et avant/après link est :

```bash
MOOVX_ENVIRONMENT=staging \
SUPABASE_STAGING_PROJECT_REF=cycbnnojcymjnaqomlyj \
node scripts/preproduction/assert-environment.mjs \
  --mode pre-link \
  --manifest "$MOOVX_STAGING_MANIFEST"
```

Il protège aussi les cinq références production conservées dans quatre
migrations cron historiques par nom, nombre et SHA-256 exacts. Toute nouvelle
référence ou modification de ces fichiers échoue. Sa sortie exige
`requiresPgCronAbsentDuringHistoricalReplay=true`.

### 3. Appliquer le schéma

Les migrations historiques comportent des versions de date dupliquées et
`supabase/config.toml` désactive le gestionnaire standard. Le re-versioning
staging est désormais défini par un [manifeste immuable
dédié](PHASE_6_STAGING_MIGRATION_REVERSIONING.md). Le `db push` officiel doit
seulement servir de diagnostic initial :

```bash
npx supabase db push --linked --include-all --dry-run
```

Supabase documente le
[`--dry-run` avant db push](https://supabase.com/docs/reference/cli/init).
La commande d'application retenue doit reproduire l'ordre lexical du reset
local via un runner dédié, transaction par fichier et `ON_ERROR_STOP` :

```bash
node scripts/preproduction/apply-migrations.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --dry-run

node scripts/preproduction/apply-migrations.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --apply
```

Le runner existe désormais en mode `--dry-run` uniquement. Il exige le
manifeste privé, le garde pre-link et un fichier local
`supabase/.temp/project-ref` égal exactement à `cycbnnojcymjnaqomlyj`. Il
enregistre la liste, l'ordre lexical et les SHA-256, exclut rôles et seeds, et
refuse `--apply`. L'application restera un chantier et une autorisation
séparés. `supabase db reset --linked` est interdit dans ce runbook, même si
Supabase le prévoit pour un staging jetable, car il détruit le schéma distant.

### État du raccordement au 26 juillet 2026

- inventaire CLI read-only : cible staging exacte confirmée;
- garde `pre-link` : `status=ok`, production exclue, six références
  historiques immuables acceptées;
- manifeste privé sans secret : préparé hors Git avec permissions `0600`;
- `supabase link` : réussi vers `cycbnnojcymjnaqomlyj`;
- historique distant avant application : vide;
- `pg_cron` distant : absent;
- comparaison historique avant re-versioning : dry-runs Supabase/opérateur
  concordants à 142 migrations;
- manifeste staging : 142 sources et SHA-256, 142 versions uniques,
  73 copies re-versionnées et 17 groupes résolus;
- migration de référence
  `20260317010000_seed_exercises_catalog.sql` explicitement autorisée :
  178 UUID synthétiques, aucune donnée personnelle et insertion idempotente;
- inventaire SQL : 59 fichiers comportent une mutation au replay, dont le
  catalogue autorisé et cinq crons historiques no-op avec `pg_cron` absent;
- au point de contrôle initial, 53 autres migrations de données restaient sans
  autorisation et le dry-run opérateur re-versionné refusait fail-closed avant
  workdir; cette étape historique est désormais remplacée par les décisions
  A/B/C, les deux preuves D et les cinq exclusions explicites documentées
  ci-dessous;
- application opérateur autorisée du plan final : 138/138 versions distantes,
  zéro version manquante ou supplémentaire;
- catalogue de référence final : 176 exercices, doublons supprimés absents et
  références canoniques présentes;
- overlay `invited_by_coach` et contrainte
  `coach_clients_coach_client_unique` présents;
- `pg_cron` et jobs : absents après application;
- seed Phase 6 séparé : appliqué une fois avec les volumes et empreintes du
  [`PHASE_6_STAGING_SYNTHETIC_SEED.md`](PHASE_6_STAGING_SYNTHETIC_SEED.md);
- rôle opérateur, cron, repair ou reset : aucun.

La comparaison complète et la classification A/B/C/D/E sont dans
[`PHASE_6_STAGING_MIGRATION_PLAN.md`](PHASE_6_STAGING_MIGRATION_PLAN.md).
Le manifeste, sa règle et l'inventaire exhaustif des blocages sont dans
[`PHASE_6_STAGING_MIGRATION_REVERSIONING.md`](PHASE_6_STAGING_MIGRATION_REVERSIONING.md).
La [classification des mutations](PHASE_6_STAGING_DATA_MUTATION_CLASSIFICATION.md)
documente les 53 décisions. Les preuves rollback des deux D individuelles sont
vertes et le plan final 138 migrations passe le dry-run Supabase puis son
application unique sur `cycbnnojcymjnaqomlyj`.

### Comparaison locale du plan courant avec un inventaire fourni

Les preuves datées ci-dessus restent historiques. Le dépôt courant contient
149 migrations sources, mais le plan staging final ne doit jamais être comparé
directement à ces 149 fichiers : il conserve 144 migrations historiques,
exclut cinq mutations explicitement refusées et ajoute l'overlay schema-only
`20260419000010_invited_by_coach_schema_only.sql`. L'autorité de comparaison
est donc une séquence ordonnée de **145 versions staging**.

Le script
`scripts/preproduction/compare-staging-migration-alignment.mjs` compare cette
séquence à un inventaire JSON déjà acquis et stocké localement. Il ne contient
aucun client Supabase, n'appelle aucun réseau et n'acquiert jamais implicitement
l'état du projet lié. L'acquisition read-only de staging exige une autorisation
opérateur distincte; toute remédiation (`db push`, `migration repair`, reset ou
écriture SQL) constitue encore une opération séparée.

Format minimal de l'inventaire :

```json
{
  "projectRef": "cycbnnojcymjnaqomlyj",
  "capturedAt": "2026-08-06T12:00:00.000Z",
  "source": "operator-read-only",
  "versions": ["20260317000000", "20260317010000"],
  "structure": {
    "tables": [],
    "functions": [],
    "policies": [],
    "publications": []
  }
}
```

L'inventaire ne doit contenir ni clé, mot de passe, token, URL avec credentials,
donnée métier ou dump. `projectRef` est obligatoire et doit être exactement le
ref staging; le ref et les hosts Production sont refusés. Les versions peuvent
avoir 8 chiffres lorsqu'une version historique était déjà unique, ou 14 chiffres
après re-versioning. Leur ordre est significatif.

Exécution locale, après acquisition séparément autorisée :

```bash
npm run test:migrations:staging-alignment -- \
  --inventory /chemin/local/inventaire-staging.json
```

La sortie expurgée distingue compte source, compte staging, manque, ajout,
doublon, inversion d'ordre, cinq exclusions et overlay. Les verdicts possibles
sont `ALIGNED`, `MISSING_REMOTE_VERSIONS`, `EXTRA_REMOTE_VERSIONS`,
`DUPLICATE_REMOTE_VERSIONS`, `ORDER_MISMATCH`,
`INVALID_REMOTE_INVENTORY`, `STRUCTURE_DRIFT` et `INCOMPLETE_EVIDENCE`.
Une preuve structurelle n'est concluante que lorsque les inventaires attendus
et observés sont tous deux présents; si elle est exigée sans ces deux côtés,
le résultat reste `INCOMPLETE_EVIDENCE`.

### Photographie staging read-only du 6 août 2026

Après validation du ref lié exact `cycbnnojcymjnaqomlyj` et exclusion du ref
Production, deux acquisitions indépendantes ont été effectuées à
`2026-08-06T13:57:50.560Z` et `2026-08-06T13:58:20.241Z`. Elles contiennent
chacune 141 versions distantes, dans le même ordre, sans doublon. Les inventaires
temporaires n'ont contenu que le ref, l'horodatage, la source de capture et les
versions; aucun credential ou contenu métier n'a été conservé.

Le comparateur versionné a produit deux rapports identiques hors horodatage :

| Contrôle | Résultat |
|---|---:|
| sources canoniques | 149 |
| versions staging finales attendues | 145 |
| versions distantes observées | 141 |
| versions manquantes | 4 |
| versions supplémentaires | 0 |
| doublons distants | 0 |
| inversions d'ordre entre versions communes | 0 |
| exclusions explicites | 5 |
| overlays staging | 1 |
| verdict du comparateur | `MISSING_REMOTE_VERSIONS` |

Les quatre versions absentes sont `20260718150000`, `20260729100000`,
`20260805100000` et `20260806100000`. Les versions `20260727120000`,
`20260729190000` et `20260729193000` sont présentes. Le décalage de position
des versions présentes provient uniquement des versions manquantes; aucune
inversion relative n'est observée.

Une requête ciblée sur `supabase_migrations`, `pg_catalog` et
`information_schema` a ensuite été exécutée avec
`transaction_read_only=on`, `statement_timeout=10s`, puis `ROLLBACK` :

| Version | Historique | Objet attendu | État structurel read-only |
|---|---|---|---|
| `20260718150000` | absente | `public.seedance_jobs` | table, colonnes, contraintes, index et RLS absents |
| `20260727120000` | présente | contrat checkout `payments` | trois colonnes présentes; index checkout unique partiel conforme |
| `20260729100000` | absente | trigger Auth `on_auth_user_created` | fonction `handle_new_user()` présente, trigger absent |
| `20260729190000` | présente | `exercises_db.difficulty` | colonne `text` nullable présente |
| `20260729193000` | présente | colonnes Nutrition `food_items` | trois colonnes `numeric` avec defaults présentes |
| `20260805100000` | absente | publication Realtime de `public.messages` | table présente, publication absente |
| `20260806100000` | absente | contrainte `payments_stripe_event_id_key` | contrainte absente; ancien index unique partiel encore présent |

Verdict consolidé : **`HISTORY_AND_STRUCTURE_DRIFT`**. La photographie est
fiable et les divergences sont classifiées; la tâche Phase 9 de vérification
peut donc être clôturée. Toute application des quatre migrations ou autre
remédiation reste un sous-batch séparé nécessitant une autorisation explicite.
La preuve historique 138/138 du 26 juillet demeure inchangée.

### Remédiation et double audit du 8 août 2026

Sous autorisation staging explicite, les quatre versions précédemment absentes
ont été appliquées isolément et contrôlées après chaque transaction. L'état
est passé de 141 à 145 versions : Seedance, Auth, Realtime et Billing sont
présentes exactement une fois et leurs structures finales sont conformes. La
contrainte Billing réelle n'a modifié ni la cardinalité des cinq paiements ni
les Event IDs existants.

Deux nouvelles captures read-only indépendantes constatent 145 versions,
aucun manque, ajout, doublon ou écart d'ordre. Les deux rapports du comparateur
retournent `aligned=true` et `verdict=ALIGNED`, avec la même empreinte
structurelle `ea997ef1bf9182c54d32c5f4c64b2628`. Le backup applicatif
public/historique avait été restauré localement et qualifié avant mutation.
Cette mise à jour remplace le drift courant; les constats 138/138 du 26 juillet
et 141/145 du 6 août restent conservés comme preuves historiques datées.

Aucun accès Production, déploiement, promotion Preview, rollback, reset,
`db push` ou `migration repair` n'a été exécuté.

Pour reprendre sans exposer le secret :

```bash
export MOOVX_STAGING_MANIFEST=/absolute/private/path/manifest.json
read -s "SUPABASE_DB_PASSWORD?Supabase staging DB password: "
export SUPABASE_DB_PASSWORD
echo
```

La saisie reste locale et masquée. La session opérateur reprend ensuite au
garde `pre-link`; elle ne source jamais `.env` ou `.env.local`.

Quatre migrations déjà appliquées en production contiennent historiquement
`app.moovx.ch` et des placeholders de secret. Elles restent strictement
immuables :

- `20260529120000_schedule_weekly_diagnostic_cron.sql`;
- `20260529140000_update_weekly_diagnostic_cron_to_daily.sql`;
- `20260531110137_schedule_training_regen_cron.sql`;
- `20260613_streak_reminder.sql`.

Le replay staging doit vérifier par lecture de métadonnées que `pg_cron` est
absent. Les blocs historiques deviennent alors des no-op; les autres schémas,
notamment `profiles.last_streak_reminder_at`, sont appliqués normalement. Si
`pg_cron` est présent, le runner s'arrête avant la première migration.

La nouvelle migration
`20260725190000_configure_environment_scoped_cron.sql` ne touche aucun job à
son application. Elle crée seulement une frontière privée qui :

- refuse environnement inconnu, URL absente, HTTP, local ou host production
  en staging;
- n'accepte la production que pour `https://app.moovx.ch` explicitement;
- stocke le bearer dans Supabase Vault, jamais dans Git ou `cron.job`;
- remplace les quatre noms historiques de manière idempotente uniquement
  lorsqu'un opérateur l'appelle.

Voir [la frontière cron environment-scoped](SUPABASE_ENVIRONMENT_SCOPED_CRON.md).

### 4. Créer les objets Stripe test

Après authentification explicite dans le sandbox/test account :

```bash
stripe login

node scripts/preproduction/seed-stripe-test.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --output /secure/moovx/staging/stripe-seed.json
```

Le seeder à implémenter crée les customers, prices/subscriptions et le compte
Connect test avec une clé test chargée depuis le secret store. Stripe fournit
des [tokens Connect de test](https://docs.stripe.com/connect/testing); aucune
identité ou carte réelle n'est utilisée.

Le compte Connect est contrôlé par lecture API dans la réconciliation. Le
runtime expose désormais deux frontières Phase 6 distinctes, documentées dans
[`PHASE_6_STRIPE_WEBHOOK_SCOPES.md`](PHASE_6_STRIPE_WEBHOOK_SCOPES.md) :

- `/api/stripe/webhook/platform`, endpoint Account avec `connect=false`;
- `/api/stripe/webhook/connect`, endpoint Connected accounts avec
  `connect=true`.

La route historique `/api/stripe/webhook` reste disponible pendant la
transition, mais aucun endpoint Phase 6 ne doit la cibler. Les deux nouveaux
endpoints exigent des secrets différents et
`STRIPE_WEBHOOK_EXPECTED_LIVEMODE=false` en staging.

### 5. Charger le seed Supabase

```bash
node scripts/preproduction/seed-supabase.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --stripe-seed /secure/moovx/staging/stripe-seed.json \
  --apply

node scripts/preproduction/verify-seed.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --expect-profile-count 9 \
  --expect-meal-plan-count 6 \
  --expect-client-plan-count 2 \
  --expect-saved-meal-count 4 \
  --expect-food-log-count 14 \
  --expect-tracking-count 7
```

Le seed est transactionnel pour les tables SQL, idempotent par namespace et
échoue si une ligne hors namespace serait modifiée. Les IDs Stripe test sont
lus depuis l'artefact sécurisé, jamais codés en dur ou versionnés.

### 6. Configurer Vercel Preview

```bash
npx vercel link --yes \
  --project plateforme-coach \
  --scope "$VERCEL_SCOPE"

npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview phase-6-staging \
  < /secure/moovx/staging/NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview phase-6-staging --sensitive \
  < /secure/moovx/staging/NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY preview phase-6-staging --sensitive \
  < /secure/moovx/staging/SUPABASE_SERVICE_ROLE_KEY
npx vercel env add STRIPE_SECRET_KEY preview phase-6-staging --sensitive \
  < /secure/moovx/staging/STRIPE_SECRET_KEY
npx vercel env add STRIPE_PLATFORM_WEBHOOK_SECRET preview phase-6-staging --sensitive \
  < /secure/moovx/staging/STRIPE_PLATFORM_WEBHOOK_SECRET
npx vercel env add STRIPE_CONNECT_WEBHOOK_SECRET preview phase-6-staging --sensitive \
  < /secure/moovx/staging/STRIPE_CONNECT_WEBHOOK_SECRET
npx vercel env add STRIPE_WEBHOOK_EXPECTED_LIVEMODE preview phase-6-staging \
  < /secure/moovx/staging/STRIPE_WEBHOOK_EXPECTED_LIVEMODE
npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY preview phase-6-staging \
  < /secure/moovx/staging/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
npx vercel env add NEXT_PUBLIC_PRICE_CLIENT_MONTHLY preview phase-6-staging \
  < /secure/moovx/staging/NEXT_PUBLIC_PRICE_CLIENT_MONTHLY
npx vercel env add NEXT_PUBLIC_PRICE_CLIENT_YEARLY preview phase-6-staging \
  < /secure/moovx/staging/NEXT_PUBLIC_PRICE_CLIENT_YEARLY
npx vercel env add NEXT_PUBLIC_PRICE_CLIENT_LIFETIME preview phase-6-staging \
  < /secure/moovx/staging/NEXT_PUBLIC_PRICE_CLIENT_LIFETIME
npx vercel env add NEXT_PUBLIC_PRICE_COACH_MONTHLY preview phase-6-staging \
  < /secure/moovx/staging/NEXT_PUBLIC_PRICE_COACH_MONTHLY

npx vercel pull --environment=preview --git-branch=phase-6-staging
npx vercel deploy --yes > /secure/moovx/staging/vercel-deployment-url

export MOOVX_PREVIEW_DEPLOYMENT=<copied-from-vercel-deployment-url>
export MOOVX_STAGING_ALIAS=<dedicated-non-production-alias>
npx vercel alias set "$MOOVX_PREVIEW_DEPLOYMENT" "$MOOVX_STAGING_ALIAS"
```

Vercel documente les
[variables Preview liées à une branche](https://vercel.com/docs/environment-variables/manage-across-environments),
[`vercel pull --environment=preview --git-branch`](https://vercel.com/docs/cli/pull)
et le fait qu'un déploiement sans `--prod` est une
[Preview](https://vercel.com/docs/deployments/environments).
L'[alias Vercel](https://vercel.com/docs/cli/alias) fournit une URL staging
stable sans utiliser les domaines MoovX de production.
Les autres variables applicatives strictement nécessaires doivent être
ajoutées individuellement; aucune variable Production ne doit être copiée en
bloc.

### 7. Configurer le webhook test et finaliser la Preview

Après consignation de l'alias Preview stable dans le manifeste :

```bash
export MOOVX_PREVIEW_URL="https://$MOOVX_STAGING_ALIAS"

node scripts/preproduction/configure-stripe-webhooks.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --platform-url "$MOOVX_PREVIEW_URL/api/stripe/webhook/platform?x-vercel-protection-bypass=<secret-loaded-in-memory>" \
  --connect-url "$MOOVX_PREVIEW_URL/api/stripe/webhook/connect?x-vercel-protection-bypass=<secret-loaded-in-memory>" \
  --output /secure/moovx/staging/stripe-webhooks.json
npx vercel env add NEXT_PUBLIC_APP_URL preview phase-6-staging \
  < /secure/moovx/staging/NEXT_PUBLIC_APP_URL
npx vercel env add NEXT_PUBLIC_SITE_URL preview phase-6-staging \
  < /secure/moovx/staging/NEXT_PUBLIC_SITE_URL

npx vercel deploy --yes > /secure/moovx/staging/vercel-deployment-url-final
export MOOVX_PREVIEW_DEPLOYMENT=<copied-from-vercel-deployment-url-final>
npx vercel alias set "$MOOVX_PREVIEW_DEPLOYMENT" "$MOOVX_STAGING_ALIAS"
```

Le runner reste à implémenter. Il devra vérifier `livemode=false`, créer
exactement un endpoint Account et un endpoint Connect et inscrire uniquement
les événements du scope correspondant. Stripe documente la création d'un
[endpoint webhook test](https://docs.stripe.com/api/webhook_endpoints/create?lang=curl).
Le bypass Vercel doit rester secret et non persisté. Le manifeste archivable
ne conserve que des empreintes expurgées et les IDs techniques tronqués.

### 8. Valider l'environnement déployé

```bash
MOOVX_ENVIRONMENT=staging \
node scripts/preproduction/assert-environment.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --mode pre-create

MOOVX_ENVIRONMENT=staging \
MOOVX_CRON_BASE_URL="$MOOVX_PREVIEW_URL" \
CRON_SECRET=<loaded-from-secret-store> \
psql "$SUPABASE_STAGING_DB_URL" \
  -X -v ON_ERROR_STOP=1 \
  -f scripts/preproduction/configure-cron-jobs.sql

node scripts/preproduction/smoke-readonly.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST"
```

Le runner cron crée les extensions et les quatre jobs dans une transaction
unique. Une URL/variable invalide annule aussi les extensions; aucune création
partielle ne subsiste. Le smoke test vérifie ensuite project ref, schéma,
volumes, modes Stripe et webhooks, sans mutation. Toute valeur manquante ou
inconnue arrête l'exécution.

### 9. Exécuter Billing puis Nutrition en lecture seule

```bash
MOOVX_RECONCILIATION_ENV=staging \
npm run billing:reconcile:preproduction -- \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --output /secure/moovx/staging/billing-reconciliation.json

MOOVX_RECONCILIATION_ENV=staging \
npm run nutrition:reconcile:preproduction -- \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --limit-owners 25 \
  --output /secure/moovx/staging/nutrition-reconciliation.json
```

Ces scripts npm et leurs runners restent à implémenter. Billing enveloppe le
service existant; Nutrition orchestre les readers/repositories actuels sans
ajouter de requête au runtime applicatif.

### 10. Archiver la preuve expurgée

```bash
node scripts/preproduction/sanitize-reconciliation-report.mjs \
  --billing /secure/moovx/staging/billing-reconciliation.json \
  --nutrition /secure/moovx/staging/nutrition-reconciliation.json \
  --output artifacts/reconciliation/phase-6-summary.json

node scripts/preproduction/assert-report-safe.mjs \
  artifacts/reconciliation/phase-6-summary.json

shasum -a 256 artifacts/reconciliation/phase-6-summary.json \
  > artifacts/reconciliation/phase-6-summary.sha256
```

Seuls le résumé expurgé et son empreinte sont versionnables. Les rapports
bruts restent dans le stockage sécurisé et suivent sa rétention.

### 11. Nettoyer ou conserver staging

Pour un staging persistant, supprimer uniquement le namespace du seed :

```bash
node scripts/preproduction/cleanup-seed.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --namespace "$MOOVX_SEED_NAMESPACE" \
  --apply
```

La suppression d'un webhook, déploiement ou projet est une action destructive
séparée qui exige une nouvelle autorisation :

```bash
node scripts/preproduction/delete-stripe-test-fixtures.mjs \
  --manifest "$MOOVX_STAGING_MANIFEST" \
  --apply

npx vercel remove "$MOOVX_PREVIEW_DEPLOYMENT" --yes
npx supabase projects delete "$SUPABASE_STAGING_PROJECT_REF"
```

La suppression du projet ne doit jamais faire partie du chemin de succès par
défaut.

## Format de preuve archivable

Pour chaque owner anonymisé, le runner Nutrition devra lire une fois les
sources runtime puis les transmettre aux frontières existantes. Le rapport
doit contenir :

- SHA du commit et identifiant non sensible de l'environnement ;
- empreinte du manifeste/snapshot ;
- date, bornes et volumes exacts ;
- compte par statut `canonical`, `legacy_converted`, `not_found`, `conflict`,
  `invalid`, `legacy_unsupported`, `failure`;
- pour chaque divergence : référence stable hachée, source, champ, deux
  valeurs, classification et cause ;
- allowlist exacte des exceptions 600/500 kcal et 0/18 g ;
- compte des erreurs de lecture, parsing et validation ;
- `readOnly: true`, `truncated: false` et `secretsScanned: true`.

L'archive versionnable ne doit contenir ni owner brut, ni e-mail, ni token,
ni clé, ni URL signée, ni payload alimentaire complet. Les valeurs minimales
nécessaires à une divergence peuvent être conservées derrière une référence
hachée.

## Critères de succès Phase 6

La Phase 6 devient `met` uniquement si :

1. projet Supabase, URL Preview et Stripe sont confirmés non-production ;
2. clés Stripe test/sandbox et webhooks `livemode=false` sont prouvés ;
3. migrations et seed correspondent à leurs manifestes/empreintes ;
4. volumes Billing minimaux et neuf profils synthétiques sont présents ;
5. rapport Billing complet, `readOnly=true`, `partial=false`,
   `truncated=false`, sans issue ;
6. aucune erreur Supabase/Stripe, parsing ou validation n'est masquée ;
7. commandes et SHA du commit sont archivés ;
8. rapport expurgé et SHA-256 sont versionnés sans secret ni donnée sensible ;
9. tests/gardes des runners sont verts ;
10. aucune ressource ou donnée production n'a été lue ou écrite.

La réconciliation Nutrition secondaire doit en plus garantir :

- volumes obligatoires non nuls ;
- aucune inconnue transformée en zéro ;
- aucun croisement d'owner ;
- aucun conflit d'alias accepté ;
- zéro divergence non autorisée ;
- seules les deux exceptions Phase 4 exactes éventuellement allowlistées.

Une preuve Nutrition seule ne suffit jamais à clôturer Phase 6.

## Actions soumises à autorisation explicite

| Action | Autorisation requise |
|---|---|
| créer/lier/supprimer le projet Supabase staging | oui |
| créer les rôles SQL ou appliquer les migrations | oui |
| charger ou nettoyer le seed | oui |
| créer/modifier des variables Vercel | oui |
| créer un déploiement Preview | oui |
| créer/modifier/supprimer customers, subscriptions, Connect ou prices Stripe test | oui |
| créer/modifier/supprimer les endpoints webhook test | oui |
| restaurer un snapshot, même anonymisé | oui, plus revue données/sécurité |
| exécuter les runners read-only après configuration | oui, validation de cible |
| archiver le rapport expurgé dans Git | oui, après scan de secrets |
| toute écriture ou suppression distante | oui, avec cibles et rollback exacts |

## Commandes exécutées pendant cet audit

Toutes les commandes ayant touché des données étaient read-only :

```bash
npm run supabase:local:status

psql postgresql://postgres:postgres@127.0.0.1:55322/postgres \
  -v ON_ERROR_STOP=1 -X -A -F '|' \
  -c "BEGIN READ ONLY; SELECT ... count(*) ...; COMMIT;"
```

Les recherches statiques ont utilisé `rg`, `sed`, `git status`,
`git rev-parse` et un lecteur local qui n'affichait que les noms de variables,
hosts, modes test/live et identifiants Vercel non sensibles.

Aucune commande Supabase distante, Stripe, Vercel, mutation, restauration,
reset, seed, création de ressource, requête de données production, commit ou
push n'a été exécutée.

## Prochaine étape unique

Autoriser explicitement la création d'un Protection Bypass for Automation
limité au Preview Phase 6, charger un credential Stripe test uniquement en
mémoire, puis créer les deux endpoints décrits dans
[`PHASE_6_STRIPE_WEBHOOK_SCOPES.md`](PHASE_6_STRIPE_WEBHOOK_SCOPES.md).
La Phase 6 reste `blocked` jusqu'à la réconciliation Billing read-only
archivée sans divergence.
