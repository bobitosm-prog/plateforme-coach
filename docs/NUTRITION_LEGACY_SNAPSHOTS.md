# Contrat des snapshots Nutrition legacy

> Audit RC1 du 24 juillet 2026. Aucun backfill, changement SQL ou accès distant
> n'est réalisé. Les douze preuves historiques restent inchangées.

## Inventaire des producteurs

| Producteur | Entrée | Forme persistée | Alias/totaux | Perte ou version | Consommateurs | Décision |
|---|---|---|---|---|---|---|
| Sauvegarde d'un repas depuis le journal, `NutritionTab.onStartSave/onSaveMeal` | lignes `daily_food_logs`, macros singulières | `saved_meals.foods` avec `proteins/fats`; colonnes `total_*` | total recalculé par `reduce`; aucune valeur déclarée séparée | `protein` renommé `proteins`; aucune version | onglet repas, overlay de réutilisation, copie vers journal | producteur différé : contrat de colonnes runtime divergent des types générés |
| Éditeur de repas sauvegardé, `onSaveEdit` | JSON historique singulier ou pluriel | remplace `foods` et `total_*` | fallback `protein || proteins || 0`, idem lipides | zéro et conflit d'alias peuvent être masqués | onglet repas et réutilisation | différé : exige un état d'erreur UI explicite avant migration |
| Création d'un repas vide | nom/type, aucun aliment | `saved_meals`, `foods: []` | aucun total | non versionné | éditeur | pas de snapshot nutritionnel à versionner |
| Recettes manuelles/IA, `RecipesSection` | sortie IA ou formulaire | colonnes `recipes.*_per_serving`, ingrédients JSON | vocabulaire `proteins_per_serving` | provenance `source`, mais pas de version nutritionnelle | section recettes | différé : densité des ingrédients non démontrée |
| Journal manuel/recherche | catalogue ou aliment personnalisé | colonnes `daily_food_logs` singulières | quantité appliquée et arrondie avant insertion | fibres généralement absentes | journal, analytics, diagnostic | différé : table structurée, pas un snapshot JSON |
| Scanner code-barres | Open Food Facts/catalogue | `custom_foods`, `community_foods`, puis journal | alias par 100 g variables | écritures séquentielles ; provenance partielle | scanner, journal | différé : plusieurs autorités et bases |
| Analyse photo | aliments IA `proteins/fats` | une ligne `daily_food_logs` par aliment | projection vers `protein/fat`, fallback zéro | estimation et champs absents non versionnés | journal | différé : contrat d'estimation distinct |
| Import/copie/réutilisation de repas | plan, journal ou `saved_meals.foods` | nouvelles lignes `daily_food_logs` | `protein/proteins`, `fat/fats` | choix via `||` ; conflits invisibles | journal | différé : mutation distante inchangée dans cette tranche |
| Plan personnel | sortie génération | `meal_plans.plan_data` JSON | macros françaises, totaux journaliers | format IA legacy, jours partiels possibles | NutritionTab, shopping | différé : version du plan et snapshot nutritionnel à coordonner |
| Plan coach | éditeur coach | `client_meal_plans.meal_plan` JSON et totaux colonnes | forme anglaise distincte | payload multi-jours non versionné | détail client, client Nutrition | différé : autorité coach et schéma distincts |
| Génération IA coach/client | catalogue + profil | formats de plan précédents | arrondis aliment/jour | provenance IA connue hors snapshot | routes/services et UI | différé : ne pas modifier les contrats IA ici |
| Projections UI legacy | JSON/table existants | aucune écriture | lecteurs singulier/pluriel hétérogènes | alias parfois perdus à la lecture | `NutritionSavedMealsSection`, overlays, parseur plan | lecture des repas sauvegardés migrée |

Les types générés exposent `saved_meals.total_protein` et `total_fat`, tandis
que le producteur historique écrit `total_proteins` et `total_fats`. Cette
divergence empêche d'ajouter honnêtement une métadonnée agrégée au niveau SQL
sans migration de schéma, interdite dans cette tranche.

## Contrat versionné

`lib/nutrition/legacy-snapshot.ts` définit `NutritionLegacySnapshotV1` :

- `kind: "nutrition_legacy_snapshot"` ;
- `schemaVersion: 1` ;
- `source` bornée (`saved_meal`, `daily_food_log`, `meal_plan`, `recipe`,
  `generated_plan`, `imported_meal`, `legacy_unknown`) ;
- `totalProvenance` bornée (`calculated`, `declared`, `imported`,
  `calculated_and_declared`, `legacy_unknown`) ;
- `observedAliases` limité aux alias contractuels ;
- `values`, avec `null` distinct de zéro ;
- `calculated` et `declared` conservés séparément ;
- `concordance`, calculée seulement lorsque les deux totaux existent.

La clé additive réservée est `_nutrition_snapshot`. La projection vers le
legacy conserve toutes les clés d'entrée puis ajoute cette enveloppe. Deux
alias présents avec des valeurs différentes produisent `alias_conflict`; aucun
ordre de priorité ne résout le conflit.

Les erreurs discriminées sont `alias_conflict`, `invalid_value` et
`invalid_snapshot`. Elles ne contiennent que des chemins bornés.

## Compatibilité historique

`readNutritionLegacySnapshot` accepte :

- un snapshot v1 strictement validé ;
- un objet historique sans métadonnée, adapté avec `source` et provenance
  `legacy_unknown`.

`NutritionSavedMealsSection` utilise cette lecture commune. Un aliment
historique contenant seulement `proteins` ou `fats` est donc affiché sans perte,
alors qu'un objet où la valeur a déjà été remplacée par zéro reste zéro. La
preuve historique `protein: 0` contre 18 g n'est pas reclassée.

## Producteurs migrés et différés

Cette tranche migre uniquement la **lecture** des snapshots de repas sauvegardés
et livre le constructeur pur `buildSavedMealFoodSnapshots`. Aucun producteur
persistant n'est migré : l'incohérence des noms de colonnes `total_*`, les
fallbacks de l'éditeur et l'absence d'un retour d'erreur UI démontré empêchent
une écriture sûre.

La garde statique interdit la construction manuelle de `_nutrition_snapshot`
ou `schemaVersion: 1` sous `app/`. Les futurs producteurs doivent passer par la
frontière pure, traiter explicitement son résultat discriminé, puis conserver
leur payload public existant.

## Limites et prochaine tranche

- Aucun historique n'est réécrit.
- Aucun total déclaré incohérent n'est corrigé.
- Les plans, recettes, journaux, imports et sorties IA restent non versionnés.
- La Phase 4 reste `partial`.

La prochaine tranche minimale est de caractériser puis migrer séparément
`saved_meals` avec un contrat de colonnes confirmé et un état UI explicite pour
`alias_conflict`, avant toute écriture versionnée.
