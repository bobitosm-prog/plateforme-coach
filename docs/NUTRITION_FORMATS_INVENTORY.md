# Inventaire des formats Nutrition

> État vérifié le 18 juillet 2026 contre le code, les migrations et
> `lib/supabase/database.types.ts`. Ce document décrit l'existant ; il ne
> désigne pas encore un schéma canonique et ne garantit pas que le schéma
> distant corresponde aux migrations locales.

## Périmètre et méthode

L'inventaire couvre les plans, repas, aliments, recettes, journaux, objectifs,
préférences, génération IA, diagnostics et notifications qui consomment des
données Nutrition. Les noms de colonnes ci-dessous sont ceux réellement
rencontrés. Une colonne utilisée par l'application mais absente des types
générés est marquée **runtime uniquement**.

Documents de contexte : [stratégie de cache](CACHE_STRATEGY.md),
[repositories Supabase](SUPABASE_REPOSITORIES.md),
[types Supabase](SUPABASE_TYPES.md), [matrice RLS](RLS_TEST_MATRIX.md) et
[guide de contribution](CONTRIBUTING.md).

## Carte des sources

```text
profiles ─────────────── objectifs, régime, allergies, préférences
   │
   ├─ generate-meal-plan / templates ──> meal_plans (plan JSON personnel/IA)
   ├─ coach UI ─────────────────────────> client_meal_plans (plan JSON coach)
   └─ weekly diagnostic <─────────────── daily_food_logs + weight/workouts

food_items ───────┐
community_foods ──┼─ recherche / scanner / recettes ──> daily_food_logs
custom_foods ─────┘                                  └─> saved_meals

meal_plans + client_meal_plans ──> NutritionTab / HomeTab / dashboard coach
daily_food_logs ─────────────────> analytics / badges / diagnostic
meal_tracking ───────────────────> conformité au plan / coach analytics
recipes ─────────────────────────> bibliothèque privée et recettes publiques
water_intake ────────────────────> compteur hydratation du jour
```

Il n'existe pas de repository Nutrition dédié. Le loader dashboard ne lit que
le dernier `client_meal_plans.plan`, avec poids, mensurations et photos. Les
autres accès passent directement par les clients Supabase des composants,
hooks, routes ou tâches serveur.

## Sources SQL et ownership

