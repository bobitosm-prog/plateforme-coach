# Repositories Nutrition

Les repositories read-only de `lib/repositories/nutrition/` isolent les lectures
Supabase compatibles avec les types générés actuels. Ils utilisent le contrat
[`RepositoryResult`](../lib/repositories/result.ts) décrit dans la
[documentation générale](SUPABASE_REPOSITORIES.md) et conservent les JSON legacy
sans les convertir prématurément.

## Frontières

| Factory | Méthodes | Scope explicite |
|---|---|---|
| `createNutritionCatalogRepository` | `listGlobalFoods`, `listCommunityFoods`, `findCommunityFoodById`, `listCustomFoodsForOwner`, `findCustomFoodByIdForOwner` | catalogue global ou `user_id` owner |
| `createNutritionPlanRepository` | `listPersonalPlansForOwner`, `findActivePersonalPlanForOwner`, `listAssignedPlansForClient`, `findLatestAssignmentForActiveCoachClient` | owner, client, ou couple coach/client avec relation `status = active` vérifiée avant lecture |
| `createNutritionJournalRepository` | `listDailyFoodLogsForOwner`, `listLegacyMealLogsForOwner`, `listMealCompletionsForOwner`, `listWaterIntakeForOwner` | `user_id` owner, plage de dates et limite bornée |
| `createNutritionRecipeRepository` | `listRecipesForOwner`, `listPublicRecipes`, `findRecipeByIdForOwner`, `listSavedMealsForOwner`, `findSavedMealByIdForOwner` | owner ou catalogue public |

Chaque factory reçoit un `DatabaseClient`. Elle ne crée aucun client et ne sait
pas si l'appelant est navigateur, serveur ou test. Les identifiants servent à
réduire la requête ; ils ne constituent jamais une preuve d'autorité. L'appelant
doit les dériver de la session ou d'une relation active préalablement autorisée,
et la RLS du client injecté reste obligatoire.

## Contrats

- Projections explicites uniquement ; aucun `select('*')`.
- Collections ordonnées et bornées : 500 lignes maximum pour catalogues et
  journaux, 100 plans, 200 recettes/repas sauvegardés.
- Lecture unique : `not_found` distingue une absence valide d'une panne.
- Panne : `repositoryFailure` ne conserve qu'une catégorie et un code borné.
- `meal_plans.plan`, `client_meal_plans.plan`, `recipes.ingredients`,
  `recipes.instructions` et `saved_meals.foods` restent des `Json` bruts.
- `daily_food_logs`, `meal_logs` et `meal_tracking` restent trois historiques
  distincts, conformément au [modèle canonique](NUTRITION_CANONICAL_MODEL.md).
- Aucun repository n'importe React, Next, `app/`, factory Supabase ou
  `service_role`.
- Aucune mutation n'est incluse. Les futures écritures devront vivre dans des
  modules d'autorité séparés et server-only lorsque nécessaire.

Les payloads client existants de `saved_meals` sont préparés hors repository
par la frontière pure et typée
[`saved-meal-persistence.ts`](../lib/nutrition/saved-meal-persistence.ts).
Elle utilise `TablesInsert`/`TablesUpdate`, projette uniquement les colonnes
singulières réelles et refuse les conflits d'alias avant l'appel Supabase.

La réutilisation vers le journal passe de même par
[`saved-meal-reuse.ts`](../lib/nutrition/saved-meal-reuse.ts). Cette frontière
valide le lot complet puis produit uniquement des
`TablesInsert<'daily_food_logs'>`. Le repository reste read-only. Le composant
effectue un seul insert de lot et n'écrit plus le champ `use_count`, absent du
schéma démontré.

## Limites de schéma

Seules les colonnes de `lib/supabase/database.types.ts` sont projetées. Les
colonnes runtime documentées mais absentes des types ne sont pas inventées :

- `meal_plans.plan_data`, `is_active` ;
- cibles et `week_start` de `client_meal_plans` ;
- `meal_tracking.is_completed`, `meal_plan_id`, `completed_at` ;
- compteurs et variantes de totaux de `saved_meals` ;
- variantes `energy_kcal`, `proteins`, `carbohydrates` et `*_per_100g` absentes
  des tables concernées dans les types générés.

La vérification `coach_clients.status = active` protège la méthode spécialisée,
mais ne corrige pas les policies historiques des autres lectures. Aucun
consommateur n'est migré dans cette tranche.
