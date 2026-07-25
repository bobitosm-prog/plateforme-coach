# Agrégations pures de progression

> Statut : contrat exécuté de Phase 4. Ce noyau complète le
> [catalogue des 39 métriques](PROGRESSION_METRICS_CATALOG.md) sans constituer
> encore un read model et sans relier les historiques Training indépendants.

## Frontière

`lib/progression/` ne dépend ni de React, Next, Supabase, navigateur, stockage
ou réseau. Les collections d'entrée sont `readonly`, les sorties ont un ordre
stable et les calculs temporels reçoivent une horloge et une timezone lorsque
le présent intervient.

Les résultats susceptibles de rencontrer une absence ou une donnée incorrecte
sont discriminés :

- `complete` : toutes les données nécessaires sont connues ;
- `partial` : un résultat utile existe, mais au moins une composante reste
  inconnue ;
- `unavailable` : aucune valeur honnête ne peut être calculée ;
- `invalid` : date, nombre, unité ou type de record invalide.

Zéro demeure une valeur explicite. Il n'est pas utilisé pour masquer une valeur
inconnue, sauf dans les fonctions nommées `legacy*` qui reproduisent précisément
un fallback historique.

## Fonctions par domaine

| Domaine | Fonctions | Métriques du catalogue |
|---|---|---|
| Dates | `calendarDateAt`, `addCalendarDays`, `mondayWeekBounds`, `civilMonthBounds`, `rollingCalendarWindow`, `inCalendarWindow` | fenêtres des métriques #3, #8, #10–12, #16, #18, #32–37 |
| Training | `aggregateCompletedSets`, `groupCompletedSetsByExercise`, `durationMinutes` | #5–7, #10–13 |
| Training legacy | `legacyTonnage`, `groupLegacyWeeklyTonnage`, `percentageChangeLegacy` | #7–9, avec les zéros et arrondis historiques explicitement conservés |
| Poids/mesures | `sortWeights`, `latestWeight`, `weightDelta`, `movingAverageByObservation`, `weightGoalProgress`, `measurementDelta` | #17–22 |
| Records | `estimatedOneRepMax`, `groupBestRecords` | #14–16 |
| Régularité | `trainingStreak`, `activeMondayWeeks`, `legacyCoachStreak` | #27–29 ; les variantes divergentes restent séparées |
| Nutrition/eau | `aggregateNutritionByDate`, `aggregateWaterByDate` | #32–36, en réutilisant les invariants Nutrition |

Les compteurs de `workout_sessions`, `completed_sessions` et
`scheduled_sessions` ne sont volontairement pas réunis : ils nécessitent des
read models séparés. De même, aucune conversion `kg/lb`, masse/volume ou
assistance machine n'est déduite sans unité et règle explicites.

## Règles temporelles, précision et ordre

- Une semaine va du lundi inclus au lundi suivant exclu.
- Un mois civil va du premier jour inclus au premier jour du mois suivant
  exclu.
- Les fenêtres 7, 28 et 30 jours incluent le jour local courant et excluent la
  borne du lendemain.
- Une date locale est calculée avec une timezone IANA explicite ; aucune lecture
  cachée de `Date.now()` n'existe.
- Les poids sont triés par date ascendante ; les semaines, exercices et records
  sont ordonnés par clés déterministes.
- Les agrégations canoniques ne font aucun arrondi intermédiaire. Les fonctions
  historiques conservent l'arrondi observable documenté.

## Consommateurs migrés et équivalence

`AnalyticsSection` utilise `estimatedOneRepMax` pour la formule Epley arrondie
au dixième et `percentageChangeLegacy` pour la variation entre les deux
dernières semaines présentes. `useAnalytics`, la fin de séance et les vues
dashboard réutilisent maintenant les mêmes autorités Epley/tonnage. Les
lectures, filtres, props, textes, formes de sortie et valeurs visibles ne
changent pas.

L'agrégation Nutrition Analytics utilise désormais
`aggregateAnalyticsNutritionByDate`, documentée dans
[les calculs Analytics](PROGRESSION_ANALYTICS_CALCULATIONS.md#agrégation-nutrition-analytics--c02).
Elle remplace uniquement le consommateur runtime C02. La fonction
`aggregateLegacyNutritionByDate` reste disponible pour caractériser le
comportement historique, mais n'alimente plus le read model Analytics.
L'agrégateur du diagnostic reste séparé en raison de sa fenêtre, de ses
moyennes et de son contrat IA différents.

Le journal Nutrition desktop du jour utilise une autre frontière spécialisée,
`lib/nutrition/desktop-nutrition-day.ts`, documentée dans
[`NUTRITION_DESKTOP_DAY_JOURNAL.md`](NUTRITION_DESKTOP_DAY_JOURNAL.md).
Elle contrôle un owner et une date UTC uniques, conserve les lignes pour
l'accordéon, arrondit les totaux finaux comme l'UI historique et possède un
cycle de panne/valeur visible propre. Elle ne remplace ni l'agrégation
multi-date Analytics, ni les moyennes du diagnostic, ni C04.

Le graphe Nutrition desktop sept jours C04 utilise
`lib/nutrition/desktop-nutrition-week.ts`, documenté dans
[`NUTRITION_DESKTOP_WEEK_GRAPH.md`](NUTRITION_DESKTOP_WEEK_GRAPH.md). Sa
fenêtre J−6…J et ses clés sont UTC, ses libellés restent locaux, les sept
emplacements sont synthétisés avec des lacunes nullables et sa requête conserve
la dépendance de refresh au journal du jour. Ce contrat n'est donc pas celui
du journal C03, d'Analytics, de Home ou du diagnostic.

Les autres calculs restent en place lorsqu'une divergence existe sur la source,
la fenêtre, l'arrondi ou le traitement de l'absence. Ils seront raccordés après
la création des read models, pas par substitution implicite.

Le diagnostic hebdomadaire utilise une frontière spécialisée,
`lib/weekly-diagnostic/nutrition-aggregation.ts`, documentée dans
[`NUTRITION_WEEKLY_DIAGNOSTIC_CHARACTERIZATION.md`](NUTRITION_WEEKLY_DIAGNOSTIC_CHARACTERIZATION.md).
Elle réutilise les primitives calendaires de ce noyau, mais ne remplace pas
`aggregateNutritionByDate` : sa projection, sa semaine Zurich, son dénominateur
par jours renseignés et son payload IA constituent un contrat distinct.

La [matrice d'autorité RC1](PROGRESSION_AGGREGATION_AUTHORITY.md) classe ces
variantes et la garde `npm run progression:authority:check` empêche le retour
des duplications de formules couvertes dans les composants et hooks.

## Limites conservées

- `completed_sessions` et `workout_sessions` restent deux historiques sans lien
  déduit.
- Le tonnage legacy transforme encore poids/répétitions absents en zéro ; le
  résultat canonique correspondant devient `partial`.
- Le streak coach UTC et le streak Training local avec repos restent deux
  stratégies distinctes.
- Les métriques IA ou sans formule locale (`symmetry_score`, `fitness_score`,
  `score_semaine`, analyses photo et tendances qualitatives) restent non
  reproductibles.
- Les plafonds de requêtes, projections runtime divergentes et unités absentes
  relèvent des futurs read models et adaptateurs, pas de ce noyau.
