# Matrice d'autorité des agrégations Progression

> Audit RC1 du 24 juillet 2026. Les sources indépendantes restent distinctes ;
> aucune correspondance n'est inventée entre `workout_sessions`,
> `completed_sessions` et les autres historiques.

## Résultat

Deux duplications Epley et dix duplications de tonnage ont été remplacées
sans modifier leurs entrées, filtres, arrondis ou sorties visibles :

- `useAnalytics.checkForPR` utilise `estimatedOneRepMax` ;
- la sélection du meilleur set utilise `bestSetByEstimatedOneRepMax` ;
- les dix calculs de tonnage des dashboards, de la séance, des éditeurs,
  de l'historique, du diagnostic et des badges utilisent `legacyTonnage`.

Les transformations de libellé, tri, regroupement visuel et export ne sont pas
des autorités métier. Les variantes restantes ont des sources ou fenêtres
contractuellement différentes.

## Matrice

| Métrique | Autorité | Sources/fenêtres acceptées | Consommateurs | Variante intentionnelle |
|---|---|---|---|---|
| Sets, répétitions, tonnage | `aggregateCompletedSets`, `legacyTonnage` | `workout_sets`; canonique strict ou fallback zéro legacy | read models, dashboard desktop, séance | 7 jours desktop vs 28 jours analytics |
| Tonnage hebdomadaire | `groupLegacyWeeklyTonnage`, `groupMixedLocalUtcLegacyWeeklyTonnage` | sets complétés, 28 jours | read model, `useAnalytics` | clé lundi canonique vs regroupement local/UTC |
| e1RM / meilleur set | `estimatedOneRepMax`, `bestSetByEstimatedOneRepMax`, `buildLegacyExerciseProgression` | sets positifs, Epley, dixième | `useAnalytics`, fin de séance, `AnalyticsSection` | regroupement historique par nom |
| Poids/delta/moyenne/objectif | `sortWeights`, `weightDelta`, `movingAverageByObservation`, `weightGoalProgress` | `weight_logs`, fenêtre/observations explicites | ProgressTab/read models/analytics presenter | mois civil, période UI et 30 jours restent distincts |
| Mensurations | `measurementDelta` | `body_measurements`, cm | Progression | lignes d'export : présentation seulement |
| Streaks/régularité | `trainingStreak`, `activeMondayWeeks`, `legacyCoachStreak` | dates locales ou UTC explicitement nommées | dashboard client/coach | repos local et streak coach UTC non fusionnés |
| Calories/macros | `aggregateNutritionByDate`, `aggregateLegacyNutritionByDate` | `daily_food_logs`, zéro legacy explicite | read model/analytics | diagnostic sur jours renseignés |
| Eau | `aggregateWaterByDate`, `aggregateLegacyWaterByDate` | `water_intake`, ml | read model/presenter CSV | conversion litres uniquement en présentation |
| Comptages de séances | read models séparés | `workout_sessions`, `completed_sessions`, `scheduled_sessions` | ProgressTab, coach, diagnostic | trois faits indépendants |
| Séries graphiques/export | `analytics-presenter.ts` | agrégats déjà calculés | `AnalyticsSection`, CSV/XLSX | formatage, tri et labels seulement |

## Garde

`npm run progression:authority:check` analyse l'AST de tous les fichiers
TypeScript/JavaScript sous `app/` et `lib/`, à l'exception du noyau autoritaire
`lib/progression/`. Elle refuse toute nouvelle formule Epley ou multiplication
poids×répétitions hors de ce noyau. Les deux exceptions Training
`session-history.ts` et `workout-session-model.ts` sont exactes et versionnées
dans `aggregation-authority-baseline.ts` : elles calculent l'état propre d'une
séance, pas une métrique Progression issue d'un historique partagé. Une
occurrence nouvelle ou une exception devenue obsolète fait échouer la
commande. La garde ne consulte pas Git.

Les tests utilisent des fixtures synthétiques pour prouver l'équivalence
Epley, le tie-break stable, le fallback zéro du tonnage, les échecs sur
duplication et l'acceptation des transformations purement visuelles.

## Divergences conservées

- `workout_sessions` et `completed_sessions` ne sont pas fusionnés ;
- semaine locale canonique et regroupement hebdomadaire local/UTC restent
  nommés séparément ;
- fenêtres 7, 28 et 30 jours et mois civil restent distinctes ;
- le streak local avec repos et le streak coach UTC restent différents ;
- les inconnus Nutrition ne deviennent zéro que dans les fonctions `legacy*`.

La concordance des anciennes et nouvelles métriques sur toutes les fixtures
reste un critère RC1 séparé : les résultats Nutrition `divergent` et `partial`
documentés ne sont pas masqués par cette matrice.
