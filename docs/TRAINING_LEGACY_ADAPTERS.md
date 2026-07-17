# Adaptateurs Training legacy vers canonique

## Statut

Les adaptateurs read-only décrits ici sont implémentés depuis le 17 juillet
2026. Ils convertissent des fixtures et objets déjà chargés en mémoire. Ils ne
sont encore appelés par aucun écran, hook, route ou repository.

Le contrat cible est défini dans le
[modèle Training canonique](TRAINING_CANONICAL_MODEL.md) et les formes sources
dans l'[inventaire Training](TRAINING_FORMATS_INVENTORY.md).

## API pure

Le point d'entrée est [`lib/training/adapters`](../lib/training/adapters). Il ne
dépend ni de React, Next.js, Supabase, du navigateur ou d'un fournisseur
externe. Les fonctions prennent :

- une entrée `unknown` ;
- un `AdapterContext` contenant les identifiants et l'owner résolus par la
  future frontière serveur ;
- pour les imports, le provider déjà identifié.

Elles renvoient toujours une union discriminée :

```ts
type AdapterResult<T> =
  | {
      status: 'converted'
      legacyFormat: LegacyFormatId
      value: T
      warnings: AdapterWarning[]
      unmappedFields: string[]
    }
  | {
      status: 'legacyUnsupported'
      legacyFormat: LegacyFormatId
      reason: string
      legacyReference: LegacyReference
    }
```

`legacyUnsupported` n'est jamais un programme canonique partiel. L'appelant
futur devra isoler la source ou demander une correction ; il ne doit pas
réessayer avec des valeurs par défaut implicites.

## Huit formats contractuels

| Format | Fonction | Résultat |
|---|---|---|
| `coach-template-envelope-v1` | `adaptCoachTemplate` | `TrainingProgram` template, owner coach |
| `client-program-days-v1` | `adaptClientAssignment` | `AssignedProgram` depuis tableau de jours |
| `client-program-weekdays-fr-v1` | `adaptClientAssignment` | `AssignedProgram` depuis objet hebdomadaire français |
| `custom-program-days-v1` | `adaptCustomProgram` | `TrainingProgram` personnel |
| `moovx-xlsx-v1` | `adaptImportedProgram(..., "moovx-xlsx")` | programme personnel importé |
| `strong-hevy-csv-v1` | `adaptImportedProgram(..., "strong" | "hevy")` | programme importé avec warning de perte |
| `workout-history-v1` | `adaptWorkoutHistory` | `SessionExecution` et séries ordonnées |
| `completed-program-session-v1` | `adaptCompletionMarker` | marqueur legacy d'une séance affectée |

La constante `CORE_LEGACY_FORMATS` empêche que cet inventaire contractuel
diverge silencieusement des tests.

## Projections complémentaires

Les besoins de la tranche exigent aussi trois convertisseurs qui ne remplacent
pas les huit formats persistés du contrat initial :

- `adaptAiGeneratedProgram` valide la forme structurée
  `{ program_name, description, days }` avant toute persistance ;
- `adaptScheduledSession` unifie les deux vocabulaires de calendrier sans
  prétendre retrouver le programme source ;
- `adaptPersonalRecord` conserve le record et son nom legacy sans inventer un
  identifiant catalogue.

## Décisions de conversion

- Les noms concurrents (`name`, `custom_name`, `exercise_name`,
  `exerciseName`) produisent `ambiguous_field`.
- Une référence catalogue ou custom est conservée lorsqu'elle est explicite.
  Sinon, une `ExerciseReference(kind="legacy")` et un warning sont produits.
- Des références catalogue et custom simultanées rendent l'entrée non
  supportée.
- Les répétitions acceptées sont un entier positif, une plage ordonnée,
  `AMRAP`, une durée ou une distance reconnue.
- Le repos accepte secondes, minutes, forme `1m30s` ou plage en secondes.
  L'absence de repos produit `none` avec warning ; une chaîne incompréhensible
  est rejetée.
- Aucun jour vide n'est transformé implicitement en repos. Le repos doit être
  explicite.
- Les séries d'une exécution sont triées par `set_number`, mais la source n'est
  jamais mutée.
- Les imports Strong/Hevy restent lossless uniquement pour le résultat déjà
  agrégé reçu par l'adaptateur. Un warning rappelle que les lignes originales
  par série ne sont pas restituables.
- L'owner est fourni par le contexte résolu : coach obligatoire pour un
  template coach, client obligatoire pour un programme personnel/IA/importé.

## Warnings structurés

Les codes actuels sont :

- `ambiguous_field` ;
- `legacy_name_reference` ;
- `default_missing` ;
- `lossy_import` ;
- `unmapped_field` ;
- `unresolved_reference` ;
- `legacy_status`.

Un warning autorise une conversion seulement lorsque l'identité et la
prescription restent interprétables. Une cible, un owner ou une référence
contradictoire produit `legacyUnsupported`.

## Champs non mappés et limites

- `split`, `duration`, `total_weeks`, `current_week`, `phases`, `scheduled` et
  `start_date` ne sont pas encore tous représentés dans le modèle minimal
  exécutable. Ils restent dans la source et sont documentés comme dette.
- Les phases Excel `p1/p2/p3` ne sont pas converties en `TrainingWeek` tant que
  leurs règles d'expansion ne sont pas caractérisées.
- Une affectation sans `training_program_id` reçoit un warning de référence non
  résolue ; son snapshot reste exploitable.
- Une séance calendrier ne possède pas encore de lien fiable vers
  `AssignedProgram`/`TrainingSession`.
- `completed_sessions` reste un marqueur distinct d'une `SessionExecution`.
- Les records par nom restent legacy ; aucun matching catalogue automatique
  n'est effectué.
- Les identifiants dérivés pour les objets imbriqués sont déterministes pour la
  comparaison, mais ne constituent pas encore une stratégie UUID persistée.

## Tests et fixtures

Les fixtures synthétiques sont dans
[`tests/fixtures/training-legacy.ts`](../tests/fixtures/training-legacy.ts). Les
tests vérifient les huit formats, les projections complémentaires, l'ordre, les
prescriptions, les références, les warnings, l'isolation des formes inconnues
et l'absence de mutation.

Un test statique interdit les imports React, Next, Supabase et `app/`, ainsi que
les appels réseau et mutations de base dans le module.

## Utilisation future

Avant tout branchement applicatif :

1. enrichir les fixtures avec des données anonymisées représentatives ;
2. ajouter une validation Zod distincte par format ;
3. créer les repositories Training ;
4. comparer ancien et nouveau résultat en double lecture ;
5. mesurer les warnings et formes isolées ;
6. n'activer un consommateur qu'après tests de caractérisation et mécanisme de
   rollback.

La présente tranche n'autorise aucune écriture, migration SQL ou modification
RLS.
