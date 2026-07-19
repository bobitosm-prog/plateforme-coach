# Calculs d'AnalyticsSection

> Statut : contrat de Phase 4. Les sorties visibles restent compatibles avec
> le composant historique ; les stratégies divergentes sont nommées au lieu
> d'être assimilées aux agrégations canoniques.

## Frontières extraites

| Calcul | Fonction pure | Consommateur | Contrat conservé |
|---|---|---|---|
| meilleur e1RM journalier | `buildLegacyExerciseProgression` | graphique par exercice | Epley arrondi au dixième, maximum par nom/date, dates triées |
| volume musculaire 28 jours | `aggregateLegacyMuscleVolume28d` | histogramme muscles | sets complétés, `weight/reps` absents à zéro, tonnage arrondi |
| RIR musculaire 28 jours | `aggregateLegacyMuscleRir28d` | histogramme RIR | au moins cinq sets, moyenne au dixième, tri croissant |
| poids et tendance | `buildLegacyWeightSeries` | courbe poids | fenêtres 30/60/90/9 999 jours, moyenne sur sept observations |
| calories/macros/eau | `buildLegacy*Series` | graphiques Nutrition | arrondis historiques et cible calorique ±100 kcal |
| synthèse 30 jours | `buildLegacyAnalyticsSummary` | cartes poids/PR | fenêtre glissante exacte de 30×24 h et cutoff PR historique |
| export | `buildLegacyAnalyticsCsvRows` | CSV | union triée des dates, cellules absentes à `null`, eau au dixième de litre |
| semaines de volume | `groupMixedLocalUtcLegacyWeeklyTonnage` | `useAnalytics` | 500 sets maximum, 28 jours, lundi local puis clé tronquée en UTC |

Les fonctions vivent dans `lib/progression/analytics-training.ts` et
`lib/progression/analytics-presenter.ts`. Elles utilisent les contrats déjà
définis dans [les agrégations](PROGRESSION_AGGREGATIONS.md), notamment
`estimatedOneRepMax` et `percentageChangeLegacy`. Les lectures bornées et les
historiques séparés restent décrits dans les
[read models](PROGRESSION_READ_MODELS.md).

## Horloge, fenêtres et ordre

- Les calculs 28 et 30 jours reçoivent une horloge ; ils ne lisent jamais
  `Date.now()`.
- La moyenne de poids porte sur sept observations, pas sept jours.
- Les collections affichées conservent leur ordre legacy lorsqu'il est
  significatif ; les points e1RM et les lignes CSV sont triés explicitement.
- Les labels localisés (`d MMM`, jour court et numéro de semaine) restent dans
  la vue : ce sont des adaptations de présentation, pas des métriques.
- Les limites distantes restent inchangées : records 50, Nutrition 100, eau 30,
  poids 100 et sets 500 selon le read model et le fallback historique.

## Stratégie hebdomadaire divergente

Le fallback historique de `useAnalytics` ne calcule pas une semaine locale
canonique. Il déplace un instant vers le lundi avec le calendrier local, puis
utilise la date UTC de cet instant comme clé. La fonction
`legacyMixedLocalUtcMondayKey` reproduit ce mélange avec une timezone injectée.

Exemple testé à Zurich au passage à l'heure d'été :

- instant `2026-03-29T22:30:00Z` : lundi 30 mars à 00:30 local ;
- clé legacy UTC : `2026-03-29` ;
- clé canonique de semaine locale : `2026-03-30`.

Cette divergence est volontairement conservée. Une migration future devra
comparer les deux stratégies sur les frontières dimanche/lundi, DST, mois et
année avant de choisir une clé locale canonique.

## Validation et fail-closed

- Les modules sont indépendants de React, Next, Supabase, navigateur, stockage
  et réseau.
- Les entrées sont `readonly` et ne sont pas mutées.
- Nombres négatifs, `NaN`, infinis, dates/horloges invalides et timezone
  inconnue sont isolés ; aucun `NaN` n'est transmis aux graphiques.
- Zéro explicite reste distinct d'une date ou valeur absente. Le CSV conserve
  toutefois le fallback historique où une eau égale à zéro produit `null`.
- `workout_sessions`, `completed_sessions` et `scheduled_sessions` ne sont ni
  fusionnés ni dédupliqués.

## Calculs non migrés

- Le mapping `exercise_id → muscle_group` reste un effet de chargement dans
  `AnalyticsSection`; seules ses agrégations sont pures.
- Les libellés traduits, couleurs, hauteurs de graphiques, tooltips et seuils
  de rendu restent dans le composant.
- La mutation de détection de PR demeure dans `useAnalytics`; elle n'appartient
  pas à cette tranche de calcul et conserve son ordre historique.
- Les scores IA, analyses photo, bien-être et métriques non reproductibles du
  [catalogue](PROGRESSION_METRICS_CATALOG.md) ne sont pas normalisés.

## Migration future

La prochaine migration de semaines devra produire en parallèle la clé legacy
et la clé locale canonique, comparer les sorties sans changer l'affichage, puis
basculer seulement après validation des données réelles et des fenêtres DST.
La réduction visuelle de `AnalyticsSection` et de `ProgressTab` reste une tâche
distincte.
