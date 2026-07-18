# Frontières des hooks Nutrition

## Contrat historique

`useFoodLog` reste la façade exposée par `useClientDashboard`. Ses champs de
recherche, setters, formulaires et callbacks `addFoodToMeal`/`addCustomFood`
restent inchangés et continuent d'être étalés dans le retour du dashboard.

Avant cette tranche, `NutritionTab` chargeait directement journal, eau, plan
personnel et marqueurs de repas ; `RecipesSection` chargeait une vue mélangée
owner/public ; `NutritionPreferences` recalculait les objectifs sans frontière
explicite.

## Les quatre frontières

### `useNutritionJournal`

- Scope : `userId` fourni par la session du dashboard et date sélectionnée.
- Lit `daily_food_logs`, les dates des journaux et `water_intake` avec des
  projections explicites.
- Préserve l'ordre ascendant des entrées du jour et ne lit ni `meal_logs` ni
  `meal_tracking` : ces historiques restent distincts.
- Expose `idle/loading/ready/empty/error`, `reload`/`retry`, les setters
  optimistes historiques et la mutation d'eau existante.
- Un compteur de requête ignore les réponses obsolètes après changement
  d'utilisateur/date ou démontage.

### `useNutritionPlans`

- Scope : owner authentifié pour le plan personnel et les complétions du jour.
- Sépare explicitement le plan personnel du `coachMealPlan` reçu par props ; le
  hook ne traite jamais les deux sources comme une même autorité.
- Préserve la projection runtime `plan_data/is_active`, le dernier plan actif,
  les complétions et l'upsert historique.
- Distingue plan absent (`empty`) et panne (`error`) et protège des réponses
  obsolètes.

Le repository généré expose actuellement `plan/active`. Il n'est donc pas
substitué artificiellement à la projection runtime `plan_data/is_active`.

### `useNutritionRecipes`

- Utilise `NutritionRecipeRepository` avec deux lectures séparées : recettes
  privées owner-scoped et recettes publiques globales.
- Fusionne uniquement la vue d'affichage, avec déduplication par identifiant et
  ordre `created_at` décroissant stable ; les scopes d'autorité restent séparés.
- Les repas sauvegardés sont une ressource optionnelle distincte et ne sont pas
  chargés par `RecipesSection`.
- Expose état, absence, panne et retry ; les erreurs repository restent
  expurgées.

### `useNutritionGoals`

- Produit une lecture pure des quatre objectifs persistés.
- Conserve `0` comme valeur explicite et `null` comme inconnue.
- Signale objectifs complets ou partiels sans calculer de valeur de remplacement
  silencieuse.

## Cache, concurrence et mutations

Aucun nouveau cache n'est introduit. Le cache dashboard owner-scoped reste hors
de ces hooks. Les chargements asynchrones utilisent un identifiant monotone et
ne publient pas une réponse devenue obsolète.

Les mutations déjà présentes restent aux mêmes frontières fonctionnelles : eau
et complétion dans leurs hooks, journal détaillé dans `NutritionTab`, génération
et édition de recettes dans `RecipesSection`, préférences et plans générés dans
`NutritionPreferences`. Aucune mutation, table ou autorité supplémentaire n'est
créée dans cette tranche.

## Limites préservées

- `daily_food_logs`, `meal_logs` et `meal_tracking` ne sont jamais fusionnés.
- Les mutations historiques encore dans les composants seront extraites avec
  les sections de `NutritionTab`, sans refactor métier anticipé.
- `useFoodLog` conserve sa recherche directe historique, y compris ses deux
  catalogues et son debounce ; sa migration repository exige d'abord un contrat
  de filtre `source` compatible.
- Les formes runtime `plan_data/is_active` et certains champs de repas sauvegardé
  restent divergents des types générés.

## Références

- [Inventaire Nutrition](NUTRITION_FORMATS_INVENTORY.md)
- [Modèle canonique](NUTRITION_CANONICAL_MODEL.md)
- [Repositories Nutrition](NUTRITION_REPOSITORIES.md)
- [Stratégie de cache](CACHE_STRATEGY.md)
