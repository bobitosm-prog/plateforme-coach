# Double lecture du plan personnel actif

## Consommateur retenu

Le seul nouveau consommateur migré est `useNutritionPlans`, utilisé par
`NutritionTab` pour lire le plan personnel actif de l'utilisateur authentifié.
Il a été retenu parmi `HomeTab`, le loader dashboard et le détail client coach
parce que sa lecture est owner-scoped, bornée à une ligne, déjà protégée
contre les réponses obsolètes et réessayable via `reload`. Le hook contient
aussi une mutation de complétion, mais celle-ci reste strictement hors de la
frontière extraite.

`HomeTab`, `lib/coaching/client-detail/nutrition.ts` et les autres lecteurs
directs ne sont pas migrés dans cette tranche.

## Contrat caractérisé

| Propriété | Avant | Après |
|---|---|---|
| table | `meal_plans` | `meal_plans` |
| requêtes de plan | 1 | 1 |
| projection | `id,user_id,plan_data,is_active,created_at` | `id,user_id,created_by,name,plan,active,created_at` |
| owner scope | `.eq('user_id', userId)` | identique |
| activation | `.eq('is_active', true)` | `.eq('active', true)` |
| ordre | `created_at DESC` | identique |
| limite | 1 + `maybeSingle` | identique |
| cache | état React owner-scoped, aucun cache persistant | identique |
| retry | `retry === reload` | identique |
| réponse obsolète | compteur `requestId` et cleanup | identique |

La nouvelle projection utilise uniquement les colonnes présentes dans les
types générés. `plan_data` et `is_active` sont des alias documentaires compris
par `readMealPlanRow`; ils ne sont pas demandés comme colonnes SQL fictives.
La lecture parallèle bornée de `meal_tracking` reste inchangée.

## Frontière et contrat UI

`lib/nutrition/personal-meal-plan-reader.ts` reçoit un port injecté
`findActivePersonalPlanForOwner(ownerUserId)`. Il appelle `readMealPlanRow`,
puis le presenter commun. Le hook continue d'exposer :

```text
{ id, user_id, plan_data, is_active: true, created_at }
```

Cette forme legacy préserve les props de `NutritionTab`,
`NutritionPlanContent`, `ShoppingList` et `toggleMeal`. Un document canonique
est projeté vers les sept jours français et leurs `meals/foods`. Un document
legacy supporté stocké dans `plan` est conservé tel quel avec un warning
interne structuré.

| Résultat de lecture | Résultat frontière | Effet hook |
|---|---|---|
| `canonical` | `ready` / `canonical` | affichage normal |
| `legacy_converted` | `ready` / `legacy_converted` | affichage compatible + warning |
| conflit document/activation | `conflict` | état `error`, jamais absence |
| document/ligne invalide | `invalid` | état `error` récupérable |
| legacy inconnu | `legacy_unsupported` | état `error` isolé |
| repository `not_found` | `absent` | seul cas produisant `null` |
| panne repository | `failure` | erreur expurgée |
| projection UI incomplète | `invalid` / `incomplete_ui_projection` | refus sans inventer zéro |

La priorité visible reste personnelle puis coach : `getTodayPlanData` teste
toujours `activeMealPlan.plan_data` avant `coachMealPlan`.

## Écritures, rollback et limites

La mutation existante `toggleMeal` conserve son unique `upsert` dans
`meal_tracking`, son payload, son `onConflict`, son rollback optimiste et son
retour booléen. Aucune écriture `meal_plans`, activation ou complétion n'a été
ajoutée ou déplacée.

Le rollback consiste à restaurer dans `useNutritionPlans` la requête directe
legacy et à retirer la frontière personnelle. `NutritionTab`, ses callbacks et
la mutation ne changent pas.

Restent à migrer :

- la lecture personnelle directe de `HomeTab` ;
- les lectures personnelle et coach du détail client ;
- les autres consommateurs inventoriés qui lisent encore un document brut ;
- tous les producteurs, activations et écritures.

La Phase 4 reste `partial`. Ce raccordement améliore la cohérence des lectures,
mais ne résout ni les producteurs legacy ni les deux divergences historiques
de totaux.
