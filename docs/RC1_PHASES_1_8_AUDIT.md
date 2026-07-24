# Audit RC1 des Phases 1 à 8

> Audit documentaire du 24 juillet 2026, révision
> `8c43ebb2018363adceaab7b12b2ebc3d683863c2`. Aucun test applicatif, service
> distant ou environnement de préproduction n'a été exécuté.

## Résumé exécutif

Les checklists des Phases 1 à 8 totalisent **124/124 tâches cochées**. Ce
compteur ne prouve pas leurs définitions de terminé. Sur 36 critères de sortie,
l'audit classe **33 `met`, 0 `partial`, 2 `unmet`, 1 `blocked` et
0 `not_applicable`**.

| Phase | Checklist | Critères (`met/partial/unmet/blocked/n/a`) | Statut |
|---|---:|---:|---|
| 1 — Stabilisation et sécurité | 15/15 | 4/0/0/0/0 | `met` |
| 2 — Filet de sécurité | 18/18 | 5/0/0/0/0 | `met` |
| 3 — Training | 27/27 | 6/0/0/0/0 | `met` |
| 4 — Nutrition et progression | 16/16 | 3/0/1/0/0 | `partial` |
| 5 — Coaching et messagerie | 12/12 | 4/0/0/0/0 | `met` |
| 6 — Billing | 10/10 | 3/0/0/1/0 | `blocked` |
| 7 — Plateforme IA | 13/13 | 4/0/0/0/0 | `met` |
| 8 — React et performance | 13/13 | 4/0/1/0/0 | `partial` |

La validation RC1 « Phases 1 à 8 terminées à 100 % » reste impossible. Le
premier critère non satisfait est désormais en Phase 4 ; le blocage externe le
plus net est la preuve de préproduction exigée en Phase 6.

## Méthode reproductible

Les compteurs proviennent exclusivement des tableaux de checklist compris
entre chaque titre de phase et sa définition de terminé :

