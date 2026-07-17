# Modèle Training canonique

## Statut et portée

**Statut : modèle métier proposé et accepté pour la migration progressive, le
17 juillet 2026.**

Ce document définit le vocabulaire et les invariants du futur domaine Training
de MoovX. Il part de l'[inventaire des formats existants](TRAINING_FORMATS_INVENTORY.md),
mais ne modifie ni le schéma SQL, ni les données, ni les composants actuels.

Le modèle est indépendant de React, Next.js, Supabase et Anthropic. Les formes
TypeScript ou Zod futures devront représenter ce contrat sans faire des tables
legacy le modèle métier.

## Principes

1. Un programme décrit une prescription ; une exécution décrit des faits.
2. Un modèle, une affectation et un programme personnel sont des objets
   distincts, même lorsqu'ils partagent le même contenu.
3. Toute identité, ownership, unité et source est explicite.
4. Les exercices catalogue sont référencés par identifiant et accompagnés d'un
   snapshot lisible ; un nom seul n'est pas une identité canonique.
5. Les valeurs hétérogènes sont représentées par des unions discriminées, pas
   par des chaînes interprétées silencieusement.
6. Le modèle canonique est versionné. Les JSON legacy ne deviennent canoniques
   qu'après validation par un adaptateur connu.
7. Une forme inconnue est rejetée ou isolée pour investigation ; elle n'est
   jamais réparée implicitement.
8. Les contrôles d'autorité sont faits côté serveur et restent renforcés par la
   RLS.

## Conventions communes

### Identifiants et version

Tous les objets persistables utilisent des UUID opaques. Un identifiant ne
porte aucune information métier et n'est jamais choisi par le navigateur pour
désigner un autre utilisateur.

```text
formatVersion: 1
revision: entier >= 1
```

`formatVersion` versionne la structure canonique. `revision` versionne le
contenu d'un programme ou d'une affectation. Une modification de prescription
créant un résultat différent incrémente `revision`; elle ne réécrit pas le
snapshot utilisé par une exécution terminée.

### Dates et unités

- instant : ISO 8601 UTC ;
- date civile planifiée : `YYYY-MM-DD` avec fuseau IANA explicite sur
  l'affectation ou la planification ;
- durée et repos : secondes entières positives ;
- distance : mètres ;
- charge : kilogrammes, sauf unité explicitement discriminée ;
- tempo : quatre phases `eccentric`, `bottomPause`, `concentric`, `topPause`,
  chacune en secondes ou `controlled`/`explosive` lorsqu'elle n'est pas
  quantifiée ;
- RPE : nombre de 1 à 10 ; RIR : entier de 0 à 10.

Une valeur affichée dans une autre unité est convertie à la frontière. Le
modèle ne mélange pas `90`, `"90s"` et `"1m30"`.

### Ownership

```text
ProgramOwner =
  | { kind: "platform"; platformId: "moovx" }
  | { kind: "coach"; coachId: UUID }
  | { kind: "client"; clientId: UUID }
```

Tout `TrainingProgram` possède exactement un owner. `platform` est explicite ;
`null` n'est jamais synonyme de plateforme. L'owner détermine qui peut modifier
le programme, pas qui peut l'exécuter.

### Provenance

```text
TrainingSource = {
  kind: "manual" | "catalog-template" | "ai" | "import" | "legacy";
  createdBy: { kind: "platform" | "coach" | "client" | "system"; id?: UUID };
  provider?: "anthropic" | "moovx-xlsx" | "strong" | "hevy" | string;
  legacyFormat?: LegacyFormatId;
  createdAt: Instant;
}
```

La provenance n'accorde aucune autorité. Une sortie IA ou un import doit être
validé exactement comme une saisie manuelle.

## Catalogue d'exercices

### `ExerciseCatalogEntry`

Mouvement de référence global :

