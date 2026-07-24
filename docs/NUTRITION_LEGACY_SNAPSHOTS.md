# Contrat des snapshots Nutrition legacy

> Audit RC1 du 24 juillet 2026. Aucun backfill, changement SQL ou accès distant
> n'est réalisé. Les douze preuves historiques restent inchangées.

## Inventaire des producteurs

| Producteur | Entrée | Forme persistée | Alias/totaux | Perte ou version | Consommateurs | Décision |
|---|---|---|---|---|---|---|
| Sauvegarde d'un repas depuis le journal, `NutritionTab.onStartSave/onSaveMeal` | lignes `daily_food_logs`, macros singulières projetées en alias pluriels historiques | `saved_meals.foods` versionné ; colonnes SQL singulières | total calculé sans fallback de valeur inconnue | alias conservés dans `observedAliases` | onglet repas, overlay de réutilisation, copie vers journal | migré vers `prepareSavedMealInsert` |
| Éditeur de repas sauvegardé, `onSaveEdit` | JSON historique singulier ou pluriel | remplace `foods` et les quatre colonnes de totaux singulières | conflit détecté avant agrégation | `alias_conflict` empêche l'écriture et affiche une erreur stable | onglet repas et réutilisation | migré vers `prepareSavedMealUpdate` |
| Création d'un repas vide | nom/type, aucun aliment | `saved_meals`, `foods: []` | aucun total écrit | aucun snapshot alimentaire vide inventé | éditeur | migré vers `prepareEmptySavedMealInsert` |
| Recettes manuelles/IA, `RecipesSection` | sortie IA ou formulaire | colonnes `recipes.*_per_serving`, ingrédients JSON | vocabulaire `proteins_per_serving` | provenance `source`, mais pas de version nutritionnelle | section recettes | différé : densité des ingrédients non démontrée |
| Journal manuel/recherche | catalogue ou aliment personnalisé | colonnes `daily_food_logs` singulières | quantité appliquée et arrondie avant insertion | fibres généralement absentes | journal, analytics, diagnostic | différé : table structurée, pas un snapshot JSON |
| Scanner code-barres | Open Food Facts/catalogue | `custom_foods`, `community_foods`, puis journal | alias par 100 g variables | écritures séquentielles ; provenance partielle | scanner, journal | différé : plusieurs autorités et bases |
| Analyse photo | aliments IA `proteins/fats` | une ligne `daily_food_logs` par aliment | projection vers `protein/fat`, fallback zéro | estimation et champs absents non versionnés | journal | différé : contrat d'estimation distinct |
| Import/copie/réutilisation de repas | plan, journal ou `saved_meals.foods` | nouvelles lignes `daily_food_logs` | `protein/proteins`, `fat/fats` | réutilisation `saved_meals` validée ; autres copies encore legacy | journal | `saved_meals` migré vers `prepareSavedMealReuse` |
| Plan personnel | sortie génération | `meal_plans.plan_data` JSON | macros françaises, totaux journaliers | format IA legacy, jours partiels possibles | NutritionTab, shopping | différé : version du plan et snapshot nutritionnel à coordonner |
| Plan coach | éditeur coach | `client_meal_plans.meal_plan` JSON et totaux colonnes | forme anglaise distincte | payload multi-jours non versionné | détail client, client Nutrition | différé : autorité coach et schéma distincts |
| Génération IA coach/client | catalogue + profil | formats de plan précédents | arrondis aliment/jour | provenance IA connue hors snapshot | routes/services et UI | différé : ne pas modifier les contrats IA ici |
| Projections UI legacy | JSON/table existants | aucune écriture | lecteurs singulier/pluriel hétérogènes | alias parfois perdus à la lecture | `NutritionSavedMealsSection`, overlays, parseur plan | lecture des repas sauvegardés migrée |

## Contrat SQL recoupé

La migration `20260415_master_rls_fix.sql` et
`lib/supabase/database.types.ts` concordent. `Row` contient exactement :
`id`, `user_id`, `name`, `meal_type`, `foods`, `total_calories`,
`total_protein`, `total_carbs`, `total_fat`, `created_at`. `Insert` rend
`name` obligatoire et les neuf autres champs optionnels. `Update` rend les dix
champs optionnels.

`total_proteins`, `total_fats` et `use_count` ne sont pas des colonnes
contractuelles. Les deux premiers sont uniquement des formes JSON/UI legacy.
La mutation historique de `use_count` reste une dette distincte.

Avant migration, sauvegarde et édition envoyaient
`total_calories/total_proteins/total_carbs/total_fats` et résolvaient les alias
par `|| 0`. Après migration, les payloads typés
`TablesInsert<'saved_meals'>` et `TablesUpdate<'saved_meals'>` envoient
`total_calories/total_protein/total_carbs/total_fat`. Les alias originaux
restent dans chaque objet de `foods` et dans son `_nutrition_snapshot`.

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

