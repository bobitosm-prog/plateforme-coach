# Inventaire des formats Training

## Statut et périmètre

**Statut : vérifié le 17 juillet 2026.**

Ce document photographie les formats de programmes, séances, exercices et
progression réellement présents dans MoovX avant la définition d'un modèle
Training canonique. Il décrit l'existant ; il ne choisit pas encore le futur
format et ne rend aucune représentation legacy normative.

L'inventaire a été établi à partir :

- des migrations Supabase et des [types générés](SUPABASE_TYPES.md) ;
- des producteurs et lecteurs dans `app/` et `lib/` ;
- des seeds, imports Excel, générations IA et tests ;
- des policies actuelles, rapprochées de la [matrice RLS](RLS_TEST_MATRIX.md).

Les mots « programme », « séance » et « exercice » désignent plusieurs objets
différents dans le dépôt. La première règle de lecture est donc de toujours
préciser la table et le format JSON concernés.

## Résumé exécutif

Il n'existe pas une source de vérité Training unique :

1. `training_programs` stocke les modèles créés par un coach ;
2. `client_programs` stocke une copie affectée à un client ;
3. `custom_programs` stocke les programmes personnels, manuels ou IA ;
4. `exercises_db` est le catalogue partagé et `custom_exercises` le catalogue
   personnel ;
5. `workout_sessions` + `workout_sets` enregistrent l'exécution détaillée ;
6. `completed_sessions` enregistre séparément la progression dans une
   affectation coach ;
7. `scheduled_sessions` matérialise le calendrier, sans être le programme
   source ;
8. `personal_records` et les fonctions de progression dérivent des séries
   réalisées, principalement par nom d'exercice.

Les trois contenus de programme sont des `Json` non contraints dans PostgreSQL
et dans les types générés. Les variantes principales sont :

- une enveloppe `{ days, split, duration }` dans `training_programs.program` ;
- un tableau de jours nu dans certaines lignes `client_programs.program` ;
- un objet indexé par les jours français dans d'autres lignes
  `client_programs.program` ;
- un tableau de jours, normalement limité ou complété à sept éléments, dans
  `custom_programs.days`.

## Sources de vérité et responsabilités actuelles

| Source | Propriétaire fonctionnel | Contenu | Autorité réelle |
|---|---|---|---|
| `exercises_db` | plateforme/communauté | catalogue d'exercices, muscles, matériel, médias, traductions | PostgreSQL pour les lignes ; conventions applicatives pour leur emploi dans un programme |
| `custom_exercises` | utilisateur | exercice personnel et valeurs par défaut de séries/répétitions/repos | PostgreSQL + RLS propriétaire |
| `training_programs` | coach | modèle réutilisable et tags | ligne SQL, mais structure de `program` implicite |
| `client_programs` | coach/client | copie affectée et lien optionnel vers le modèle | ligne SQL, mais structure de `program` implicite |
| `custom_programs` | client, IA ou coach autorisé | programme personnel actif, planification et périodisation | ligne SQL, mais `days` et `phases` restent libres |
| `scheduled_sessions` | calendrier client/coach | occurrence datée copiée depuis un programme | projection mutable, pas source du programme |
| `workout_sessions` | client | entête d'une exécution | historique détaillé avec `workout_sets` |
| `workout_sets` | client | séries effectivement réalisées | source des volumes et de la surcharge progressive |
| `completed_sessions` | client/coach | séance d'une affectation coach considérée terminée | historique de navigation distinct de `workout_sessions` |
| `personal_records` | client | records dérivés ou enregistrés | projection par `exercise_name`, sans FK catalogue |

Les types de table sont générés dans
[`lib/supabase/database.types.ts`](../lib/supabase/database.types.ts). Les
structures JSON ne le sont pas : elles restent du type générique `Json`.

## Formats persistés

### Catalogue d'exercices partagé

`exercises_db` part d'un catalogue seedé et enrichi par des migrations
successives. Son identité stable est `id`; `name` est unique mais reste aussi
utilisé comme identité fonctionnelle dans plusieurs flux. Le catalogue contient
notamment les familles suivantes :

- nom, groupe musculaire, matériel et groupe de variantes ;
- instructions, description et conseils d'exécution ;
- médias image/GIF/vidéo ;
- variantes, muscles et tags structurés selon les enrichissements ;
- noms et descriptions localisés.