```text
ExerciseCatalogEntry {
  id: UUID
  slug: string
  canonicalName: string
  localizedNames: map<Locale, string>
  primaryMuscles: MuscleId[]
  secondaryMuscles: MuscleId[]
  categories: ExerciseCategory[]
  equipment: EquipmentId[]
  variants: ExerciseVariant[]
  instructions?: LocalizedContent
  media: ExerciseMedia[]
  status: "active" | "deprecated" | "archived"
  replacementExerciseId?: UUID
  revision: integer
}
```

Le catalogue global est administré par une frontière serveur contrôlée. Un
navigateur authentifié peut le lire selon le contrat public, mais ne peut pas
le modifier directement.

### `ExerciseVariant`

Une variante précise une différence stable du mouvement sans dupliquer toute
la prescription :

```text
ExerciseVariant {
  id: UUID
  name: string
  equipment: EquipmentId[]
  stance?: string
  grip?: string
  laterality?: "bilateral" | "left" | "right" | "alternating"
  parentExerciseId: UUID
}
```

Une variante n'est pas une série ni une technique d'intensification. Les
techniques appartiennent à `TrainingExercise` ou `SetPrescription`.

### Référence d'exercice prescrite

```text
ExerciseReference =
  | { kind: "catalog"; exerciseId: UUID; variantId?: UUID; snapshotName: string }
  | { kind: "custom"; customExerciseId: UUID; ownerClientId: UUID; snapshotName: string }
  | { kind: "legacy"; legacyName: string; legacySource: LegacyFormatId }
```

La référence `legacy` est explicite et temporaire. Elle permet d'exécuter une
ancienne prescription sans prétendre qu'un rapprochement de nom est certain.

## Prescription de programme

### `TrainingProgram`

Racine versionnée de la prescription :

```text
TrainingProgram {
  id: UUID
  formatVersion: 1
  revision: integer
  owner: ProgramOwner
  source: TrainingSource
  kind: "template" | "personal"
  name: string
  description?: string
  goal?: TrainingGoal
  tags: string[]
  status: "draft" | "active" | "archived"
  weeks: TrainingWeek[]
  progressionRules: ProgressionRule[]
  createdAt: Instant
  updatedAt: Instant
}
```

Un template est copiable/assignable mais n'est pas directement exécutable. Un
programme personnel appartient au client et peut être affecté à ce même client
par une `AssignedProgram` explicite.

### `TrainingWeek`

```text
TrainingWeek {
  id: UUID
  index: integer >= 0
  name?: string
  repeatCount: integer >= 1
  days: TrainingDay[]
}
```

Les index sont uniques et continus dans le programme. `repeatCount` permet de
répéter une prescription sans dupliquer arbitrairement le JSON. Une phase de
périodisation se représente par une ou plusieurs semaines et des règles de
progression, pas par des champs `p1`/`p2`/`p3` non typés.

### `TrainingDay`

```text
TrainingDay =
  | {
      id: UUID
      index: integer >= 0
      kind: "rest"
      label: string
    }
  | {
      id: UUID
      index: integer >= 0
      kind: "training"
      label: string
      preferredWeekday?: IsoWeekday
      sessions: TrainingSession[]
    }
```

Le repos est un état discriminé, pas une combinaison de `repos`, `is_rest` et
tableau vide. Le weekday est une préférence ; l'ordre vient de `index` et n'est
jamais déduit de la position dans un objet français.

### `TrainingSession`

Séance prescrite, distincte de son exécution :

```text
TrainingSession {
  id: UUID
  index: integer >= 0
  name: string
  focusMuscles: MuscleId[]
  estimatedDurationSeconds?: integer
  blocks: TrainingBlock[]
  notes?: string
}
```

Plusieurs séances par jour sont possibles dans le modèle, même si l'interface
initiale n'en propose généralement qu'une.

### `TrainingBlock`

```text
TrainingBlock {
  id: UUID
  index: integer >= 0
  kind: "straight" | "superset" | "circuit" | "interval"
  rounds: integer >= 1
  exercises: TrainingExercise[]
  restAfterRound?: RestPrescription
}
```

