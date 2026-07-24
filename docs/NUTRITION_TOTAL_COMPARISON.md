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
| sauvegarde/édition des repas | colonnes SQL singulières et alias JSON singuliers/pluriels | snapshot v1, agrégation sans fallback et refus des conflits | les nouvelles écritures sont traçables ; les lignes historiques ne sont pas réécrites |
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

Le résultat expose aussi `legacyComparable`. `legacy` reproduit le total
observé par les calculateurs historiques, y compris leur fallback zéro ;
`legacyComparable` remplace par `null` chaque nutriment auquel il manque au
moins une composante. Les différences utilisent exclusivement cette seconde
projection.

## Tolérances

La configuration par défaut, explicite et remplaçable, est :

| Valeur | Tolérance absolue | Tolérance relative |
|---|---:|---:|
| énergie | 1 kcal | 0,5 % |
| protéines, glucides, lipides, fibres | 0,1 g | 0,5 % |

Une valeur est tolérée si l'écart absolu **ou** relatif respecte sa limite.
Cette règle caractérise les arrondis historiques constatés ; elle ne corrige
pas les valeurs. Aucun arrondi intermédiaire n'est appliqué par le comparateur.
La politique porte la version `1`; son mode reste
`absolute_or_relative`. Les alias fermés sont :

- kcal : `calories`, `kcal` ;
- protéines : `protein`, `proteins`, `prot` ;
- glucides : `carbs`, `carb` ;
- lipides : `fat`, `fats` ;
- fibres : `fiber`, `fibers`.

## Rejeu des douze preuves

Les 12 fixtures synthétiques couvrent 100 g, 100 ml, portion, unité, repas,
journée, fibres, arrondis, données partielles, zéro legacy masquant une valeur
inconnue, conversion incompatible et valeur invalide.

Le fichier brut
`tests/fixtures/nutrition-total-comparison.ts` reste inchangé, avec le SHA-256
`cb9afe859dcf7a20b2adf41f20646e51d78a43e5dc5e8e6607e44b0ddc8d0f08`.

| Fixture | Base/unité et chemin | Alias/absence | Legacy → canonique ; différence | Avant → après | Décision |
|---|---|---|---|---|---|
| 100 g catalogue | `meal_plan_foods`, 100 g → `per_100_g`, 100 g | `kcal/prot/carb/fat/fiber` | `200/10/20/8/4` identique ; Δ 0 | `equivalent` → `equivalent` | comparable exacte |
| 100 ml catalogue | `meal_plan_foods`, 100 ml → `per_100_ml`, 100 ml | mêmes alias | `47/3,3/5/1,6/0` identique ; Δ 0 | `equivalent` → `equivalent` | comparable exacte |
| portion nommée | `declared_totals` → portion `bowl ×1` | aucun champ absent | `120/4/18/3/2` identique ; Δ 0 | `equivalent` → `equivalent` | portion explicitement compatible |
| unité double | `declared_totals` → unité `egg ×2` | aucun champ absent | `180/12/2/14/0` identique ; Δ 0 | `equivalent` → `equivalent` | unité explicitement compatible |
| arrondi historique kcal | `daily_food_logs` → montant complet | alias singuliers | 63 → 62,6 kcal ; Δ 0,4, relatif ≈0,6349 % | `within_tolerance` → identique | tolérance absolue 1 kcal |
| arrondi historique macros | `meal_plan_foods` → montant complet | `prot` | 10,1 → 10,04 g protéines ; Δ 0,06, relatif ≈0,5941 % | `within_tolerance` → identique | tolérance absolue 0,1 g |
| totaux déclarés divergents | `declared_totals` → montant complet | aucun champ absent | 600 → 500 kcal ; Δ 100, relatif 16,6667 % | `divergent` → `divergent` | total déclaré incohérent, pleinement comparable |
| alias sauvegardé perdu | `saved_meal_foods` → montant complet | la preuve arrive avec `protein: 0`; aucune valeur `proteins` récupérable | 0 → 18 g protéines ; Δ 18, relatif 100 % | `divergent` → `divergent` | information perdue avant la frontière ; impossible à reconstruire |
| journal sans fibres | `daily_food_logs` → montant complet | fibre absente | kcal/P/G/L identiques ; fibre observée 0 mais comparable `null` face à 7 g | `partial` → `partial` | quatre composantes concordent, fibre réellement absente |
| zéro legacy masque inconnu | `saved_meal_foods` → canonique partiel | fibre legacy absente ; kcal canonique inconnue | P/G/L 0 exacts ; kcal et fibre non comparables | `partial` → `partial` | aucune inconnue transformée en zéro comparable |
| masse/volume impossible | liste legacy vide → `per_100_ml` demandé en 100 g | densité absente | aucune composante comparable | `unavailable` → `unavailable` | conversion interdite sans densité |
| valeur legacy négative | `daily_food_logs` → montant complet | aucun alias compensatoire | −1 kcal, entrée invalide | `invalid` → `invalid` | valeur contractuellement interdite |

