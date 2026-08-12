# Adaptateurs Training legacy vers canonique

## Statut

Les adaptateurs read-only décrits ici sont implémentés depuis le 17 juillet
2026. Ils convertissent des fixtures et objets déjà chargés en mémoire. Depuis
le premier sous-batch de migration runtime, la pagination des modèles coach
appelle `adaptCoachTemplate` uniquement en shadow mode.

### Statut de la migration runtime

La migration reste classée `TRAINING_CANONICAL_MIGRATION_NOT_STARTED` côté
persistance et bascule de consommateurs. Le modèle et les adaptateurs sont
prêts et testés. La liste paginée des modèles coach est le premier parcours à
exécuter `adaptCoachTemplate` en shadow mode : après chaque lecture réussie,
une projection sémantique legacy est comparée à la projection canonique.

Cette observation ne constitue pas une bascule runtime : la liste et l'UI
continuent à recevoir exclusivement les lignes legacy, même si l'adaptateur ou
l'observateur échoue. Elle n'ajoute aucune lecture ou écriture de base, aucune
persistance canonique et aucune migration SQL. Son seul objectif est de mesurer
les divergences avant toute décision de bascule. Aucune décision d'abandon de
la migration n'a été prise.

Les formats legacy restent réellement lus et écrits par l'application. Les
adaptateurs de `lib/training/adapters/*` sont donc
`FUTURE_MIGRATION_RESERVED` et ne relèvent pas de la suppression Phase 9 des
adaptateurs démontrés sans trafic. Avant toute suppression future, la tâche
« Achever la migration runtime Training vers le modèle canonique » doit :

1. valider les formats entrants à leurs frontières ;
2. brancher les adaptateurs aux repositories ;
3. établir une double lecture et comparer les résultats legacy/canoniques ;
4. ajouter une persistance additive si elle est nécessaire ;
5. basculer les consommateurs un par un ;
6. observer la coexistence avec un rollback applicatif disponible ;
7. démontrer l'absence de trafic legacy.

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

## Premier shadow read : modèles coach

Le comparateur pur
[`coach-template-shadow-read.ts`](../lib/training/coexistence/coach-template-shadow-read.ts)
contrôle l'owner coach, le nom, le statut, les tags, l'ordre et le type des
jours, les références et l'ordre des exercices, les séries, répétitions et
repos. Il classe chaque ligne en `MATCH`, `WARNING`, `CRITICAL_MISMATCH` ou
`UNSUPPORTED`.

Les événements restent locaux et expurgés. Ils contiennent uniquement le
format, le résultat, les codes de différence, les nombres de warnings et de
champs non mappés, la durée d'adaptation et un identifiant de corrélation
opaque. Aucun programme brut, email, cookie, JWT, header d'autorisation ou
payload JSON n'est journalisé, et aucun service distant n'est appelé.

## Shadow reads bornés : affectations client

`client_programs.program` exécute désormais une comparaison shadow pour les
programmes consommés par le dashboard client et le détail client côté coach.
Son contrat est défini dans
[`client-program-shadow-contract.ts`](../lib/training/coexistence/client-program-shadow-contract.ts)
et conserve les règles existantes :

- le dashboard client consomme la première ligne rendue par le repository,
  déjà triée par `created_at DESC` ;
- le détail client coach consomme la première ligne appartenant au coach
  courant ;
- aucune de ces règles ne définit un statut `active` global, absent du
  stockage legacy ;
- une seule ligne effectivement consommée est observée par lecture.

Le repository effectue toujours une seule lecture `client_programs`, filtrée
par `client_id` et triée par `created_at DESC`. Après une lecture réussie, le
loader dashboard demande explicitement l'observation de la première ligne. Le
tableau legacy original, son identité, son ordre et tous ses objets sont
retournés sans modification. Une erreur de lecture reste propagée normalement,
alors qu'une erreur d'adaptation, de comparaison, de chronométrage ou
d'observation est isolée et ne peut pas atteindre l'UI.

Le détail client coach conserve sa sélection dans le domaine
`loadClientDetailTraining`. Le `coachUserId` provient du scope construit depuis
l'identité authentifiée et une relation coach/client active validée. Après le
tri repository, le domaine conserve la première ligne dont `coach_id`
correspond à ce coach. Seule cette référence est transmise à l'observateur ;
une absence de correspondance reste `null` et n'émet aucune métrique. Aucun
contexte coach n'est dérivé du payload programme ou inventé par le repository.