Un bloc rend explicites les supersets et circuits. Une chaîne libre
`technique_details` peut rester dans les données legacy, mais n'est pas le lien
canonique entre deux exercices.

### `TrainingExercise`

```text
TrainingExercise {
  id: UUID
  index: integer >= 0
  exercise: ExerciseReference
  prescriptions: SetPrescription[]
  defaultRest: RestPrescription
  tempo?: TempoPrescription
  intensityTechnique?: IntensityTechnique
  progressionRuleId?: UUID
  coachingNotes?: string
}
```

Les index sont uniques dans leur bloc. Une prescription conserve un snapshot
du nom pour l'historique, mais l'identité catalogue reste l'UUID.

## Prescriptions de série et de repos

### `SetPrescription`

```text
SetPrescription {
  id: UUID
  index: integer >= 0
  target: SetTarget
  load?: LoadPrescription
  effort?: EffortPrescription
  restAfter?: RestPrescription
  warmup: boolean
}
```

```text
SetTarget =
  | { kind: "repetitions"; min: integer; max: integer }
  | { kind: "amrap"; minimum?: integer; safetyLimit?: integer }
  | { kind: "duration"; minSeconds: integer; maxSeconds?: integer }
  | { kind: "distance"; minMeters: number; maxMeters?: number }
```

```text
LoadPrescription =
  | { kind: "absolute"; value: number; unit: "kg" }
  | { kind: "bodyweight"; adjustmentKg?: number }
  | { kind: "percentage"; percent: number; reference: "1rm" | "training-max" }
  | { kind: "open" }
```

```text
EffortPrescription =
  | { kind: "rir"; min: integer; max: integer }
  | { kind: "rpe"; min: number; max: number }
  | { kind: "none" }
```

Une plage `8-12` devient `{ kind: "repetitions", min: 8, max: 12 }`.
`AMRAP` devient une variante dédiée. Une valeur incompréhensible ne reçoit pas
une valeur par défaut silencieuse.

### `RestPrescription`

```text
RestPrescription =
  | { kind: "fixed"; seconds: integer > 0 }
  | { kind: "range"; minSeconds: integer > 0; maxSeconds: integer >= min }
  | { kind: "until-ready"; minimumSeconds?: integer }
  | { kind: "none" }
```

### `ProgressionRule`

```text
ProgressionRule {
  id: UUID
  kind: "double-progression" | "load-step" | "rep-step" | "deload" | "manual"
  appliesTo: { trainingExerciseIds?: UUID[]; muscleIds?: MuscleId[] }
  condition: ProgressionCondition
  action: ProgressionAction
  bounds?: { minimumLoadKg?: number; maximumLoadKg?: number }
}
```

La règle produit une recommandation. Elle ne modifie pas rétroactivement une
exécution et n'écrase pas un programme sans commande explicite.

## Affectation et planification

### `AssignedProgram`

```text
AssignedProgram {
  id: UUID
  formatVersion: 1
  clientId: UUID
  assignedBy: { kind: "coach"; coachId: UUID } | { kind: "client"; clientId: UUID } | { kind: "system" }
  sourceProgramId: UUID
  sourceRevision: integer
  programSnapshot: TrainingProgram
  status: "scheduled" | "active" | "paused" | "completed" | "canceled" | "superseded"
  startsOn?: LocalDate
  timezone: IanaTimezone
  createdAt: Instant
  activatedAt?: Instant
  endedAt?: Instant
}
```

L'affectation contient un snapshot versionné. Modifier un template ne modifie
pas automatiquement une affectation active. Une mise à jour produit une
nouvelle révision/snapshot et une décision explicite de bascule.

Pour une affectation par coach, la création, la modification, l'activation et
la synchronisation exigent une relation `coach_clients` active vérifiée côté
serveur. La valeur `coachId` d'une requête navigateur n'est jamais une preuve.