| Source | Structure observée | Ownership et RLS observés | Remarques |
|---|---|---|---|
| `profiles` | `calorie_goal`, `protein_goal`, `carbs_goal`, `fat_goal`, `tdee`, `dietary_type`, `allergies[]`, `liked_foods[]`, `meal_preferences jsonb`, `activity_level`, poids/objectifs | profil propre ; la vue `active_related_profiles` expose les champs Nutrition aux relations actives | Préférences non schématisées ; objectifs persistés, parfois recalculés côté UI. |
| `meal_plans` | types générés : `plan jsonb`, `active`, `user_id`, `created_by`, `name` | utilisateur sur `user_id`; lecture coach via `coach_clients`; anciennes policies permissives supprimées | L'application utilise surtout `plan_data` et `is_active`, absents des types générés. |
| `client_meal_plans` | types générés : `client_id`, `coach_id`, `plan jsonb` | lecture client ; gestion coach selon `coach_id` | L'application utilise aussi `week_start`, `calorie_target`, `protein_target`, `carb_target`, `fat_target`, absents des types. Policies historiques ne vérifient pas systématiquement une relation active. |
| `daily_food_logs` | date, `meal_type`, `food_id`, `custom_name`, `quantity_g`, calories/protein/carbs/fat | propriétaire ; lecture coach via relation | `food_id` ne référence que `community_foods`; les aliments `food_items` ou personnalisés deviennent souvent un nom libre. |
| `meal_logs` | `logged_at`, `meal_type`, `food_name`, `quantity_g`, macros | propriétaire et lecture coach liée | Historique concurrent, supprimé par le RPC de suppression, mais sans producteur UI principal identifié. |
| `meal_tracking` | types générés : date, type, `completed` | propriétaire ; lecture coach liée | L'UI utilise `meal_plan_id`, `is_completed`, `completed_at`, absents des types. Il s'agit d'un marqueur de conformité, pas d'un journal nutritionnel. |
| `saved_meals` | `foods jsonb`, totaux, type, nom, owner | propriétaire | L'UI utilise `use_count`, `total_proteins`, `total_fats`; les types exposent `total_protein`, `total_fat` et aucun `use_count`. |
| `food_items` | types : `calories`, `protein`, `carbs`, `fat`, portion, source, barcode | catalogue sans owner, lecture publique | Le code demande `energy_kcal`, `proteins`, `carbohydrates`, `fat`. Sources rencontrées : `fitness` et `ANSES`. |
| `community_foods` | valeurs `*_per_100g`, fibre, portion, barcode, `created_by`, vérification | lecture globale ; tout utilisateur authentifié peut insérer | `created_by` est nullable et l'insert policy ne l'attache pas à `auth.uid()` ; pas de policy d'update/delete applicative. |
| `custom_foods` | types : calories/proteins/carbs/fat, barcode, image, scan metadata, `user_id` | propriétaire | Migrations et code divergent entre singulier/pluriel et `*_per_100g`; `brand`/portion existent dans une migration mais pas dans les types générés affichés. |
| `recipes` | macros par portion, `ingredients jsonb`, `instructions jsonb`, catégorie, source, owner/public | propriétaire en écriture ; lecture publique si `is_public` | Ingrédients seedés `{name, quantity: string, unit}` ; IA produit `{name, quantity_g, calories, proteins, carbs, fat}`. Admin historique fondé sur metadata Auth, distinct du contrat `ADMIN_EMAIL`. |
| `water_intake` | `amount_ml`, date, owner | propriétaire | Objectif `profiles.water_goal` apparaît dans la migration, mais n'est pas présent dans l'extrait des types générés audité. |
| `nutrition` | seulement référencée par `delete_user_account(client_id)` | contrat inconnu | Table fantôme : aucun DDL ni producteur/consommateur applicatif trouvé dans les migrations auditées. |
| `weekly_diagnostics` | agrégats et recommandations JSON | propriétaire/service serveur selon flux | Consomme les calories/macros du journal ; peut déclencher de nouveaux objectifs et une régénération de plan. |

Aucune vue Nutrition dédiée n'a été trouvée. `active_related_profiles` est une
vue d'autorisation transverse qui expose objectifs et préférences Nutrition.
Aucune RPC Nutrition de calcul ou de sauvegarde n'a été trouvée ;
`delete_user_account` supprime/anonymise plusieurs sources Nutrition.

## Matrice producteurs / consommateurs

| Format | Producteurs principaux | Consommateurs principaux |
|---|---|---|
| Préférences et objectifs profil | onboarding, `NutritionPreferences`, diagnostic appliqué | génération IA, NutritionTab, coach detail, diagnostic, dashboard |
| Plan personnel/IA | `useInitialGeneration`, `NutritionPreferences`, coach detail via génération | NutritionTab, HomeTab, diagnostic detail, shopping list |
| Plan coach | `useClientDetail`, onboarding photo/AbsCalculator | loader dashboard, NutritionTab, ClientNutrition |
| Journal quotidien | FoodSearch, BarcodeScanner, photo IA, import/copie/repas sauvegardé dans NutritionTab | NutritionTab, HomeTab, analytics, badges, diagnostic, coach |
| Conformité repas | NutritionTab | HomeTab, coach analytics/detail |
| Repas sauvegardé | NutritionTab | NutritionTab « Mes repas » et réutilisation |
| Catalogue `food_items` | seed/import historique, ajout/suppression coach | onboarding, recherche, préférences, recettes, NutritionTab |
| Catalogue communautaire | scanner et route de recherche | food search, journal quotidien |
| Aliment personnalisé/scanné | FoodLog, BarcodeScanner | scanner, génération de plans coach, statistiques de scan |
| Recette | `/api/generate-recipe`, RecipesSection | RecipesSection |
| Analyse photo | `/api/analyze-meal-photo` | NutritionTab puis `daily_food_logs` |
| Eau | NutritionTab | NutritionTab |
| Agrégats hebdomadaires | générateur de diagnostic (manuel/cron) | cartes et détail diagnostic, ajustement d'objectifs |

