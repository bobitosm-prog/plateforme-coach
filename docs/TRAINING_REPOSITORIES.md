# Repositories Training

> Statut : contrat de lecture initial, non branché dans l'application.
> Date : 17 juillet 2026.
> Modèle : [`TRAINING_CANONICAL_MODEL.md`](TRAINING_CANONICAL_MODEL.md).
> Inventaire legacy : [`TRAINING_FORMATS_INVENTORY.md`](TRAINING_FORMATS_INVENTORY.md).

## Périmètre

Les repositories de `lib/repositories/training` centralisent les projections
SQL utiles aux prochaines extractions de `useClientDashboard`, `TrainingTab` et
des écrans coach. Ils reçoivent obligatoirement un `DatabaseClient` injecté :
ils ne créent ni client navigateur, ni client serveur, ni client admin.

Cette première frontière est volontairement **read-only**. Les écritures
Training actuelles dépendent encore de JSON legacy non validés et de policies
RLS qui n'ont pas de matrice dédiée. Les exposer maintenant figerait un contrat
de mutation insuffisamment caractérisé. Les mutations seront ajoutées après
validation des schémas d'entrée, de l'identité serveur et des matrices RLS.

## Repositories et méthodes

### Programmes

`createTrainingProgramRepository(client)` couvre :

- `listCoachPrograms(coachUserId)` sur `training_programs` ;
- `findProgramByIdForOwner(programId, coachUserId)` avec double filtre id/owner ;
- `listAssignedProgramsForClient(clientUserId)` sur `client_programs` ;
- `listPersonalProgramsForClient(clientUserId)` sur `custom_programs`.

Les champs JSON `program`, `days` et `phases` restent du `Json` Supabase. Le
repository ne prétend pas qu'ils sont canoniques : l'appelant devra utiliser
les [adaptateurs legacy](TRAINING_LEGACY_ADAPTERS.md).

### Séances et progression

`createTrainingSessionRepository(client)` couvre :

- `listWorkoutSessionsForClient(clientUserId)` ;
- `findSessionById(sessionId, clientUserId)` ;
- `listCompletionsForClient(clientUserId)` ;
- `listCompletionsForProgram(clientUserId, programId)` ;
- `listPersonalRecordsForClient(clientUserId)`.

`workout_sessions` et `completed_sessions` restent deux historiques distincts.
Il n'existe pas de table canonique de séances prescrites : elles sont imbriquées
dans les JSON de programme. Le repository n'invente donc pas de
`listSessionsForProgram` ambigu ; il liste uniquement les complétions liées par
la FK `completed_sessions.program_id`.

### Exercices

`createTrainingExerciseRepository(client)` couvre :

- `listCatalogExercises({ search, limit })`, borné à 500 lignes ;
- `findExerciseById(exerciseId)` ;
- `listCustomExercisesForOwner(ownerUserId)`.

La recherche échappe les jokers `%` et `_`. Le catalogue partagé et les
exercices personnels ont des projections séparées, car leurs champs et leurs
autorités diffèrent.

## Contrat commun

- Chaque requête utilise une projection littérale ; aucun `select('*')`.
- Une collection vide est un succès avec `[]`.
- Une recherche unitaire absente retourne `not_found`.
- Une erreur Supabase passe par `RepositoryResult` et `repositoryFailure` : le
  code borné peut être conservé, jamais le message SQL brut.
- Les listes sont ordonnées de façon explicite.
- Les paramètres `coachUserId`, `clientUserId` et `ownerUserId` sont des scopes
  de requête, pas des preuves d'identité.

## Autorité et RLS

L'appelant doit fournir les identifiants issus d'une session serveur vérifiée,
ou utiliser un client navigateur dont la RLS borne déjà l'utilisateur. Un ID
venant d'un body ou d'une query string ne devient jamais une autorité du seul
fait qu'il est passé au repository.

Le repository ne remplace pas la RLS et ne valide pas à lui seul une relation
coach/client active. La [stratégie RLS](RLS_TEST_MATRIX.md) ne couvre pas encore
les matrices Training dédiées. Avant toute mutation ou exposition serveur à un
coach, il faudra vérifier notamment :

- ownership de `training_programs` et `custom_programs` ;
- relation active pour `client_programs` et les lectures d'historique client ;
- propriété de `workout_sessions`, `workout_sets` et `personal_records` ;
- immutabilité des colonnes owner/client/coach par un navigateur.

Aucun nouveau recours au `service_role` n'est introduit.

## Divergences de schéma conservées

Les types générés ne contiennent pas plusieurs colonnes encore utilisées par
le code legacy : `client_programs.program_name`, `client_programs.week_start`,
`workout_sessions.date` et `workout_sessions.personal_records`. Les projections
du repository les excluent. Elles ne sont ni castées, ni réinventées.

Les writes restent également hors contrat tant que les JSON libres et les
policies coach ne sont pas caractérisés. Cette limite est compatible avec la
stratégie de migration progressive décrite dans le modèle canonique.

## Exemple

```ts
const repository = createTrainingProgramRepository(verifiedServerClient)
const result = await repository.listAssignedProgramsForClient(sessionUserId)

if (result.ok) {
  // Adapter ensuite chaque snapshot legacy ; ne pas le traiter comme canonique.
}
```

L'intégration applicative est explicitement reportée aux tâches d'extraction de
`useClientDashboard` et des domaines Training suivants.