Une occurrence calendrier future pourra référencer
`assignedProgramId + weekId + dayId + sessionId`, avec date locale et fuseau.
Elle reste une projection planifiée, pas une copie JSON autonome faisant
autorité.

## Exécution

### `SessionExecution`

```text
SessionExecution {
  id: UUID
  formatVersion: 1
  clientId: UUID
  assignedProgramId?: UUID
  programId: UUID
  programRevision: integer
  sessionId: UUID
  legacyReference?: LegacyExecutionReference
  status: "planned" | "in-progress" | "completed" | "abandoned"
  scheduledFor?: ZonedDateTime
  startedAt?: Instant
  completedAt?: Instant
  durationSeconds?: integer
  exercises: ExerciseCompletion[]
  notes?: string
}
```

Une exécution doit référencer une prescription canonique résolue. Pendant la
transition seulement, `legacyReference` peut porter table, ligne et chemin JSON
source ; cette référence est explicite, bornée et observable.

Le client peut créer/exécuter uniquement :

- une affectation dont `clientId` correspond à sa session ;
- son programme personnel actif ;
- une séance libre explicitement créée pour lui, représentée par un programme
  personnel minimal plutôt que par un owner absent.

### `ExerciseCompletion`

```text
ExerciseCompletion {
  id: UUID
  trainingExerciseId: UUID
  exercise: ExerciseReference
  status: "completed" | "partial" | "skipped"
  sets: SetCompletion[]
  notes?: string
}
```

```text
SetCompletion {
  id: UUID
  setPrescriptionId?: UUID
  index: integer >= 0
  status: "completed" | "skipped"
  repetitions?: integer
  durationSeconds?: integer
  distanceMeters?: number
  load?: { value: number; unit: "kg" }
  rir?: integer
  rpe?: number
  completedAt?: Instant
}
```

Une série peut dévier de la prescription ; la valeur réalisée est un fait et
n'écrase pas la cible. Le snapshot d'exercice protège l'historique contre les
renommages.

### `PersonalRecord`

```text
PersonalRecord {
  id: UUID
  clientId: UUID
  exercise: ExerciseReference
  kind: "max-load" | "max-repetitions" | "estimated-1rm" | "best-volume" | "best-duration" | "best-distance"
  value: number
  unit: "kg" | "repetitions" | "kg-repetitions" | "seconds" | "meters"
  sessionExecutionId: UUID
  exerciseCompletionId: UUID
  achievedAt: Instant
  previousRecordId?: UUID
}
```

Un record canonique est traçable jusqu'à une exécution. Un record legacy basé
uniquement sur `exercise_name` reste lisible via adaptateur, sans inventer un
`exerciseId`.

## Invariants métier et sécurité

### Structure

- `formatVersion`, owner, source et révision sont obligatoires.
- Les identifiants et index sont uniques dans leur parent.
- Un jour `rest` ne contient pas de séance.
- Un jour `training` contient au moins une séance ; une séance contient au
  moins un bloc ; un bloc contient au moins un exercice.
- Les plages sont ordonnées et respectent leurs bornes.
- Une prescription possède une cible explicite et des unités non ambiguës.
- Une référence catalogue/custom non résolue ne devient jamais automatiquement
  une autre référence par rapprochement de nom.
- Un format ou discriminant inconnu échoue avec une erreur typée et une trace
  expurgée ; il peut être placé en quarantaine pour analyse.

### Autorité

- Un coach ne crée, affecte, modifie ou synchronise un programme client que si
  la relation coach/client est active au moment de l'opération.
- Un client ne lit et n'exécute que ses affectations ou programmes personnels.
- Le catalogue global n'est pas mutable depuis le navigateur.
- Le service role n'est utilisé qu'après authentification et contrôle métier,
  dans une frontière serveur dédiée.
- L'ownership, `clientId`, `coachId` et les références d'affectation sont relus
  côté serveur ; les valeurs navigateur ne sont pas autoritaires.
- Les caches et projections calendrier ne décident jamais des droits.
- La RLS est une seconde frontière obligatoire, pas un remplacement des
  contrôles du service.