La distribution reste donc volontairement **4 `equivalent`, 2
`within_tolerance`, 2 `divergent`, 2 `partial`, 1 `unavailable`, 1 `invalid`**.
La correction effectuée ne requalifie aucune preuve : elle empêche seulement
la fibre absente des deux cas partiels d'apparaître comme un zéro comparable.

Depuis le 24 juillet 2026, les trois producteurs sûrs de `saved_meals`
utilisent le [snapshot v1](NUTRITION_LEGACY_SNAPSHOTS.md). Cela empêche une
nouvelle perte silencieuse d'alias dans ces écritures, sans modifier les douze
preuves. Les deux divergences historiques restent donc `divergent` et le
critère global de concordance reste non satisfait.

La réutilisation de ces snapshots vers `daily_food_logs` valide désormais les
alias avant de produire le lot complet. Elle conserve une macro inconnue à
`null` et refuse une énergie inconnue, obligatoire dans la table. Cette
prévention prospective ne requalifie toujours aucune fixture historique.

## Analyse des quatre cas sensibles

### Totaux déclarés divergents

La première séparation est la lecture de `total_calories`: 600 kcal sont
déclarées alors que le montant canonique fourni vaut 500 kcal. Les quatre
macros et fibres concordent exactement. Il n'existe ni conversion, ni alias,
ni arrondi intermédiaire susceptible d'expliquer 100 kcal. Le modèle canonique
interdit d'écraser automatiquement l'énergie déclarée : ce cas reste
pleinement comparable et `divergent`.

### Alias sauvegardé perdu

La frontière observée reçoit déjà `protein: 0`; elle ne reçoit pas
`proteins: 18`. La première séparation précède donc le comparateur et constitue
une perte d'information dans le chemin legacy. L'alias `proteins` est reconnu
quand il existe, mais aucune règle honnête ne peut reconstruire 18 g depuis
zéro. Le cas reste pleinement comparable et `divergent`.

### Journal sans fibres

`calories`, `protein`, `carbs` et `fat` sont présents et concordent. `fiber`
est absent du format persisté utilisé par la fixture. La projection d'affichage
legacy vaut historiquement zéro, mais la projection comparable vaut désormais
`null`. La comparaison composante par composante prouve quatre équivalences et
une indisponibilité : le statut reste `partial`.

### Zéro legacy masquant une inconnue

Les protéines, glucides et lipides sont explicitement nuls des deux côtés.
L'énergie canonique est inconnue et la fibre legacy est absente ; ces deux
composantes restent non comparables. Aucun zéro n'est inventé et le résultat
reste `partial`.

## Garde de politique

Les tests de concordance figent :

- le SHA-256 des douze fixtures brutes ;
- la décision et la cause de chaque fixture ;
- la version, les six statuts et les trois tolérances ;
- la liste exacte des alias ;
- les différences 100 kcal et 18 g des deux divergences ;
- le maintien de `null` pour tout nutriment legacy absent ;
- l'absence de `Math.round`, de dépendance UI/persistance et de `any` dans le
  comparateur.

## Limites et suite

- Aucune donnée réelle ou distante n'est échantillonnée.
- Le comparateur ne décide pas quelle projection legacy est autoritaire.
- Les fibres absentes restent inconnues ; elles ne valent pas zéro.
- Les textes de quantité (`1 grande`) et conversions masse/volume sans densité
  restent indisponibles.
- Les arrondis déjà persistés sont irréversibles sans source plus précise.
- Les consommateurs continuent d'utiliser leurs calculateurs actuels.
- Deux cas pleinement comparables restent divergents ; la définition de
  terminé Phase 4 demeure donc non satisfaite.

La correction minimale suivante consiste à versionner la provenance des
totaux déclarés et à préserver les alias au moment de produire le snapshot
legacy. Le [contrat v1](NUTRITION_LEGACY_SNAPSHOTS.md) fournit désormais cette
frontière pure et migre la lecture des repas sauvegardés. Les producteurs
persistants restent différés tant que le contrat de colonnes et le traitement
UI des conflits ne sont pas démontrés. Aucune valeur déjà perdue n'est
reconstruite.