Les surfaces client sont principalement `NutritionTab`, `NutritionPreferences`,
`FoodSearch`, `BarcodeScanner`, `RecipesSection`, `NutritionDashboard`,
`HomeTab` et l'onboarding. Les surfaces coach sont `useClientDetail`,
`ClientNutrition`, `useCoachDashboard` et `useCoachAnalytics`. Aucun composant
admin Nutrition spécialisé n'a été trouvé ; le coach peut toutefois administrer
le catalogue `food_items` depuis son dashboard.

## Formats de plans

### Format tolérant déjà nommé « canonique » dans le code

`lib/meal-plan.ts` définit une semaine partielle indexée par jours français :

```ts
type Food = { name: string; qty: number; kcal: number; prot: number; carb: number; fat: number }
type Meal = { type: 'Petit-déjeuner' | 'Déjeuner' | 'Collation' | 'Dîner'; foods: Food[] }
type DayPlan = { meals: Meal[]; totals?: { kcal: number; prot: number; carb: number; fat: number } }
type MealPlan = Partial<Record<'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche', DayPlan>>
```

Il s'agit d'un adaptateur tolérant, pas encore d'un modèle métier validé : les
valeurs invalides deviennent zéro, un type de repas inconnu devient
`Petit-déjeuner`, et les jours inconnus sont ignorés.

### Formats legacy acceptés

1. **Coach/template** : `{ lundi: { meals: [{ type, foods }] } }`, aliments
   `{ name, qty, kcal, prot, carb, fat }`. Les templates statiques utilisent
   parfois `qty: "60g"`, alors que le type partagé attend un nombre.
2. **Ancienne sortie IA** : `{ lundi: { repas: { petit_dejeuner: [...] },
   total_kcal, total_protein, total_carbs, total_fat } }`, aliments
   `{ aliment, quantite_g, kcal, proteines, glucides, lipides }`.
3. **Sortie IA actuelle stockée** : semaine française dont chaque jour contient
   `meals` et `totals`, après conversion de la sortie legacy dans la route.
4. **Plan coach enrichi runtime** : même semaine plus cibles séparées dans la
   ligne `client_meal_plans`.
5. **Plan personnel runtime** : semaine stockée dans `meal_plans.plan_data`,
   avec objectifs et `is_active`; les types générés décrivent à la place
   `plan` et `active`.
6. **Import feuille** : `ImportPlanSheet` reçoit le plan sélectionné et importe
   un repas dans le journal ; il ne définit pas un schéma SQL distinct.

Priorité d'affichage actuelle : `NutritionTab` préfère le plan personnel actif
au plan coach. Le loader dashboard ne charge que le plan coach. Cette différence
est un comportement legacy, pas une règle métier validée.

## Repas, journaux et journées

- Les clés persistées de repas sont surtout `petit_dejeuner`, `dejeuner`,
  `collation`, `diner`; les libellés UI sont accentués et capitalisés.
- Les préférences utilisent aussi `breakfast`, `snack`, `lunch`, `dinner`, puis
  `buildMealPlanParams` les transforme en `morning`, `lunch`, `snack`, `dinner`.
- `daily_food_logs` persiste une ligne par aliment et jour. Les macros sont des
  valeurs absolues pour la quantité enregistrée, recalculées par ratio lors
  d'une modification de quantité.
- `meal_tracking` ne contient pas les aliments ; il indique qu'un type de repas
  planifié est terminé.
- `meal_logs` constitue un second journal de consommation, sans lien avec
  `daily_food_logs`. Aucun rapprochement automatique n'est démontré.
- `saved_meals.foods` est un JSON libre. Selon le producteur, la quantité est
  `quantity` ou `quantity_g`, les protéines `protein` ou `proteins`, et les
  lipides `fat` ou `fats`.
- Copier, vider, importer ou appliquer un repas réalise plusieurs écritures
  séquentielles. Une panne intermédiaire peut produire un repas partiel.

## Aliments, portions et unités

Trois catalogues coexistent : global (`food_items`), communautaire
(`community_foods`) et personnel (`custom_foods`). Un quatrième catalogue pur,
`FITNESS_FOODS`, alimente le prompt IA sans persistance.

| Concept | Synonymes rencontrés |
|---|---|
| énergie | `calories`, `energy_kcal`, `kcal`, `calories_per_100g`, `calories_per_serving`, `total_kcal` |
| protéines | `protein`, `proteins`, `prot`, `proteines`, `protein_per_100g`, `proteins_per_100g` |
| glucides | `carbs`, `carb`, `carbohydrates`, `glucides`, `carbs_per_100g` |
| lipides | `fat`, `fats`, `lipides`, `fat_per_100g`, `fats_per_100g` |
| quantité | `qty`, `quantity`, `quantity_g`, `quantite_g`, `serving_size_g` |
| aliment | `name`, `aliment`, `food_name`, `custom_name` |