Le seed principal est
[`20260317010000_seed_exercises_catalog.sql`](../supabase/migrations/20260317010000_seed_exercises_catalog.sql),
puis des migrations de média, traduction et enrichissement complètent les
lignes. Des scripts dans `scripts/` réalisent aussi des backfills. Il faut donc
distinguer le schéma du catalogue, son contenu seedé et ses enrichissements.

`custom_exercises` utilise un format plus petit : `name`, `muscle_group`,
`equipment`, `description`, `sets`, `reps`, `rest_seconds`, `image_url` et
`is_private`. Ces valeurs de prescription sont attachées au catalogue
personnel, alors que `exercises_db` décrit surtout le mouvement.

### Modèle coach : `training_programs`

La ligne SQL contient `id`, `coach_id`, `name`, `description`, `is_template`,
`tags`, `created_at` et `program Json`.

Le producteur principal, `CoachPrograms`, écrit actuellement :

```json
{
  "days": [
    {
      "name": "Push",
      "exercises": [
        { "name": "Développé couché", "sets": 4, "reps": "8-10", "rest": 90 }
      ]
    }
  ],
  "split": "PPL",
  "duration": "60 min"
}
```

Caractéristiques :

- le programme est enveloppé dans `program.days` ;
- `reps` est une chaîne dans l'éditeur coach ;
- le repos s'appelle `rest` et est exprimé en secondes ;
- un exercice est identifié par `name`, sans FK obligatoire vers
  `exercises_db` ;
- les jours n'ont pas nécessairement de `weekday` ni de `day_number`.

### Affectation coach/client : `client_programs`

La ligne canonique contient `id`, `client_id`, `coach_id`, `program Json`,
`training_program_id`, `created_at` et `updated_at`. Deux formes JSON sont
effectivement produites ou acceptées.

**Tableau de jours nu**, écrit lors d'une affectation depuis un modèle :

```json
[
  { "name": "Push", "exercises": [{ "name": "Développé couché", "sets": 4, "reps": "8-10", "rest": 90 }] }
]
```

**Objet hebdomadaire legacy**, écrit ou normalisé dans le détail client :

```json
{
  "lundi": {
    "day_name": "Push",
    "repos": false,
    "exercises": [{ "name": "Développé couché", "sets": 4, "reps": 10, "rest": "90" }]
  },
  "mardi": { "repos": true, "exercises": [] }
}
```

[`lib/normalizeCoachProgram.ts`](../lib/normalizeCoachProgram.ts) accepte les
deux formes. Pour un tableau, l'index `0..6` est implicitement associé à
`lundi..dimanche`; `is_rest` et `repos` sont tous deux reconnus. Un objet est
accepté tel quel, sans validation de ses clés.

`training_program_id` relie facultativement la copie à son modèle, mais le JSON
est dupliqué pour préserver l'affectation. La synchronisation d'un modèle vers
ses affectations est une opération applicative explicite, pas une garantie SQL.

### Programme personnel : `custom_programs`

La ligne contient `name`, `description`, `days Json`, `source`, `is_active`,
`scheduled`, `start_date`, `total_weeks`, `current_week`, `phases Json` et
`user_id`.

`ProgramBuilder`, la génération initiale et la régénération IA utilisent un
tableau de jours :

```json
[
  {
    "day_number": 1,
    "name": "Push A",
    "weekday": "lundi",
    "focus": "Poitrine, épaules, triceps",
    "muscle_groups": ["chest", "shoulders", "triceps"],
    "is_rest": false,
    "exercises": [
      {
        "custom_name": "Développé couché",
        "muscle_primary": "Poitrine",
        "sets": 4,
        "reps": 8,
        "rest_seconds": 120,
        "order": 1,
        "tempo": "2-0-2",
        "technique": null,
        "technique_details": ""
      }
    ]
  }
]
```

Le format exact dépend toutefois du producteur : l'éditeur emploie aussi
`name`, `muscle_group`, `rest` et `isCustom`; la génération IA produit plutôt
`custom_name`, `muscle_primary`, `rest_seconds` et `order`. Le chargement de la
séance ajoute ou duplique `name` et `exercise_name`, complète les jours à sept,
puis applique des valeurs par défaut.

La périodisation a deux représentations observables :

- `custom_programs.phases`, tableau libre avec bornes de semaines et paramètres ;
- `exercise.phases`, réglages par exercice, notamment importés depuis Excel.

Les colonnes `total_weeks` et `current_week` portent l'avancement global, mais
aucune contrainte ne relie leur valeur au contenu JSON de `phases`.

