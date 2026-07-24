# ADR 0007 — Contrat de persistance des plans Nutrition

- Statut : accepted
- Date : 2026-07-24

## Contexte

Les migrations locales et les types générés exposent :

- `meal_plans(id, user_id, created_by, name, plan, active, created_at)`;
- `client_meal_plans(id, client_id, coach_id, plan, created_at, updated_at)`.

Sept producteurs persistants sont caractérisés dans
[NUTRITION_PLAN_PRODUCERS.md](../NUTRITION_PLAN_PRODUCERS.md). Quatre écrivent
des champs `meal_plans` absents du schéma généré (`plan_data`, `is_active`,
totaux et `objective`). Un producteur `client_meal_plans` écrit `week_start`
et quatre objectifs absents. Deux autres écrivent seulement `client_id`,
`plan` et `created_at`.

Les valeurs appelées « total » peuvent être un objectif déclaré, le total du
lundi avec fallback vers un objectif, ou un total journalier recalculé. Les
promouvoir en colonnes canoniques confondrait cible et mesure. Le snapshot
aliment v1 ne versionne pas l'enveloppe d'un plan.

Cette décision fixe la cible. Elle ne prouve pas que le schéma distant est
identique au schéma local et n'autorise aucune migration de producteur.

Les types, validateurs et adaptateurs read-only de cette cible sont désormais
implémentés et documentés dans
[NUTRITION_PLAN_ENVELOPE.md](../NUTRITION_PLAN_ENVELOPE.md). Aucun consommateur
runtime n'est raccordé.

## Décision

### Principes

1. Identités, relations d'autorité, statuts requêtables et dates d'application
   restent en SQL.
2. Document Nutrition, objectifs, totaux et provenance restent dans `plan`.
3. Les alias runtime restent des entrées de lecture legacy seulement.
4. Une inconnue ne devient jamais zéro. Totaux déclarés et calculés restent
   séparés.
5. Une modification significative crée une nouvelle version/snapshot.

### `meal_plans`

| Champ | Autorité canonique | Décision |
|---|---|---|
| `id` | SQL | Identité opaque générée par PostgreSQL. |
| `user_id` | SQL | Propriétaire/bénéficiaire et autorité RLS ; obligatoire pour toute future écriture. |
| `created_by` | SQL | Auteur éventuel dérivé de l'identité authentifiée ; distinct du propriétaire. |
| `name` | SQL | Libellé court requêtable. |
| `plan` | SQL `jsonb` | Unique emplacement canonique de `NutritionPlanEnvelopeV1`. |
| `active` | SQL | Unique état d'activation canonique ; valeur non nulle à garantir ultérieurement. |
| `created_at` | SQL | Instant serveur ; la ligne est un snapshot append-only. |
| `plan_data` | aucun | Alias legacy en lecture seulement, interdit aux futures écritures. |
| `is_active` | aucun | Alias legacy en lecture seulement, projeté vers `active`. |
| `total_calories`, `protein_g`, `carbs_g`, `fat_g` | JSON | Refusés comme colonnes ; classés comme objectifs ou totaux avec provenance. |
| `objective` | JSON | Règle/objectif déclaré, jamais autorité d'accès. |

`plan` et `active` sont donc retenus, pas `plan_data` et `is_active`.
`created_at` ordonne les snapshots. Aucun `updated_at` n'est nécessaire pour
une ligne append-only : une correction produit une nouvelle ligne.

### `client_meal_plans`

| Champ | Autorité canonique | Décision |
|---|---|---|
| `id` | SQL | Identité opaque de l'affectation snapshotée. |
| `client_id` | SQL | Bénéficiaire et autorité RLS ; obligatoire à terme. |
| `coach_id` | SQL | Auteur et autorité RLS ; obligatoire pour une affectation coach, nullable pour les lignes personnelles legacy à classifier. |
| `plan` | SQL `jsonb` | `NutritionPlanEnvelopeV1` figée à l'affectation. |
| `week_start` | future colonne SQL `date` | Date civile d'application requêtable ; migration additive requise. |
| `status` | future colonne SQL bornée | `draft`, `active`, `replaced` ou `archived`; migration additive requise. |
| `created_at`, `updated_at` | SQL | Audit serveur ; `updated_at` reste pour la compatibilité actuelle. |
| `calorie_target`, `protein_target`, `carb_target`, `fat_target` | JSON | Objectifs snapshotés avec provenance ; aucune future colonne homonyme. |

`week_start` n'est pas stocké dans le JSON car PostgreSQL doit pouvoir
l'ordonner, le filtrer et en garantir le type. `status` reste également en
SQL. La relation coach/client faisant autorité n'est jamais copiée dans le
JSON. Une future écriture coach exige une relation active vérifiée côté
serveur ; les policies historiques ne suffisent pas à le démontrer.

### `NutritionPlanEnvelopeV1`

La version 1 distingue sans heuristique le canonique des semaines JSON legacy :

```text
{
  schemaVersion: 1,
  documentType: "nutrition_plan",
  planVersion: integer >= 1,
  timezone: IANA timezone | null,
  content: {
    days: exactly 7 ordered day snapshots with optional declared day totals,
    rules: bounded declarative rules,
    alternatives: explicit bounded alternatives
  },
  targets: {
    energyKcal, proteinG, carbsG, fatG, fiberG:
      { status: known | unknown | not_applicable,
        value: finite non-negative number | null,
        provenance: declared | generated | imported | legacy_unknown }
  },
  totals: {
    declared: nutrition total | null,
    calculated: nutrition total | null,
    calculationStatus: complete | partial | unavailable,
    calculationVersion: bounded string | null,
    calculatedAt: ISO instant | null
  },
  provenance: {
    source: user | coach | ai | import | platform | legacy,
    sourceVersion: bounded string | null,
    legacyFormat: bounded string | null,
    generatedAt: ISO instant | null
  },
  warnings: bounded warning codes
}
```