Les trois producteurs sûrs passent par
`lib/nutrition/saved-meal-persistence.ts` : création vide, sauvegarde depuis
le journal (`source: daily_food_log`) et édition (`source: saved_meal`).

Une valeur absente produit `null` dans le total SQL ; zéro reste zéro. Deux
alias identiques sont conservés. Deux alias contradictoires produisent
`alias_conflict`, aucune écriture Supabase n'est lancée et toute correction
efface l'alerte pour permettre un retry. L'alerte accessible ne contient ni
chemin, ni valeur, ni erreur Supabase. Les pannes persistantes utilisent un
message générique distinct.

La garde statique interdit aux producteurs de construire manuellement
`_nutrition_snapshot`, d'écrire les colonnes pluriels ou de contourner les
préparateurs communs. Les imports/copies/réutilisations écrivent dans
`daily_food_logs`, pas dans `saved_meals`; ils restent différés.

## Réutilisation vers `daily_food_logs`

La migration `20260404_community_foods.sql` et les types générés concordent.
`Row` contient exactement `id`, `user_id`, `date`, `meal_type`, `food_id`,
`custom_name`, `quantity_g`, `calories`, `protein`, `carbs`, `fat`,
`created_at`. `calories`, `date`, `meal_type`, `quantity_g`, `id` sont non
null dans `Row`; les quatre macros sont nullables sauf l'énergie.

Pour `Insert`, `calories` et `meal_type` sont obligatoires. `date` et
`quantity_g` sont optionnels grâce aux valeurs SQL par défaut ; `protein`,
`carbs`, `fat`, `food_id`, `custom_name`, `user_id`, `id`, `created_at` sont
optionnels et nullables selon leur type. `Update` rend tous les champs
optionnels.

Avant migration, `NutritionTab.applySavedMeal` parcourait `foods` et exécutait
une insertion par aliment. Il choisissait silencieusement
`proteins || protein || 0` et `fats || fat || 0`, remplaçait toutes les
inconnues par zéro, puis tentait une écriture `use_count`. Un échec à
l'insertion N laissait les N−1 lignes précédentes persistées ; l'erreur était
ignorée, le journal rafraîchi et l'overlay fermé.

Après migration, `prepareSavedMealReuse` :

1. valide la date ISO et le `meal_type` ;
2. valide tous les aliments et snapshots avant toute écriture ;
3. refuse repas vide, énergie absente, quantité invalide et aliment sans nom ;
4. conserve les macros optionnelles inconnues à `null` ;
5. retourne `ready`, `alias_conflict`, `invalid` ou `unsupported` ;
6. produit un tableau typé `TablesInsert<'daily_food_logs'>` dans l'ordre
   historique.

`persistSavedMealReuse` effectue ensuite un unique `insert([...])`. Il ne crée
pas une transaction métier supplémentaire, mais supprime le scénario
historique de plusieurs requêtes dont seule une partie réussit. L'UI se ferme
et se rafraîchit uniquement après le succès de ce lot. Une garde d'exécution
empêche le double clic et un identifiant de requête ignore les réponses
obsolètes après changement d'utilisateur ou fermeture.

`use_count` est déclaré **unsupported** : aucune colonne n'existe dans les
migrations ou types générés, donc aucune lecture, aucun tri, aucun affichage et
aucune écriture ne subsistent dans ce flux. Une future métrique d'utilisation
exigerait une tranche séparée définissant ownership, RLS et sémantique de
concurrence.

## Limites et prochaine tranche

- Aucun historique n'est réécrit.
- Aucun total déclaré incohérent n'est corrigé.
- Les plans, recettes, journaux, imports et sorties IA restent non versionnés.
- Les copies de journal et imports de plans, distincts de la réutilisation
  `saved_meals`, conservent encore leurs adaptateurs legacy.
- La Phase 4 reste `partial`.

La prochaine tranche minimale est de caractériser les producteurs de totaux
déclarés des plans `meal_plans` et `client_meal_plans` avant de décider leur
versionnement.

Cette caractérisation est désormais consignée dans
[NUTRITION_PLAN_PRODUCERS.md](NUTRITION_PLAN_PRODUCERS.md). Elle conclut à un
report de la migration : les enveloppes runtime et le schéma généré ne
concordent pas, et les colonnes présentées comme des totaux représentent selon
le producteur une cible, le lundi, ou un calcul journalier. Le snapshot v1
reste réutilisable au niveau aliment, sans justifier un snapshot de plan v2.