### Planification : `scheduled_sessions`

Cette table cumule deux vocabulaires historiques :

- `user_id`, `scheduled_date`, `scheduled_time`, `duration_min` ;
- `coach_id`, `client_id`, `scheduled_at`, `duration_minutes`.

Elle contient également `title`, `session_type`, `status`, `completed`,
`completed_at`, `notes` et des horodatages. Les écrans Training copient les
jours d'un programme vers le calendrier. Aucun lien obligatoire vers
`custom_programs`, `client_programs` ou une journée JSON n'assure ensuite leur
synchronisation.

### Exécution détaillée : `workout_sessions` et `workout_sets`

`workout_sessions` contient dans les types générés : `id`, `user_id`, `name`,
`completed`, `duration_minutes`, `notes`, `muscles_worked` et `created_at`.

`workout_sets` contient : `session_id`, `user_id`, `exercise_id` optionnel,
`exercise_name` obligatoire, `set_number`, `reps`, `weight`, `rir`, `completed`
et `created_at`. Le nom est donc conservé même lorsqu'un exercice catalogue est
lié.

Le modèle runtime de `WorkoutSession` est encore différent :

- exercice : `targetSets`, `targetReps`, `rest`, `exerciseId`, médias et tableau
  local de séries ;
- série : identifiant local, numéro, poids brut/normalisé, répétitions, `done`
  et `rir`.

La persistance transforme ce modèle local en une ligne de session et plusieurs
lignes de séries. Les callbacks et plusieurs entrées de composant restent
typés largement (`any`), de sorte que cette transformation est un contrat
implicite du composant.

### Progression d'une affectation : `completed_sessions`

Cette table mémorise `program_id` (FK vers `client_programs`), `session_index`
zéro-based, `session_name` dénormalisé, `client_id`, `coach_id`, durée, notes et
date de complétion.

Elle sert à choisir la prochaine journée du programme coach et aux statistiques
coach. Elle ne référence pas `workout_sessions`. Une même action utilisateur
peut donc alimenter l'historique détaillé et l'historique d'affectation sans
garantie transactionnelle entre les deux.

### Records et surcharge progressive

`personal_records` identifie l'exercice par `exercise_name`, puis stocke
`record_type`, `value`, `unit`, `previous_value` et `achieved_at`. Les noms ne
sont pas reliés au catalogue et peuvent diverger à la suite d'un renommage ou
d'une traduction.

[`lib/training/compute-progression.ts`](../lib/training/compute-progression.ts)
calcule une recommandation pure à partir des séries précédentes (`weight`,
`reps`, `completed`, `rir`) et d'une cible de répétitions. Le résultat
`progress`, `hold` ou `deload` est calculé mais ne constitue pas un format de
programme persisté canonique.

## Formats d'entrée et adaptateurs

### Génération IA

[`lib/training/generate-program.ts`](../lib/training/generate-program.ts)
demande un objet `{ program_name, description, days }`. Chaque jour porte
`day_number`, `name`, `focus`, `muscle_groups` et `exercises`; chaque exercice
porte `custom_name`, `muscle_primary`, `sets`, `reps`, `rest_seconds`, `order`,
`tempo`, `technique` et `technique_details`.

Le schéma du tool Anthropic valide cette réponse au niveau fournisseur, mais la
colonne `custom_programs.days` n'impose ensuite aucun schéma. L'API et le cron
de régénération sont deux producteurs du même format attendu.

### Import/export tableur

[`lib/program-excel.ts`](../lib/program-excel.ts) accepte les classeurs MoovX
ainsi que des exports Strong/Hevy ligne par série. L'import reconnaît plusieurs
noms (`name`, `exercise_name`, `custom_name`, `exerciseName`), `rest` ou
`rest_seconds`, et encode des phases `p1`, `p2`, `p3` dans les exercices.

Pour Strong/Hevy, les lignes de séries sont regroupées en un exercice : le
nombre de séries est recompté et les répétitions deviennent une valeur agrégée.
Le détail de charge par série n'est pas un paramètre de prescription conservé
dans le programme importé.

### Type tolérant partagé

[`lib/types/training.ts`](../lib/types/training.ts) documente volontairement les
variantes, sans les normaliser :