Les valeurs peuvent être par 100 g, par portion ou déjà multipliées par la
quantité. Les recettes acceptent aussi `ml`, `piece(s)`, `gousse` et `pincee`.
Les templates contiennent des textes tels que `1 grande`; aucun moteur commun
de conversion unité/portion n'existe. `FITNESS_FOODS.state` distingue cru,
cuit, sec et prêt à consommer, mais cette information disparaît des plans et
journaux. La fibre et le sucre sont fournis par Open Food Facts, mais seule la
fibre existe dans `community_foods`; ils ne participent pas aux agrégats usuels.

Les macros sont à la fois persistées et calculées : objectifs persistés dans le
profil, totaux optionnels dans les plans, totaux persistés dans `saved_meals`,
sommes recalculées côté UI/diagnostic, et recalcul proportionnel lors du
changement de quantité. Il n'existe pas de règle d'arrondi ou de source
d'autorité unique.

## Préférences, allergies et régimes

- `dietary_type` est une chaîne libre. Valeurs observées : `omnivore`,
  `vegan`, `vegetarian`/`vegetarien`, `pescetarien`, `keto`, `paleo`,
  `mediterraneen`, `halal`, `kosher`, `gluten_free`/`sans_gluten`,
  `lactose_free`/`sans_lactose`.
- `allergies` et `liked_foods` sont des tableaux de chaînes.
- `meal_preferences` est un JSON sans schéma : listes par repas FR ou EN et
  `disliked_foods` sont lus à différents endroits.
- Le prompt IA applique des règles alimentaires, mais la sauvegarde SQL ne
  valide ni régime, ni allergène, ni compatibilité des aliments.

## IA, imports et fournisseurs externes

- `/api/generate-meal-plan` appelle Anthropic, génère sept jours séparément,
  reçoit le JSON français legacy, puis convertit chaque jour. Un échec de jour
  est remplacé par un jour vide ; le résultat hebdomadaire peut donc être
  partiel sans statut métier explicite.
- `/api/generate-recipe` appelle Anthropic et renvoie un autre format
  d'ingrédients/instructions avant insertion par le navigateur.
- `/api/analyze-meal-photo` envoie une image à Anthropic et renvoie aliments,
  quantités et macros estimés. NutritionTab effectue ensuite une insertion par
  aliment, non transactionnelle.
- `/api/food-barcode` interroge Open Food Facts et transforme les nutriments
  par 100 g. BarcodeScanner duplique ensuite vers `custom_foods`,
  `community_foods` et/ou `daily_food_logs` par écritures indépendantes.
- `/api/food-search` utilise le `service_role` après authentification pour lire
  deux catalogues. Ce bypass RLS est plus large que nécessaire pour des tables
  déjà lisibles et la projection `food_items` ne correspond pas aux types.
- Les sources `fitness` et `ANSES` sont requêtées directement ; aucun pipeline
  d'import versionné ni provenance détaillée n'a été trouvé.

## Cache et effets dérivés

Aucune clé `localStorage` ou `sessionStorage` propre à Nutrition n'a été trouvée.
Le cache agrégé `dashboard_<userId>` peut contenir le plan coach et est
owner-scoped par le loader session/profil. La génération initiale et
l'application d'un diagnostic invalident ce cache. Les états NutritionTab
(jour, journal, eau, repas sauvegardés) restent en mémoire React.

Les consommateurs indirects sont : badges (`first_meal`, streak, macros),
analytics sept jours, HomeTab, rappels de streak et diagnostics hebdomadaires.
Le diagnostic calcule des moyennes depuis `daily_food_logs` et peut modifier
les objectifs profil puis régénérer un plan ; ces opérations multi-sources ne
sont pas transactionnelles. Les notifications ne transportent pas de plan ou
de journal complet, mais peuvent être déclenchées par les métriques dérivées.

## Divergences et risques principaux