Le JSON ne contient jamais `user_id`, `client_id`, `coach_id`, `created_by`,
`active`, `status` ou `week_start`, ni prompt, profil ou secret fournisseur.

Les futures validations bornent le document sérialisé à 1 MiB, exactement
sept jours, douze repas par jour, 64 éléments par repas, seize alternatives
par plan et 128 warnings. Ce sont des limites du nouveau contrat, pas une
affirmation sur la conformité des lignes legacy.

Les jours et repas utilisent le vocabulaire du
[modèle Nutrition](../NUTRITION_CANONICAL_MODEL.md). Le snapshot aliment v1
peut être imbriqué sans devenir l'enveloppe. Une valeur connue est finie,
positive ou nulle ; une inconnue porte `status: unknown` et `value: null`.

### Compatibilité legacy

Le lecteur futur applique cet ordre, sans mutation :

1. enveloppe `schemaVersion: 1`, `documentType: nutrition_plan`;
2. JSON brut de `plan`;
3. forme runtime `plan_data` uniquement si elle existe dans une ligne reçue
   par une frontière de compatibilité ;
4. résultat `invalid` ou `unsupported`, jamais objet vide inventé.

`active` prime sur `is_active` si les deux existent. Une divergence produit un
warning et interdit une réécriture automatique. Jours FR/EN et
`meals`/`repas` restent des adaptateurs nommés. Un total sans provenance
devient `legacy_unknown`, jamais `calculated`.

## Matrice des champs runtime absents

| Champ runtime | Table | SQL local | Décision | Emplacement futur | Lecture legacy | Migration | Risque / rollback |
|---|---|---:|---|---|---|---|---|
| `plan_data` | `meal_plans` | non | supprimer des écritures | `plan` | adaptateur secondaire | backfill conditionnel séparé | conserver l'alias pendant l'observation |
| `is_active` | `meal_plans` | non | supprimer des écritures | `active` | fallback conflictuel fail-closed | backfill conditionnel séparé | retour temporaire à la double lecture |
| quatre totaux | `meal_plans` | non | refuser comme colonnes | `targets` ou `totals` selon provenance | sinon `legacy_unknown` | non | document brut conservé |
| `objective` | `meal_plans` | non | règle déclarative | JSON `content.rules`/`targets` | chaîne legacy bornée | non | document brut conservé |
| `week_start` | `client_meal_plans` | non | ajouter ultérieurement | SQL `date` | inconnu sans source explicite | oui, additive | nullable pendant transition |
| quatre `*_target` | `client_meal_plans` | non | refuser comme colonnes | JSON `targets` | `declared` | non | payload legacy conservé |
| `status`/activation | `client_meal_plans` | non | ajouter ultérieurement | SQL borné | `unknown_legacy` | oui, additive | nullable pendant observation |

## Stratégie de migration ultérieure

1. Créer types, validateurs purs et adaptateurs read-only.
2. Tester une double lecture canonique-prioritaire sans changer les écritures.
3. Vérifier le schéma dans une tranche autorisée, puis migrer additivement
   `client_meal_plans.week_start` et `status`; ne contraindre les identités
   qu'après audit des lignes.
4. Migrer un producteur à la fois vers `plan`/`active` et l'enveloppe v1.
5. Observer les statuts et conflits via des compteurs expurgés.
6. Réaliser tout backfill dans une tranche séparée avec dry-run ; ne jamais
   reconstruire une provenance absente.
7. Interdire ensuite les anciennes écritures par garde statique, puis retirer
   la double lecture après preuve.

Le rollback conserve toutes les colonnes et tous les JSON bruts : désactiver
les nouveaux writers/lecteurs revient au lecteur legacy. Aucune suppression
n'appartient à la migration initiale.

## Alternatives rejetées

- Canoniser `plan_data`/`is_active` : absents des migrations et types.
- Ajouter toutes les colonnes runtime : elles mélangent objectifs et totaux.
- Placer ownership, relation ou statut dans le JSON : la RLS et l'intégrité
  PostgreSQL ne pourraient pas s'y fier.
- Conserver les semaines JSON brutes : aucune version/provenance ne distingue
  les formes incompatibles.
- Réutiliser le snapshot aliment v1 comme enveloppe : il ne porte ni jours,
  objectifs ou affectation.
- Backfiller maintenant : aucun accès distant ni preuve des lignes.

## Conséquences

- Les repositories restent read-only et conformes aux types générés.
- Aucune phase n'est terminée par cette seule décision documentaire.
- Deux colonnes additives seront nécessaires pour `client_meal_plans`;
  aucune colonne de cible nutritionnelle n'est ajoutée.
- Les sept producteurs restent inchangés.

## Limites et dette restante

- Le statut des relations coach/client n'est pas renforcé.
- La priorité entre plan personnel et plan coach reste indécise.
- L'unicité d'une affectation active exige une décision transactionnelle.
- Les lignes legacy peuvent être invalides, partielles ou contradictoires.
- Les deux divergences Nutrition historiques restent visibles.

## Références

- [Modèle Nutrition canonique](../NUTRITION_CANONICAL_MODEL.md)
- [API de lecture des plans](../NUTRITION_PLAN_ENVELOPE.md)
- [Producteurs de plans](../NUTRITION_PLAN_PRODUCERS.md)
- [Repositories Nutrition](../NUTRITION_REPOSITORIES.md)
- [Snapshots legacy](../NUTRITION_LEGACY_SNAPSHOTS.md)
- [Audit RC1](../RC1_PHASES_1_8_AUDIT.md)