### Historique

- Une exécution terminée conserve la révision et les snapshots utilisés.
- Une modification de programme ne réécrit pas une exécution passée.
- La complétion de navigation et les séries réalisées doivent converger vers
  une seule commande transactionnelle future ; tant que les deux tables legacy
  subsistent, leur divergence est détectable et non masquée.
- Les suggestions de progression ne deviennent une prescription qu'après une
  décision explicite et versionnée.

## Validation et erreurs

Les futurs schémas Zod doivent exister aux frontières suivantes :

1. format canonique complet ;
2. chaque format legacy identifié ;
3. sortie IA avant création du modèle canonique ;
4. import tableur avant conversion ;
5. commandes d'affectation, planification et exécution.

Le parseur renvoie l'un des résultats suivants :

```text
CanonicalParseResult<T> =
  | { ok: true; value: T; warnings: CanonicalWarning[] }
  | { ok: false; error: TrainingFormatError; quarantine?: QuarantineReference }
```

Une `warning` ne peut concerner qu'une perte non structurelle documentée. Une
identité, unité, cible ou autorité ambiguë est une erreur.

## Formats legacy et adaptateurs attendus

Chaque adaptateur est nommé, versionné et unidirectionnel avant qu'un aller-
retour soit prouvé :

| Identifiant legacy | Source | Forme | Sortie canonique attendue |
|---|---|---|---|
| `coach-template-envelope-v1` | `training_programs.program` | `{ days, split, duration }` | `TrainingProgram(kind=template)` |
| `client-program-days-v1` | `client_programs.program` | tableau de jours nu | `AssignedProgram` + snapshot |
| `client-program-weekdays-fr-v1` | `client_programs.program` | objet `lundi..dimanche` | `AssignedProgram` + jours ordonnés |
| `custom-program-days-v1` | `custom_programs.days` | tableau personnel/IA | `TrainingProgram(kind=personal)` |
| `moovx-xlsx-v1` | import Excel | feuilles par jour/phases | programme personnel brouillon |
| `strong-hevy-csv-v1` | import externe | lignes par série | programme personnel brouillon avec avertissements de perte |
| `workout-history-v1` | sessions/séries SQL | entête + séries | `SessionExecution` |
| `completed-program-session-v1` | `completed_sessions` | index + nom | marqueur legacy rapproché d'une exécution si preuve disponible |

Les adaptateurs conservent dans un rapport : format source, identifiant de
ligne, avertissements, champs non reconnus et résultat. Ils ne modifient pas la
ligne source.

## Frontières futures

### Repositories

Les repositories attendus séparent lecture et écriture :

- `ExerciseCatalogRepository` et `CustomExerciseRepository` ;
- `TrainingProgramRepository` ;
- `AssignedProgramRepository` ;
- `TrainingScheduleRepository` ;
- `SessionExecutionRepository` ;
- `PersonalRecordRepository` ;
- `LegacyTrainingRepository`, limité à la période de coexistence.

Ils reçoivent un client Supabase typé injecté et ne déterminent pas seuls les
autorisations métier.

### Services

- création/édition/versionnement d'un programme ;
- affectation et synchronisation contrôlée ;
- résolution de la séance du jour ;
- démarrage, sauvegarde, reprise et finalisation d'exécution ;
- calcul de progression et de records ;
- import/génération puis validation canonique.

Les composants consomment ces services ou des hooks spécialisés ; ils ne
parsent plus directement les JSON de table.

### RLS à renforcer

Avant la bascule, des matrices dédiées doivent vérifier :

- propriété des programmes coach et personnels ;
- relation active pour lecture/écriture d'une affectation coach ;
- retrait immédiat des droits opérationnels après désactivation ;
- propriété des exécutions, séries et records ;
- lecture publique strictement bornée des templates ;
- impossibilité de modifier owner, client ou coach par mutation directe.

