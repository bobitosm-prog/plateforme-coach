# Bibliothèque et recherche d'exercices Training

## Statut

Depuis le 18 juillet 2026, les décisions de recherche, filtrage, source et
sélection d'exercices partagées par les écrans Training passent par la
frontière pure
[`lib/training/exercise-library.ts`](../lib/training/exercise-library.ts).
Les requêtes Supabase, le rendu et les mutations existantes restent dans leurs
composants actuels.

## Comportements cartographiés

Trois consommateurs conservent volontairement des contrats distincts :

| Consommateur | Sources | Recherche | Filtre muscle | Ordre |
|---|---|---|---|---|
| `ExerciseLibrarySection` | `exercises_db` déjà chargé par `TrainingTab` | en mémoire, nom, casse ignorée | alias UI, notamment `Jambes` | ordre reçu, aperçu limité ensuite à 5 |
| `ExerciseSearchModal` | `exercises_db`, liste initiale puis recherche serveur à partir de 2 caractères | `ilike` serveur, résultats bornés à 10 | égalité exacte historique | ordre renvoyé par la requête |
| `ProgramBuilder` | catalogue puis `custom_exercises` du propriétaire | en mémoire, nom, casse ignorée | égalité sans tenir compte de la casse | catalogue puis personnalisés, ordre reçu |

La frontière ne remplace pas la recherche serveur de la modale et n'ajoute
aucune requête. Elle filtre seulement les résultats déjà obtenus.

## Contrat pur

- `normalizeExerciseSearchText` met les formes Unicode équivalentes en NFC et
  ignore la casse ; il ne supprime pas les accents ni les espaces, afin de ne
  pas inventer une recherche plus permissive.
- `resolveLegacyExerciseName` reconnaît, dans l'ordre, `name`,
  `exercise_name`, `custom_name` puis `exerciseName`.
- `searchExerciseLibrary` conserve l'ordre d'entrée, applique le contrat de
  muscle demandé par le consommateur et renvoie séparément les entrées sans nom
  exploitable dans `unsupported`.
- `combineExerciseLibraries` conserve le catalogue avant les exercices
  personnels et marque uniquement ces derniers avec `_custom`.
- `resolveExerciseLibrarySource` distingue `catalog` et `custom` sans déduire
  la source du seul nom.
- `findExerciseAlternatives` garde l'ordre du catalogue, la même cible
  musculaire sans tenir compte de la casse, exclut l'exercice sélectionné et
  conserve la limite historique de trois résultats.
- `collectProgramExerciseNames` conserve la première occurrence de chaque nom
  legacy pour les raccourcis du programme actif.
- `resolveFreeSessionExercise` et `resolveAddedExercise` produisent les mêmes
  prescriptions par défaut que les flux actuels avant de transmettre la
  sélection au démarrage ou à l'ajout.

## Doublons et ordre

Aucune nouvelle déduplication par nom n'est appliquée. Un exercice catalogue
et un exercice personnel portant le même nom restent deux choix distincts,
car leurs identités et leurs autorités diffèrent. Les noms répétés dans les
raccourcis d'un même programme restent, comme auparavant, réduits à leur
première occurrence exacte. Les résultats de recherche gardent toujours
l'ordre fourni par leur source.

## Limites conservées

- La bibliothèque principale de `TrainingTab` ne charge que le catalogue
  global ; les exercices personnels apparaissent actuellement dans
  `ProgramBuilder`, pas dans cette section.
- Aucun filtre d'équipement n'existe dans ces interfaces ; l'équipement reste
  une information affichée, pas une nouvelle règle de recherche.
- Les alias musculaires ne sont utilisés que par `ExerciseLibrarySection` ; la
  modale et `ProgramBuilder` conservent leurs égalités historiques.
- Une recherche sans accent ne correspond pas à un nom accentué.
- La modale continue à dépendre de la collation et du comportement `ilike` de
  Supabase pour sa recherche distante.
- Le remplacement d'une alternative reste une mutation existante de
  `custom_programs`; cette tranche ne la déplace ni ne l'étend.
- Les lignes sans nom exploitable sont isolées du rendu, mais ne sont ni
  corrigées ni persistées.

## Tests

- [`training-exercise-library.test.ts`](../tests/unit/training-exercise-library.test.ts)
  couvre recherche vide, casse, accents, quatre noms legacy, muscles, sources,
  ordre, identités homonymes, alternatives, entrées inconnues et sélections.
- [`training-exercise-library-static.test.ts`](../tests/unit/training-exercise-library-static.test.ts)
  vérifie le branchement des trois consommateurs et l'absence de dépendance UI,
  Supabase ou réseau dans la frontière pure.
- La [caractérisation de `TrainingTab`](TRAINING_TAB_CHARACTERIZATION.md) reste
  le filet de non-régression du rendu général.