```bash
node - <<'NODE'
const fs = require('fs')
const text = fs.readFileSync('ROADMAP_CODEX.md', 'utf8')
for (let phase = 1; phase <= 8; phase += 1) {
  const start = text.indexOf(`## Phase ${phase} `)
  const end = phase < 8
    ? text.indexOf(`## Phase ${phase + 1} `, start)
    : text.indexOf('## Release Candidate', start)
  const rows = [...text.slice(start, end).matchAll(/\| \[([ x])\] /g)]
  console.log(phase, rows.filter(row => row[1] === 'x').length, rows.length)
}
NODE
```

`met` signifie qu'une preuve versionnée et reproductible couvre le libellé ;
`partial`, qu'une partie seulement est démontrée ; `unmet`, que la preuve
contredit le seuil ; `blocked`, que l'environnement requis n'est pas
disponible ; `not_applicable`, que le critère ne s'applique pas.

## Phase 1 — `met`

| Définition de terminé | État | Preuve et limite |
|---|---|---|
| Matrices anonyme/client/coach/admin vertes | `met` | [`RLS_TEST_MATRIX.md`](RLS_TEST_MATRIX.md) et commandes locales qui y sont consignées ; preuve locale, pas production. |
| Identité critique dérivée côté serveur | `met` | Tests d'autorisation et [`COACH_INVITATION_CONTRACT.md`](COACH_INVITATION_CONTRACT.md) ; couverture des flux inventoriés. |
| Invitation, checkout, push et chat en E2E | `met` | [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) et harness E2E invitation/checkout/push/chat, cinq parcours locaux datés du 15 juillet 2026. |
| Rollback documenté | `met` | [`PHASE_1_ROLLBACK.md`](PHASE_1_ROLLBACK.md) ; procédure documentaire, non exercice de production. |

## Phase 2 — `met`

| Définition de terminé | État | Preuve et limite |
|---|---|---|
| Commandes unitaires/intégration/E2E distinctes | `met` | [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) et scripts `package.json`. |
| Aucun test en configuration production | `met` | Gardes localhost du même document ; ne prouve pas un environnement distant. |
| Au moins huit routes sur les contrats communs | `met` | [`API_SIMPLE_ROUTE_MIGRATION.md`](API_SIMPLE_ROUTE_MIGRATION.md), inventaire de huit routes. |
| Toute nouvelle fonctionnalité utilise les factories | `met` | [`SUPABASE_CLIENT_CONSTRUCTION_GUARD.md`](SUPABASE_CLIENT_CONSTRUCTION_GUARD.md) fige 53 constructions legacy par fichier/position et refuse toute addition, duplication, déplacement ou entrée obsolète sans dépendre de Git. |
| Dix accès migrés équivalents | `met` | Inventaire et tests de contrat dans [`SUPABASE_ACCESS_MIGRATION.md`](SUPABASE_ACCESS_MIGRATION.md). |

## Phase 3 — `met`

Les quatre limites sont couvertes par les gardes statiques : `TrainingTab`
7 lignes, `WorkoutSession` 530, `ProgramBuilder` 223 et
`useClientDashboard` 203. L'interruption/reprise est couverte dans
[`TRAINING_WORKOUT_SESSION_LIFECYCLE.md`](TRAINING_WORKOUT_SESSION_LIFECYCLE.md).
Le modèle et les adaptateurs sont couverts par
[`TRAINING_CANONICAL_MODEL.md`](TRAINING_CANONICAL_MODEL.md) et
[`TRAINING_LEGACY_ADAPTERS.md`](TRAINING_LEGACY_ADAPTERS.md). Les six critères
sont `met`; la stabilité vaut pour les fixtures versionnées, non pour toute
donnée distante.

## Phase 4 — `partial`

| Définition de terminé | État | Preuve et limite |
|---|---|---|
| Bornes et tolérances Nutrition explicites | `met` | [`NUTRITION_CANONICAL_MODEL.md`](NUTRITION_CANONICAL_MODEL.md), [`NUTRITION_TOTAL_COMPARISON.md`](NUTRITION_TOTAL_COMPARISON.md) et [lecture client-detail vérifiée sur le schéma runtime](NUTRITION_CLIENT_DETAIL_DOUBLE_READ.md). |
| Composants ciblés sous les seuils | `met` | Gardes statiques des façades Nutrition/Progression. |
| Agrégations non dupliquées | `met` | [`PROGRESSION_AGGREGATION_AUTHORITY.md`](PROGRESSION_AGGREGATION_AUTHORITY.md) définit les autorités, conserve les contrats divergents et ajoute une garde AST sur tout `app/` et les consommateurs `lib/` concernés. |
| Anciennes/nouvelles métriques concordantes | `unmet` | La [politique de concordance](NUTRITION_TOTAL_COMPARISON.md) rejoue sans modification 12 preuves. Le [snapshot v1](NUTRITION_LEGACY_SNAPSHOTS.md) sécurise production et réutilisation de `saved_meals`, refuse les conflits et retire `use_count` non contractuel. Les preuves historiques 600→500 kcal et 0→18 g demeurent divergentes sans backfill. |

## Phase 5 — `met`

Les façades des deux hooks sont sous 250 lignes, les sections possèdent des
tests isolés, et le cycle de vie realtime couvre stop, changement de relation,
réponses obsolètes et Strict Mode dans
[`COACHING_MESSAGING_REALTIME.md`](COACHING_MESSAGING_REALTIME.md). Les trois
mesures de requêtes `33/33/34 → 18/18/19` donnent au minimum **44,118 %** dans
[`COACH_DASHBOARD_INITIAL_REQUESTS.md`](COACH_DASHBOARD_INITIAL_REQUESTS.md).
Les quatre critères sont `met`, avec une preuve locale.

## Phase 6 — `blocked`

| Définition de terminé | État | Preuve et limite |
|---|---|---|
| Chaque événement Stripe supporté testé | `met` | [`BILLING_WEBHOOK_HANDLERS.md`](BILLING_WEBHOOK_HANDLERS.md) et suites listées dans [`BILLING_HTTP_ADAPTERS.md`](BILLING_HTTP_ADAPTERS.md). |
| Replay sans double mutation | `met` | [`BILLING_WEBHOOK_ORDERING.md`](BILLING_WEBHOOK_ORDERING.md), tests unitaires et concurrence locale. |
| Aucune divergence en préproduction | `blocked` | [`BILLING_RECONCILIATION.md`](BILLING_RECONCILIATION.md) ne fournit qu'un service read-only et annonce une commande admin future ; aucune exécution préproduction n'est consignée. |
| Routes sans métier substantiel | `met` | Inventaire `451 → 312` lignes et six adaptateurs dans [`BILLING_HTTP_ADAPTERS.md`](BILLING_HTTP_ADAPTERS.md). |

## Phase 7 — `met`

[`AI_PHASE_7_COMPLETION_AUDIT.md`](AI_PHASE_7_COMPLETION_AUDIT.md) recense
15/15 entrées `AiProvider`, zéro transport direct, les sorties structurées
validées, l'usage commun et les goldens de prompts. Les quatre critères sont
`met`. La preuve est locale et mockée ; aucun fournisseur réel n'est requis.

## Phase 8 — `partial`

| Définition de terminé | État | Preuve et limite |
|---|---|---|
| Bundle principal −25 % | `met` | Union gzip dédupliquée `930 649 → 591 408`, soit −36,452 %. |
| LCP p75 mobile −20 % | `unmet` | Six observations locales donnent une médiane `386 → 322 ms`, soit −16,580 % ; elles ne constituent pas un p75 terrain. |
| Médias publics déployés −50 % | `met` | [`PERFORMANCE_MEDIA_INVENTORY.md`](PERFORMANCE_MEDIA_INVENTORY.md) consigne −98,50 % sur la réponse statique froide ciblée. |
| Aucun média manquant | `met` | Manifest, fallback local et preuve CDN dans [`MEDIA_STORAGE_CDN_DEPLOYMENT.md`](MEDIA_STORAGE_CDN_DEPLOYMENT.md). |
| Chargement et erreur dédiés | `met` | [`PERFORMANCE_SEGMENT_LOADING.md`](PERFORMANCE_SEGMENT_LOADING.md) et [`PERFORMANCE_ERROR_BOUNDARIES.md`](PERFORMANCE_ERROR_BOUNDARIES.md) pour les pages critiques définies. |

La checklist est bien **13/13**. La calibration INP v2 reste exactement
**64 ms par passage / 48 ms en médiane** et le diagnostic reste
`environment_variance`. Les artefacts ont actuellement les SHA-256 suivants :

| Artefact | SHA-256 |
|---|---|
| baseline 1 | `920e23102ee5167f554624f38b14c2b1e06496e9fd40f1c64b5a65574072a894` |
| baseline 2 | `8c326bb675fa0e5707cab0d5f63c58fdf02e8cdf2f65336569b033b8db474232` |
| validation 1 | `e4a20c4eaaf9b78354849c9a3c4323cd09e5326de3b5ee6faf7c117962e55fc7` |
| validation 2 | `fd34f87fb1488dcf6a85e2326f29581ac774da0d938d99bf29854d6b06a59ffe` |
| comparaison | `e0d89784a31da139c56d7d35aff6c6a65c8825546b33cec433f18e7851cd88ff` |

Options honnêtes pour le LCP : obtenir ultérieurement une preuve terrain ;
reformuler explicitement la définition de terminé par décision de gouvernance ;
ou conserver la Phase 8 `partial`. Aucun résultat local n'est présenté comme
une métrique terrain.

## Cohérence globale et blocages RC1

- La roadmap Phases 1–9 contient 138 tâches, dont 124 cochées : **≈89,855 %**.
- Les 38 cases RC1 et les 14 tâches Phase 9 restent décochées.
- Le statut Phase 2 passe à `met` grâce à une garde fail-closed reproductible ;
  les Phases 4, 6 et 8 restent non satisfaites.
- Aucun item n'est compté deux fois dans les tableaux de phases.
- RC1 reste bloquée par les preuves manquantes/contradictoires des Phases 4, 6
  et 8.

## Recommandation unique

Caractériser puis raccorder la double lecture au contrôle Nutrition read-only
de génération initiale, sans migrer ses écritures. Les raccordements
[dashboard coach](NUTRITION_PLAN_DOUBLE_READ_CONSUMER.md) et
[plan personnel actif](NUTRITION_PERSONAL_PLAN_DOUBLE_READ.md), la
[lecture Home](NUTRITION_HOME_PLAN_DOUBLE_READ.md), la
[lecture du détail client](NUTRITION_CLIENT_DETAIL_DOUBLE_READ.md), la
[frontière pure](NUTRITION_PLAN_ENVELOPE.md) et
[l'ADR 0007](adr/0007-nutrition-plan-persistence-contract.md) ne requalifient
aucune preuve historique.