Les deux writers runtime restent distincts. L'affectation depuis un template
coach persiste directement un tableau ordonné de jours contenant
`name`, `exercises`, `sets`, `reps` et `rest`. Cette forme ne possède pas de
marqueur de repos explicite : un jour vide ne doit donc pas être inventé comme
jour de repos par le shadow. Son payload d'écriture contient aussi
`program_name` et, lorsqu'il existe, `training_program_id`; ces champs ne font
pas partie de la projection de lecture du programme. La sauvegarde depuis le
détail client persiste un
objet indexé par les jours français, avec `repos`, `day_name` et les exercices
ordonnés, ainsi que `week_start` hors de la projection de lecture. Le premier
writer conserve normalement `training_program_id`, alors que la sauvegarde
détaillée peut produire une affectation sans source.

L'enveloppe pure transmet uniquement `program` et `created_at` comme entrée de
`adaptClientAssignment`. L'owner client, le coach assignateur et le
`training_program_id` sont passés séparément dans `AdapterContext`. Ainsi,
`client_id`, `coach_id` et `training_program_id` ne peuvent pas être signalés
artificiellement comme champs métier non mappés.

Le shadow compare comme divergences critiques l'owner client, le
coach assignateur lorsqu'il existe, l'ordre des jours et exercices, les jours
de repos, les références d'exercices, les séries, les répétitions et le repos.
Une source absente, une référence par nom ou un champ non mappé non critique
restera un warning. Le statut d'affectation, la révision canonique et la
timezone sont explicitement exclus : le stockage actuel ne permet pas de les
comparer de manière autoritative.

Les métriques locales contiennent seulement le format, le résultat
`MATCH`/`WARNING`/`CRITICAL_MISMATCH`/`UNSUPPORTED`, les codes de différence,
les nombres de warnings et champs non mappés, la durée d'adaptation et une
corrélation opaque. Elles n'incluent aucun identifiant client, coach ou source,
programme JSON, nom, email, cookie, JWT ou token.

Ce branchement n'ajoute aucune lecture ou écriture de base, aucun writer
canonique et aucune migration SQL. L'UI continue à recevoir exclusivement les
valeurs legacy. Le contrôleur du détail coach applique toujours
`normalizeAndSanitize` à la même ligne et au même payload legacy qu'avant le
shadow.

## Shadow read borné : programme personnel manuel du dashboard

Le dashboard client observe désormais le programme personnel actif retourné
par `findActivePersonalProgramForClient`, uniquement lorsque sa colonne
`source` vaut exactement `manual`. Ce bucket est nommé
`manual/editor-normalized` : il couvre un programme créé manuellement et une
forme repassée par l'éditeur, sans prétendre reconstituer une provenance plus
ancienne que le stockage ne permet plus d'établir.

La requête reste unique, filtrée par `user_id` puis `is_active = true`, avec le
même `maybeSingle()`. L'observation intervient seulement après une lecture
réussie et retourne la même référence legacy. Une erreur Supabase conserve son
comportement autoritatif ; une erreur de l'adaptateur, du comparateur, du
chronomètre ou de l'observateur est isolée.

L'enveloppe transmise à `adaptCustomProgram` contient seulement `name`,
`description`, `days`, `source` et, lorsqu'elles existent, les phases. L'owner
client est porté séparément par le contexte. Les identifiants de ligne et
d'utilisateur, les champs d'activation/planification et les timestamps de base
ne sont pas exposés comme payload adaptable et ne peuvent pas devenir des
`unmappedFields` artificiels.

La comparaison porte sur l'owner, le nom, l'ordre et le repos des jours,
l'ordre et les références des exercices, les séries, répétitions et temps de
repos. Les références seulement nominales, les indices d'une provenance
antérieure, les phases et la sémantique technique/superset non représentable
fidèlement restent des warnings. Une forme non tableau, un jour non repos sans
exercice, une prescription ambiguë ou des références catalogue/custom
contradictoires restent `UNSUPPORTED` et n'affectent pas le dashboard.

Les métriques locales ajoutent uniquement le bucket de provenance au contrat
expurgé existant. Elles ne contiennent ni `user_id`, ni identifiant de
`custom_programs`, ni nom, payload `days`, email, cookie, JWT ou token.

Les provenances `ai`, `onboarding_auto`, `cron_auto`, `diagnostic_auto`,
`free_session`, `import`, absentes ou inconnues restent entièrement hors shadow
dans ce sous-batch. Home, TrainingTab, badges, rappels et détail coach ne sont
pas branchés ici. Aucun writer canonique, aucune migration SQL et aucune
écriture supplémentaire ne sont introduits ; le dashboard reste servi depuis
le programme legacy.
