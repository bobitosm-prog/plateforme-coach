# Architecture de `TrainingTab`

## Portée

Cette tranche réduit la façade publique historique sans modifier son export,
ses props, ses requêtes Supabase ou son rendu. Le comportement reste protégé
par les tests de caractérisation décrits dans
[`TRAINING_TAB_CHARACTERIZATION.md`](TRAINING_TAB_CHARACTERIZATION.md).

## Découpage actuel

| Frontière | Responsabilité | Taille mesurée |
|---|---|---:|
| `TrainingTab.tsx` | export public et délégation | 7 lignes |
| `TrainingTabController.tsx` | orchestration, état legacy, mutations et composition du runtime | 454 lignes |
| `TrainingTabView.tsx` | séance du jour, barre active, historique, bibliothèque et cardio | 283 lignes |
| `TrainingTabOverview.tsx` | en-tête, calendrier, programmes personnels et coach | 275 lignes |
| `TrainingTabOverlays.tsx` | coordination des modales et transitions entre overlays | 217 lignes |
| `TrainingProgramDayEditor.tsx` | présentation et callbacks de l'éditeur de jour | 125 lignes |
| `TrainingSessionExerciseList.tsx` | cartes d'exercices, supersets et actions de séance | 119 lignes |
| `useTrainingWorkoutTimer.ts` | séries locales, minuteur de repos, durée et wake lock | 157 lignes |
| `useTrainingProgramEditor.ts` | édition locale du programme et variantes | 93 lignes |
| `useTrainingExerciseCatalog.ts` | cache catalogue et recherche d'ajout | 41 lignes |
| `useTrainingSessionHistory.ts` | historique récent et détail des séries | 41 lignes |

Les composants de présentation reçoivent des callbacks ; ils ne créent pas de
client Supabase et ne deviennent pas une nouvelle autorité métier. Les trois
lectures `select('*')` historiques sont conservées sans duplication : deux sur
`custom_programs` et une sur `exercises_db`. Leur remplacement par des
projections/repositories reste une dette distincte.

## Contrats préservés

- priorité programme personnel actif, puis programme coach, puis absence ;
- navigation semaine/jour et gestes tactiles ;
- séances programmées, libres, repos et progression périodisée ;
- séries, entrées locales, minuteur, audio, vibration et wake lock ;
- import Excel, activation, planification, édition et suppression ;
- historique récent et détail des séries ;
- bibliothèque, variantes, feedback vidéo et toutes les modales existantes ;
- callbacks `startProgramWorkout`, `fetchAll`, `checkForPR` et `setModal`.

## Dette restante

- Le contrôleur conserve les types dynamiques et les accès Supabase historiques
  afin de ne pas mélanger migration de données et découpage visuel.
- Sa dette ESLint informative passe de 63 erreurs/9 avertissements à
  35 erreurs/1 avertissement ; les nouvelles frontières typées sont vertes.
- Les minuteries sont testées statiquement et via la suite existante, sans test
  navigateur dédié à l'arrière-plan mobile.
- `WorkoutSession` reste le prochain chantier ; ses états et transitions doivent
  être décrits avant toute extraction.

## Garde statique

`tests/unit/training-tab-facade-static.test.ts` impose le seuil de 500 lignes à
la façade et à chaque frontière, vérifie l'unicité des blocs extraits, l'absence
de nouvel `any` dans les nouveaux modules typés et le nombre inchangé de
requêtes wildcard legacy.