1. **Schéma/types/runtime divergents** : les groupes de colonnes détaillés dans
   les sections SQL ne peuvent pas être typés honnêtement avec les types
   générés actuels. Des requêtes peuvent échouer par `42703` selon le schéma.
2. **Quatre représentations de plan** et plusieurs vocabulaires FR/EN coexistent
   dans des JSON sans version.
3. **Deux journaux de consommation** (`daily_food_logs`, `meal_logs`) plus un
   marqueur distinct (`meal_tracking`) ne sont pas reliés.
4. **Trois catalogues persistés et un catalogue en code** utilisent des noms,
   unités et bases nutritionnelles incompatibles.
5. **Owner nullable ou absent** : catalogues globaux, recettes publiques,
   `client_meal_plans` nullable et lignes communautaires sans `created_by`
   obligatoire rendent la provenance incomplète.
6. **RLS coach historique** : plusieurs policies vérifient une relation, mais
   pas nécessairement son état actif. La policy `client_meal_plans` centrée sur
   `coach_id` ne prouve pas à elle seule une affectation active.
7. **Écritures séquentielles** : génération, remplacement de plan, import/copie
   de repas, analyse photo, scanner et diagnostic peuvent laisser un état
   partiel. Aucune idempotence commune n'est démontrée.
8. **Calculs non unifiés** : arrondis, quantités cuit/cru, totaux persistés et
   recalculés peuvent diverger sans signalement.
9. **Validation permissive** : l'adaptateur de plan transforme silencieusement
   des champs inconnus en repas par défaut ou valeurs zéro.
10. **Autorité navigateur** : beaucoup de méthodes reçoivent `userId` comme
    prop et comptent sur la RLS. Les routes IA authentifient, mais certains
    paramètres profil/macros restent fournis par le corps.
11. **Admin recettes legacy** : la policy fondée sur `raw_user_meta_data.role`
    ne correspond pas au contrat serveur `ADMIN_EMAIL` documenté ailleurs.
12. **Formats impossibles à relier sans hypothèse** : un `daily_food_logs`
    portant seulement `custom_name`, une entrée `meal_logs.food_name`, un
    aliment JSON de repas sauvegardé et un ingrédient de recette n'ont pas de
    clé catalogue commune.

## Ordre proposé pour le futur modèle canonique

1. Définir les unités, bases (`per_100g`, portion, quantité consommée), règles
   d'arrondi et vocabulaires de macro.
2. Définir `FoodCatalogEntry`, `FoodReference`, `Portion` et provenance avant
   de normaliser les plans.
3. Définir `Meal`, `MealDay`, `MealPlan`, objectifs et version de format, en
   séparant plan personnel et affectation coach.
4. Définir `FoodLogEntry` et `MealCompletion`, sans fusion implicite des trois
   historiques actuels.
5. Définir recette et ingrédients en réutilisant les portions canoniques.
6. Définir préférences/régimes/allergies avec des valeurs contrôlées et une
   stratégie explicite pour les chaînes libres.
7. Ajouter des adaptateurs read-only et des tests d'invariants avant toute
   migration SQL, repository ou bascule UI.
8. Auditer/renforcer ensuite RLS, ownership actif, transactions et
   réconciliation des totaux.

## Adaptateurs legacy attendus

1. `meal_plans.plan_data` / `meal_plans.plan` vers plan canonique.
2. `client_meal_plans.plan` et cibles runtime vers affectation coach canonique.
3. sortie IA française `repas/aliment/quantite_g` vers journée canonique.
4. template statique `qty` textuel vers prescription de portion isolant les
   unités non convertibles.
5. `daily_food_logs` vers entrée de journal canonique.
6. `meal_logs` vers historique legacy distinct.
7. `meal_tracking` vers marqueur de complétion distinct.
8. `saved_meals.foods` vers repas réutilisable canonique.
9. `food_items`, `community_foods`, `custom_foods` et `FITNESS_FOODS` vers une
   projection catalogue commune conservant provenance et base nutritionnelle.
10. recette seedée et recette IA vers recette canonique versionnée.
11. réponse Open Food Facts et analyse photo vers candidats non vérifiés, avant
    toute persistance.
12. `profiles.meal_preferences` FR/EN vers préférences structurées.

Ces adaptateurs doivent conserver la source et les champs non compris, émettre
des avertissements structurés et refuser de présenter une valeur zéro comme une
normalisation fiable.
