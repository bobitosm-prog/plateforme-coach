# Matrice fuseaux, semaines et unités

> Statut : contrat exécutable de clôture de la Phase 4. Cette matrice
> caractérise les fonctions pures existantes ; elle ne migre ni interfaces ni
> historiques.

## Conventions temporelles

Les dates civiles utilisent `YYYY-MM-DD`. `calendarDateAt` exige un instant
valide et un timezone IANA explicite. La semaine canonique commence le lundi et
expose une borne de début inclusive et une borne de fin exclusive. Les fenêtres
7, 28 et 30 jours incluent la date civile courante : leur début vaut donc
`aujourd'hui - (n - 1)` et leur fin `aujourd'hui + 1`.

La matrice couvre UTC, `Europe/Zurich` et `America/New_York`, les bascules DST
du 29 mars et du 25 octobre 2026, les jours locaux différents du jour UTC, les
dimanches/lundis, mois, années, semaine ISO interannuelle et année bissextile.
L'horloge est injectée et fixe. Les timezones ou dates invalides produisent un
résultat `invalid`.

### Divergence legacy conservée

Deux stratégies restent intentionnellement distinctes :

- `groupLegacyWeeklyTonnage` convertit l'instant en date locale puis calcule le
  lundi civil canonique ;
- `groupMixedLocalUtcLegacyWeeklyTonnage` reproduit le calcul historique
  « lundi local puis troncature UTC ».

Pour `2026-03-29T22:30:00Z` à Zurich, la stratégie canonique classe le set dans
la semaine `2026-03-30`, tandis que la stratégie mixte produit `2026-03-29`.
Cette divergence est testée et ne doit pas être masquée. Les fenêtres legacy
28/30 jours restent des durées d'instants lorsqu'elles sont définies ainsi dans
les calculateurs Analytics ; elles ne sont pas fusionnées avec les fenêtres
civiles.

## Conventions d'unités

| Domaine | Accepté | Refusé ou isolé |
|---|---|---|
| Poids/records | nombres positifs ; unités `kg` et `lb` conservées comme séries distinctes | conversion kg/lb implicite, zéro comme poids corporel, négatif, `NaN`, infini |
| Mensurations | nombres en centimètres, zéro explicite autorisé par le delta | conversion pouces/cm implicite ; absence reste `unavailable` |
| Training | séries et répétitions sans unité, charge numérique, durées converties de millisecondes vers minutes | valeur négative/non finie ; tonnage partiel présenté comme inconnu |
| Nutrition masse | base 100 g + quantité en grammes | kg direct non représenté ; l'adaptateur doit fournir un facteur explicite |
| Nutrition volume | base 100 ml + quantité en millilitres | litre direct non représenté ; aucune conversion masse/volume sans densité |
| Nutrition portion/unité | identifiant stable identique et compte strictement positif | identifiant différent, quantité nulle/négative/non finie |

Les kilogrammes et litres sont caractérisés par leurs facteurs explicites
`1000 g` et `1000 ml` aux frontières, pas par une nouvelle unité canonique.
Les pouces ne sont pas un format accepté par le noyau actuel. Les secondes sont
la représentation des prescriptions Training ; `durationMinutes` convertit
une différence d'instants en minutes sans arrondi intermédiaire.

## Précision et statuts

- Les calculs conservent leur précision jusqu'à
  `roundNutritionForDisplay`.
- Les valeurs connues à zéro restent distinctes de `null`.
- Nutrition retourne `complete`, `partial`, `unavailable` ou `invalid` selon
  la disponibilité, la compatibilité de base et la validité numérique.
- Une conversion incompatible est `unavailable`, jamais zéro.
- Les arrondis visibles legacy de calories, macros, eau et tonnage restent dans
  leurs présentateurs nommés.
- Les entrées sont testées immuables et l'ordre d'entrée ne change pas les
  regroupements déterministes.

## Couverture exécutable

- `progression-timezone-weeks-matrix.test.ts` : fuseaux, DST, semaines, mois,
  année bissextile, fenêtres, bornes et divergence legacy.
- `progression-nutrition-units-matrix.test.ts` : unités corporelles, Training,
  bases Nutrition, incompatibilités, précision et statuts.
- `progression-timezone-units-static.test.ts` : pureté et imports interdits.

La matrice ajoute 48 cas exécutés. Elle complète les contrats des
[agrégations](PROGRESSION_AGGREGATIONS.md), des
[calculs Analytics](PROGRESSION_ANALYTICS_CALCULATIONS.md), du
[catalogue de métriques](PROGRESSION_METRICS_CATALOG.md) et du
[modèle Nutrition](NUTRITION_CANONICAL_MODEL.md).

## Limites

- Les heures civiles inexistantes ou répétées ne sont pas acceptées en entrée :
  les fonctions reçoivent des instants absolus, puis les projettent localement.
- Aucune conversion pounds/kilogrammes, pouces/centimètres ou masse/volume
  n'est fournie sans facteur ou densité explicite.
- `workout_sessions`, `completed_sessions` et `scheduled_sessions` restent des
  historiques indépendants.
- Aucun consommateur, affichage ou donnée historique n'est modifié par cette
  matrice.
