# Comparaison des totaux Nutrition legacy et canoniques

> Statut : caractérisation de Phase 4. Le comparateur n'est branché à aucun
> consommateur et ne modifie ni affichage, ni historique, ni donnée persistée.

## But

La frontière pure [`legacy-total-comparison.ts`](../lib/nutrition/legacy-total-comparison.ts)
compare les totaux actuellement produits par les formats legacy avec les
résultats du [noyau d'invariants](../lib/nutrition/invariants.ts). Elle rend les
écarts visibles avant toute migration, sans déclarer les données historiques
fausses et sans transformer une valeur absente en zéro canonique.

## Calculateurs legacy inventoriés

| Frontière active | Format | Calcul observé | Limite conservée |
|---|---|---|---|
| `NutritionTab.getDailyLogsMacros` et `NutritionJournalMealsSection` | `daily_food_logs.calories/protein/carbs/fat` | somme des montants persistés avec fallback zéro | fibres absentes ; `null`/absent devient zéro à l'affichage |
| `useFoodLog`, `FoodSearch`, `BarcodeScanner` | catalogue/custom par 100 g | multiplication par quantité puis arrondi par aliment | arrondi kcal à l'unité et macros au dixième avant agrégation |
| `parseMealPlan` puis `computeDayTotals` | coach `kcal/prot/carb/fat` et IA `calories/proteines/glucides/lipides` | coercition tolérante puis somme repas/journée | valeur absente ou invalide coercée à zéro ; fibres non représentées |
| `NutritionSavedMealsSection` | aliments sauvegardés singuliers `calories/protein/carbs/fat` | somme puis arrondi d'affichage | certains producteurs enregistrent `proteins/fats`, invisibles pour ce calcul |
| sauvegarde/édition des repas | `total_calories/total_proteins/total_carbs/total_fats` | somme avec alias partiels et fallback zéro | totaux déclarés et éléments JSON peuvent diverger |
| `NutritionPlanContent` | totaux du jour ou fallback plan/profil | priorité aux totaux strictement positifs | un zéro explicite peut déclencher le fallback d'affichage |

Ces familles restent distinctes. Le comparateur ne fusionne ni
`daily_food_logs`, ni `meal_logs`, ni `meal_tracking`.

## Contrat

Les adaptateurs acceptent explicitement quatre formats :

- `daily_food_logs` ;
- `meal_plan_foods` (`kcal/prot/carb/fat`) ;
- `saved_meal_foods` avec alias singulier/pluriel observés ;
- `declared_totals` (`total_*`).

Les résultats sont :

- `equivalent` : toutes les valeurs connues sont exactement égales ;
- `within_tolerance` : aucun écart ne dépasse les tolérances ;
- `divergent` : au moins un nutriment comparable dépasse les tolérances ;
- `partial` : une partie est comparable, mais une valeur manque ou a été
  historiquement remplacée par zéro ;
- `unavailable` : aucun calcul comparable n'est possible ;
- `invalid` : valeur négative/non finie, résultat canonique invalide ou
  tolérance invalide.

Chaque nutriment expose valeur legacy/canonique, écart absolu et écart relatif
quand ils sont calculables. Les erreurs ne contiennent que code et chemin
stables, jamais l'entrée brute.

## Tolérances

La configuration par défaut, explicite et remplaçable, est :

| Valeur | Tolérance absolue | Tolérance relative |
|---|---:|---:|
| énergie | 1 kcal | 0,5 % |
| protéines, glucides, lipides, fibres | 0,1 g | 0,5 % |

Une valeur est tolérée si l'écart absolu **ou** relatif respecte sa limite.
Cette règle caractérise les arrondis historiques constatés ; elle ne corrige
pas les valeurs. Aucun arrondi intermédiaire n'est appliqué par le comparateur.

## Matrice de caractérisation

Les 12 fixtures synthétiques couvrent 100 g, 100 ml, portion, unité, repas,
journée, fibres, arrondis, données partielles, zéro legacy masquant une valeur
inconnue, conversion incompatible et valeur invalide.

| Résultat | Nombre |
|---|---:|
| `equivalent` | 4 |
| `within_tolerance` | 2 |
| `divergent` | 2 |
| `partial` | 2 |
| `unavailable` | 1 |
| `invalid` | 1 |

Les divergences volontaires caractérisées sont un total énergétique déclaré
différent de la somme canonique et l'alias pluriel `proteins` que l'affichage
singulier d'un repas sauvegardé peut ignorer. Elles ne sont pas masquées pour
obtenir une équivalence artificielle.

## Limites et suite

- Aucune donnée réelle ou distante n'est échantillonnée.
- Le comparateur ne décide pas quelle projection legacy est autoritaire.
- Les fibres absentes restent inconnues ; elles ne valent pas zéro.
- Les textes de quantité (`1 grande`) et conversions masse/volume sans densité
  restent indisponibles.
- Les arrondis déjà persistés sont irréversibles sans source plus précise.
- Les consommateurs continuent d'utiliser leurs calculateurs actuels.

La prochaine tranche de roadmap est **Documenter les métriques de
progression**. Une migration Nutrition ultérieure devra d'abord décider où
exécuter le double calcul et comment observer les divergences sans exposer de
données personnelles.