- quatre clés de nom (`name`, `exercise_name`, `custom_name`, `exerciseName`) ;
- trois clés de muscle (`muscle_group`, `muscle_primary`, `muscle`) ;
- deux clés de repos (`rest`, `rest_seconds`), chacune nombre ou chaîne ;
- `reps` nombre ou chaîne (`8-12`, `AMRAP`) ;
- jours nommés par `name`, `day_name` ou `weekday` ;
- repos journalier par `is_rest` ou, hors de ce type, `repos` ;
- marqueur custom `_custom` alors que certains écrans écrivent `isCustom`.

Ce type est une preuve de compatibilité legacy, pas un modèle canonique.

## Lecteurs et producteurs principaux

| Zone | Lecture | Écriture / transformation |
|---|---|---|
| `CoachPrograms` | modèles et affectations | CRUD `training_programs`, copie/synchronisation de `client_programs` |
| `useClientDetail` / `ClientProgram` | programme coach et personnel | conversion tableau ↔ objet hebdomadaire, édition de l'affectation |
| `useClientDashboard` | affectation, programme personnel, templates et historiques | création session/séries, enregistrement `completed_sessions` |
| `TrainingTab` | programmes personnels, calendrier et historique | activation, planification, édition JSON, sessions et séries |
| `ProgramBuilder` | `custom_programs.days` | création/édition manuelle ou depuis IA/import |
| `WorkoutSession` | prescription d'une journée | exécution runtime puis persistance session/séries |
| routes génération/cron | profil + catalogue | production/régénération de `custom_programs` |
| analytics/progression | sessions, séries et records | agrégats, records et suggestions |

La majorité de ces zones appelle Supabase directement. Le seul début de
frontière Training dédié repéré est le chargement injectable du catalogue dans
`lib/training/load-exercise-catalog.ts`; il n'existe pas encore de repositories
programmes/séances/exercices couvrant le domaine.

## Divergences vérifiées

### Noms et primitives

| Concept | Variantes observées |
|---|---|
| nom d'exercice | `name`, `exercise_name`, `custom_name`, `exerciseName` |
| muscle | `muscle_group`, `muscle_primary`, `muscle`, `muscle_groups[]` au jour |
| repos | `rest`, `rest_seconds`; nombre, chaîne, suffixes `s`/`min` |
| répétitions | nombre, plage texte, `AMRAP` |
| jour de repos | `is_rest`, `repos` |
| nom du jour | `name`, `day_name`, `weekday`, ou clé `lundi..dimanche` |
| exercice custom | `_custom`, `isCustom`, ou absence de marqueur |
| session terminée | `completed` dans `workout_sessions`, ligne dans `completed_sessions`, `completed`/`status` dans `scheduled_sessions` |

### Code et schéma canonique

- `CoachPrograms` lit et écrit `client_programs.program_name`, mais cette
  colonne est absente des migrations canoniques et des types générés.
- `useClientDetail` emploie `client_programs.week_start`, également absent du
  schéma canonique généré.
- `TrainingTab` et le RPC de résumé utilisent `workout_sessions.date`, tandis
  que les types générés n'exposent que `created_at`.
- certains appels manipulent `workout_sessions.personal_records`, absent de la
  table générée ; les records ont leur propre table.
- le RPC `get_workout_session_summary` référence lui aussi
  `workout_sessions.date`, ce qui signale une divergence de migration semblable
  aux écarts historiques déjà rencontrés dans d'autres domaines.
- la procédure de suppression de compte référence `training_programs.created_by`,
  colonne absente des types générés actuels.

Ces constats ne prouvent pas qu'aucun environnement ancien ne possède ces
colonnes ; ils prouvent qu'elles ne font pas partie du schéma canonique local
généré. Elles ne doivent pas être ajoutées artificiellement sans décision de
migration.

### Duplication et synchronisation

- un modèle coach est copié dans une affectation ; la copie peut ensuite
  diverger du modèle ;
- un programme personnel peut représenter le même entraînement qu'une
  affectation coach sans lien entre les deux ;
- une planification copie une journée sans FK vers sa source ;
- une complétion peut exister dans `workout_sessions`, `completed_sessions` et
  `scheduled_sessions` sans transaction commune ;
- les exercices sont souvent reliés par nom malgré l'existence d'un identifiant
  catalogue.

### Frontières et typage

- aucune validation Zod commune ne protège les colonnes JSON Training ;
- les composants redéfinissent des interfaces locales incompatibles ;
- des adaptateurs importants sont intégrés aux hooks/composants ;
- les entrées/sorties de `WorkoutSession` et plusieurs transformations restent
  en `any` ;