Le besoin éventuel de conserver un historique visible après rupture de relation
doit être un contrat de lecture explicite, distinct du droit de modification.

## Stratégie de migration progressive

### Étape 1 — Caractérisation

- constituer des fixtures anonymisées pour les quatre formats persistés ;
- couvrir les variantes de noms, repos, répétitions, périodisation et jours ;
- caractériser les producteurs et consommateurs actuels ;
- ajouter les matrices RLS Training.

### Étape 2 — Modèle pur et adaptateurs

- implémenter les types purs et schémas Zod dans `lib/training` ;
- écrire un adaptateur par `LegacyFormatId` ;
- produire des rapports de conversion déterministes ;
- tester les cas inconnus, incomplets et hostiles.

### Étape 3 — Repositories et double lecture

- créer les repositories sans modifier les tables ;
- lire legacy, convertir, puis comparer au résultat historique ;
- journaliser seulement des codes/compteurs expurgés ;
- conserver l'ancien chemin comme fallback borné par feature flag.

### Étape 4 — Persistance additive

Une migration éventuelle suit expand → migrate → contract : nouvelles colonnes
ou tables versionnées, backfill idempotent, double écriture contrôlée,
comparaison, bascule, puis suppression legacy dans une release ultérieure.
Cette étape n'est pas autorisée par la présente tranche.

### Étape 5 — Interfaces et exécution

- migrer un consommateur à la fois ;
- préserver les contrats publics pendant au moins une release ;
- couvrir affectation, séance du jour, sauvegarde, interruption/reprise et
  progression ;
- retirer un adaptateur uniquement après preuve d'absence de trafic legacy.

## E2E requis avant bascule

1. coach crée un modèle et l'affecte à un client activement lié ;
2. client lit l'affectation exacte et démarre la bonne séance ;
3. programme personnel manuel/IA/importé produit la même vue canonique ;
4. interruption, reprise et finalisation ne perdent aucune série ;
5. modification d'un template ne réécrit pas une affectation active ;
6. relation inactive bloque toute nouvelle mutation coach ;
7. format legacy inconnu est isolé sans corruption ;
8. historique, progression et records restent cohérents après renommage d'un
   exercice catalogue.

## Écarts explicitement hors périmètre

Cette définition ne corrige pas :

- les quatre formats persistés actuels ;
- les colonnes JSON sans schéma ;
- la coexistence de `completed_sessions` et `workout_sessions` ;
- les champs utilisés mais absents des types générés ;
- les accès Supabase directs ;
- les policies coach qui doivent revalider la relation active ;
- les données existantes ou leur fréquence réelle en production.

Elle ne crée aucune table d'entitlements Training, aucun RPC, aucune migration
et aucun mécanisme de synchronisation automatique.

## Critères d'acceptation du futur modèle implémenté

- toutes les fixtures legacy reconnues produisent un modèle canonique stable ;
- les données inconnues échouent sans mutation ;
- aucune dépendance React, Next, Supabase ou navigateur dans le modèle pur ;
- les unités et identités ne sont jamais implicites ;
- les repositories et services appliquent les règles d'autorité ;
- les matrices RLS et E2E critiques sont vertes ;
- l'ancien et le nouveau chemin concordent avant toute bascule ;
- le rollback applicatif conserve la lecture des données legacy.

## Références

- [Inventaire des formats Training](TRAINING_FORMATS_INVENTORY.md)
- [Types Supabase](SUPABASE_TYPES.md)
- [Matrice RLS](RLS_TEST_MATRIX.md)
- [Stratégie de tests](TESTING_STRATEGY.md)
- [Guide de contribution](CONTRIBUTING.md)
- [`lib/types/training.ts`](../lib/types/training.ts), type tolérant legacy
- [`lib/training/compute-progression.ts`](../lib/training/compute-progression.ts)
- [`lib/normalizeCoachProgram.ts`](../lib/normalizeCoachProgram.ts)
- [`lib/program-excel.ts`](../lib/program-excel.ts)
