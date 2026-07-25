# Résumé calories et macros de `NutritionTab`

> Statut : C05 raccordé le 25 juillet 2026. Cette tranche ne modifie aucune
> requête, écriture, prop publique ou formule appliquée aux données valides.

## Flux réel

```text
DashboardClientIsland
  ├─ useClientDashboard
  │    └─ profiles (objectifs de l'owner session)
  └─ NutritionTab
       └─ useNutritionJournal
            └─ daily_food_logs (owner + jour sélectionné)
                 └─ readNutritionTabSummary
                      ├─ aggregateNutritionTabConsumption
                      └─ resolveNutritionTabGoals
                           ├─ NutritionSummarySection
                           └─ NutritionJournalMealsSection
```

`NutritionTab` ne relit pas `profiles` et C05 n'ajoute aucune requête. Les
objectifs arrivent dans la prop `profile` déjà chargée par le dashboard. La
consommation arrive dans `dailyLogs` et l'état de transport dans `state`, tous
deux fournis par `useNutritionJournal`.

## Requêtes inchangées

### Objectifs

Le loader du dashboard exécute la lecture existante :

```text
profiles
  .select(DASHBOARD_PROFILE_PROJECTION)
  .eq('id', userId)
  .single()
```

La projection existante contient `calorie_goal`, `protein_goal`,
`carbs_goal` et `fat_goal`. L'owner est l'utilisateur de la session. Une
première panne place le dashboard en erreur; après un profil confirmé, une
panne conserve ce profil visible.

### Journal

`useNutritionJournal.reload` conserve ses trois requêtes parallèles :

1. `daily_food_logs`, projection `DAILY_FOOD_LOG_PROJECTION`,
   `user_id = owner`, `date = selectedDate`, `created_at ASC`, collection sans
   limite;
2. `daily_food_logs(date)`, même owner, `date >= UTC J−30`, collection sans
   ordre ni limite;
3. `water_intake(amount_ml)`, même owner et même date, `limit 50`.

Il n'existe ni cache, ni polling. La lecture s'exécute au montage et à chaque
changement de `selectedDate`, `supabase` ou `userId`; `reload` permet les
rafraîchissements explicites. Un compteur et le cleanup invalident les
réponses obsolètes. Si une des trois lectures échoue, l'état devient `error`
et les dernières valeurs confirmées sont conservées.

La date initiale, les dates du calendrier et le filtre utilisent la clé UTC
`YYYY-MM-DD` produite par `toISOString().split('T')[0]`. C05 ne change pas
cette convention.

## Cause racine

Deux conversions de rendu perdaient l'information :

- `getDailyLogsMacros` additionnait chaque champ avec `value || 0`; `null`,
  `undefined`, champ absent, chaîne vide et `NaN` devenaient zéro, tandis
  qu'une chaîne numérique pouvait concaténer et que l'infini ou un négatif
  traversaient;
- les objectifs utilisaient quatre fallbacks plausibles
  `2000/140/200/60`; une cible absente, invalide, ou un zéro réel devenait
  donc un autre objectif visible.

Les lignes du repas répétaient la même perte avec `?? 0`. Les pourcentages
calculés sur une valeur inconnue pouvaient ensuite afficher une barre à zéro
ou produire `NaN`.

## Contrat C05

Chaque métrique est évaluée indépendamment :

| Entrée | État | Valeur de rendu |
|---|---|---|
| nombre fini non négatif | connue | valeur conservée |
| zéro | connue | `0` |
| chaîne numérique non vide | connue | conversion numérique |
| `null`, `undefined`, champ absent, chaîne vide | inconnue | `null` / `—` |
| chaîne non numérique, `NaN`, infini, négatif, autre type | invalide | `null` / `—` |

Une métrique inconnue ou invalide ne masque pas les autres métriques valides
du même jour. Plusieurs lignes valides sont additionnées comme avant. Une
collection vide confirmée signifie qu'aucun aliment n'est journalisé et
produit quatre zéros connus. Une première panne produit une consommation
indisponible; une panne après une valeur visible conserve cette valeur. Les
lignes conservées d'un ancien owner ou d'une ancienne date ne sont jamais
rendues pour la nouvelle sélection.

Un objectif absent ou invalide reste `null`. L'en-tête affiche « Objectif à
définir », le résumé une lacune `—`, et aucun pourcentage ou reste n'est
calculé. Un objectif zéro reste distinct d'une absence; comme un dénominateur
zéro ne définit pas de pourcentage, la barre reste une lacune.

## Schéma runtime vérifié

Les projections existantes ont été exécutées en lecture seule contre le
backend déployé et ont répondu HTTP 200.

- Une ligne `profiles` observée contient `calorie_goal` numérique et
  `protein_goal`, `carbs_goal`, `fat_goal` à `null`.
- Les lignes `daily_food_logs` observées exposent les quatre métriques sous
  forme numérique.
- L'OpenAPI déployée décrit pourtant les quatre objectifs comme des entiers
  non nullables et les métriques du journal comme des nombres non nullables.
- Les types Supabase générés locaux décrivent les quatre objectifs et
  `daily_food_logs.protein/carbs/fat` comme nullables.

La frontière accepte donc la forme déployée réellement observée et la forme
nullable annoncée par les types locaux. Aucune projection nouvelle n'a été
introduite.

## Pourquoi aucune frontière existante n'est réutilisée

- `aggregateDesktopNutritionDay` possède son propre effet, sa projection
  minimale et son contrat desktop;
- `aggregateAnalyticsNutritionByDate` agrège plusieurs dates sans synthétiser
  les jours;
- le résumé Home combine plan, `meal_tracking` et `daily_food_logs` dans un
  cycle de trois requêtes;
- le diagnostic travaille sur la semaine précédente complète
  Europe/Zurich et calcule des moyennes pour l'IA.

Seules les règles de validation sont voisines. Owner, fenêtre, granularité,
cycle de fraîcheur et contrat UI ne sont pas identiques; un helper pur
spécifique à `NutritionTab` est donc la frontière minimale.

## Périmètre préservé

- résultats et arrondis des données valides;
- props publiques, callbacks et mutations de `NutritionTab`;
- trois requêtes du journal et lecture existante du profil;
- owner, date, projection, ordre, limite et cycle de rafraîchissement;
- C03, C04, Home, Analytics et diagnostic hebdomadaire;
- tous les `insert`, `update`, `upsert`, `delete`, RPC, payloads et
  producteurs IA.