- les accès Supabase directs sont répartis entre les dashboards, composants,
  hooks et routes, sans repository Training commun.

## État RLS et risques d'autorité

Les protections propriétaires de `workout_sessions`, `workout_sets`,
`custom_programs`, `custom_exercises`, `scheduled_sessions` et
`personal_records` reposent principalement sur `auth.uid() = user_id`.
`training_programs` permet au coach propriétaire de gérer ses lignes et rend
les templates lisibles. `client_programs` autorise le client en lecture et le
coach lorsque `auth.uid() = coach_id`.

Risques à traiter lors des matrices RLS Training, sans correction dans cette
tranche :

- les policies coach sur `client_programs` se fondent sur la colonne
  `coach_id`, sans revalider une relation `coach_clients` active ;
- les policies coach historiques sur `custom_programs` vérifient l'existence
  d'une relation mais pas explicitement son statut actif ;
- `completed_sessions_coach_read` compare directement le `coach_id` mémorisé,
  sans définir si l'accès historique doit survivre à la relation ;
- les JSON libres permettent à un auteur pourtant autorisé de persister une
  forme illisible par un autre consommateur ; la RLS ne valide pas la structure ;
- la lecture publique des templates expose leur JSON complet par conception ;
  le futur contrat devra préciser les champs publiables.

Aucune faille P0 nouvelle n'est affirmée ici : ces points demandent un contrat
d'autorité et des tests de matrice avant toute modification de policy.

## Couverture de tests observée

Les tests unitaires directement nommés pour le noyau Training couvrent surtout :

- la surcharge progressive pure dans `compute-progression.test.ts` ;
- un contrat statique de types/session dans `session-types-hero.test.ts`.

Des tests adjacents couvrent certains helpers, imports ou parcours dashboard,
mais il n'existe pas de jeu de fixtures représentatif de toutes les formes JSON
ci-dessus, ni de test de compatibilité systématique producteur → consommateur.
Il n'existe pas encore d'E2E intégré de création, affectation, exécution,
interruption et reprise d'un programme Training.

## Conséquences pour le futur modèle canonique

La prochaine tâche devra décider, sans encore migrer les données :

1. l'identité stable de programme, journée, exercice prescrit et occurrence ;
2. la séparation entre modèle, affectation, programme personnel et projection
   calendrier ;
3. un ordre de jours explicite, sans déduire le weekday du seul index ;
4. les unités et types canoniques de séries, répétitions, repos, tempo et RIR ;
5. la référence catalogue avec snapshot de nom nécessaire à l'historique ;
6. la représentation de la périodisation et de l'avancement ;
7. le lien entre prescription, exécution détaillée et complétion ;
8. les états legacy acceptés par des adaptateurs dédiés ;
9. les frontières repository/service et le contrat RLS par acteur ;
10. les invariants validables avant persistance.

Le modèle devra rester compatible en lecture avec les tableaux, objets
hebdomadaires et enveloppes existants. La migration suivra ensuite une approche
adaptateurs legacy ↔ canonique, comparaison sur fixtures, puis bascule
progressive ; aucun format ne doit être réécrit en place dans cette étape de
conception.

## Limites de l'inventaire

- La cartographie décrit le dépôt et le schéma local généré, pas des données de
  production qui n'ont pas été consultées.
- La fréquence réelle de chaque variante JSON reste inconnue sans extraction
  anonymisée d'un environnement dédié.
- Les formats de médias, cardio, nutrition et diagnostics ne sont inclus que
  lorsqu'ils produisent ou consomment un programme de musculation.
- Les anciens documents d'audit peuvent contenir des intentions ; seules les
  formes confirmées par le code, les migrations ou les tests actuels sont
  présentées comme existantes.

## Références

- [Types Supabase](SUPABASE_TYPES.md)
- [Stratégie de tests](TESTING_STRATEGY.md)
- [Matrice RLS](RLS_TEST_MATRIX.md)
- [Guide de contribution](CONTRIBUTING.md)
- [`lib/types/training.ts`](../lib/types/training.ts)
- [`lib/normalizeCoachProgram.ts`](../lib/normalizeCoachProgram.ts)
- [`lib/program-excel.ts`](../lib/program-excel.ts)
- [`lib/training/generate-program.ts`](../lib/training/generate-program.ts)
- [`lib/training/compute-progression.ts`](../lib/training/compute-progression.ts)

