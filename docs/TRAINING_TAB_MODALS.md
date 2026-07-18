# Organisation des modales de `TrainingTab`

## Principe

`TrainingTab` reste l'orchestrateur des états, des décisions métier et des accès Supabase. Les composants de modale reçoivent uniquement les données à afficher et des callbacks. Ils ne deviennent pas une frontière d'autorité et ne créent aucune nouvelle lecture ou mutation.

Les cinq overlays auparavant inline sont désormais séparés sous `app/components/tabs/training/modals/` :

- `TrainingTimerAlertModal` ;
- `TrainingProgramManagerModal` ;
- `TrainingImportPreviewModal` ;
- `TrainingVariantModal` ;
- `TrainingWorkoutHistoryModal`.

## Inventaire des overlays pilotés

| Vue | Condition ou état | Données principales | Fermeture et validation | Frontière existante |
|---|---|---|---|---|
| Alerte minuteur | `showTimerAlert` | message motivant, libellé de fin de repos | bouton ou timeout conservé dans `TrainingTab`; pas de fermeture backdrop | présentation extraite, centrée, `z-index: 9999` |
| Détail/séance terminée | `showSessionModal`, puis `todaySessionDone && trainingIsToday` | programme/jour actif, exercices, statut, dernière exécution | bouton de `SessionDetailModal`; callbacks de séance dans l'orchestrateur | `SessionDetailModal`/`SessionDoneModal` déjà dédiées, plein écran |
| Gestionnaire de programmes | `showProgramManager` | programmes personnels, accordéon, confirmation de suppression | bouton header ; créer/éditer ferme le manager avant le builder | présentation extraite, plein écran `z-index: 300`, scroll interne |
| Aperçu import | `importPreview` | programme parsé, nom, phases, jours, feuilles ignorées | bouton/header/backdrop ; confirmer prépare le démarrage puis ferme l'aperçu | présentation extraite, largeur 420 px, footer fixe et safe-area |
| Recherche d'exercice | `showExDbModal` | catalogue et recherche | bouton ; sélection appelle `addExerciseToSession` | `ExerciseSearchModal`, lectures Supabase historiques internes |
| Détail exercice | `exerciseDetail` | exercice et prescriptions | bouton/backdrop ; ajout puis fermeture | `ExerciseDetailModal` déjà dédié |
| Feedback vidéo | `videoExercise && userId` | exercice et utilisateur actif | bouton/backdrop ; envoi interne historique | `VideoFeedbackModal`, dépendance Supabase préexistante |
| Builder | `showProgramBuilder` | session, programme édité, droit IA | fermeture efface `editingProgram`; sauvegarde recharge les programmes | `ProgramBuilder` déjà dédié |
| Ajout d'exercice | `showAddExercise` | recherche et résultats | bouton/backdrop ; sélection respecte le mode édition ou séance | `AddExercisePopup` déjà dédié |
| Choix de sauvegarde | `showSaveChoice` | callbacks original/modifié | choix ou backdrop | `SaveChoicePopup` déjà dédié |
| Information exercice | `exerciseInfo` | fiche résolue | bouton/backdrop | `ExerciseInfoPopup` déjà dédié |
| Technique | `techniqueTooltip` | identifiant de technique | bouton/backdrop | `TechniqueTooltip` déjà dédié |
| Démarrage programme | `startModalProgram` | nom et éventuelles données d'import conservées dans l'orchestrateur | bouton/backdrop ; validation `now`/`monday`/`custom` | `StartProgramModal` déjà dédié, bottom sheet mobile |
| Variantes | `variantPopup` | cible jour/exercice conservée dans l'état, variantes affichées | bouton/backdrop ; sélection rappelle `selectEditVariant` | présentation extraite, bottom sheet 480 px/60 vh |
| Historique détaillé | `selectedWorkout` | séance, séries groupées, chargement | bouton header ; aucune mutation | présentation extraite, plein écran et scroll tactile |

`WorkoutCelebration` est un overlay visuel piloté par `workoutFinished`, sans action de modale. `VideoFeedbackHistory` reste monté pour l'utilisateur actif mais n'est pas une modale. Les modales cardio sont pilotées par le parent via `setModal` et ne sont pas rendues ici.

## Coordination préservée

- Fermer le gestionnaire efface aussi l'accordéon et la confirmation de suppression.
- Créer ou éditer ferme le gestionnaire avant d'ouvrir `ProgramBuilder`.
- Confirmer un import conserve les données parsées dans `startModalImportData`, ouvre la modale de démarrage, puis ferme l'aperçu.
- Fermer la modale de démarrage efface ensemble le programme et les données d'import.
- La sélection d'une variante conserve les indices jour/exercice jusqu'à l'application du choix.
- Fermer une vue ne modifie ni `trainingDay`, ni le programme actif, ni `workoutStarted`.

Les états restent indépendants lorsque le comportement historique le permet. Aucun gestionnaire global ou regroupement artificiel n'a été introduit.

## Limites

- Le contenu métier riche de la séance reste composé dans `TrainingTab`, à l'intérieur de la coque `SessionDetailModal`, car il manipule directement l'état d'exécution et d'édition. Son extraction relève de la réduction suivante de `TrainingTab`.
- Les composants historiques déjà dédiés conservent leurs types `any` et, pour certains, leurs accès Supabase internes ; cette tranche ne les refactorise pas.
- L'extraction ne garantit pas une exclusivité globale entre toutes les modales indépendantes. Elle préserve seulement les transitions incompatibles déjà explicites.
- La dette ESLint de `TrainingTab` reste historique malgré sa diminution.

Voir aussi [la caractérisation de `TrainingTab`](TRAINING_TAB_CHARACTERIZATION.md), [le programme actif et la navigation](TRAINING_ACTIVE_PROGRAM_DAY.md), [la bibliothèque d'exercices](TRAINING_EXERCISE_LIBRARY.md) et [l'historique des séances](TRAINING_SESSION_HISTORY.md).
