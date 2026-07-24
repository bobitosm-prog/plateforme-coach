# Double lecture Nutrition du détail client coach

## Inventaire des consommateurs read-only

| Consommateur | Source | Fraîcheur et contrat |
|---|---|---|
| profil et objectifs visibles | `active_related_profiles` dans `loadClientDetailProfile` | chargement global après contrôle identité/relation ; contrat profil |
| plan affecté par le coach | `client_meal_plans` dans `loadClientDetailNutrition` | chargement global, scope coach/client, dernière création |
| plan personnel actif | `meal_plans` dans `loadClientDetailNutrition` | chargement global, owner client, activation runtime |
| suivi repas initial | `meal_tracking` dans `loadClientDetailNutrition` | semaine courante, complétés uniquement, limite 200 |
| rafraîchissement du suivi | `meal_tracking` dans `loadClientDetailWeeklyTracking` | toutes les 30 secondes, même date/filtre/limite |
| libellés des aliments favoris | `food_items` dans `useClientDetailController` | chargement profil, IDs favoris, source `fitness`, limite 200 |
| catalogue de génération IA | `food_items` et `custom_foods` dans `useClientDetailAi` | uniquement sur action utilisateur |

Seules les deux lectures de plan ont un owner, un document, une sémantique
d'erreur et un besoin de conversion compatibles avec les frontières
`NutritionPlanEnvelopeV1`. Le profil, le tracking et les catalogues conservent
leurs sources et cycles de fraîcheur propres.

## Chemin historique des plans

Le détail client coach possède deux lectures de plan dans
`loadClientDetailNutrition`, appelé par `useClientDetailController` après
validation de l'identité coach et de la relation active :

```text
ClientNutrition
→ useClientDetailController
→ loadClientDetailNutrition
→ client_meal_plans + meal_plans + meal_tracking
→ casts JSON legacy
→ ClientNutrition / parseMealPlan
```

La lecture affectée alimente l'éditeur coach (`mealPlan`, objectifs et
`mealPlanId`). La lecture personnelle alimente la section « plan actif du
client ». Les deux sont chargées ensemble avec le tracking hebdomadaire.

```text
client_meal_plans
→ repository coach/client
→ readClientMealPlanRow
→ createClientDetailAssignedPlanReader
→ LegacyAssignedMealPlan
→ état React
→ ClientNutrition

meal_plans
→ repository owner actif
→ readMealPlanRow
→ createActivePersonalMealPlanReader
→ plan_data de présentation
→ état React
→ ClientNutrition / parseMealPlan
```

## Contrat avant raccordement

| Lecture | Projection | Scope | Tri | Limite |
|---|---|---|---|---|
| affectation coach | `id,calorie_target,protein_target,carb_target,fat_target,plan` | `coach_id` + `client_id` | `created_at DESC` | 1 + `maybeSingle` |
| plan personnel | `id,created_at,plan_data,is_active` | `user_id = clientUserId`, `is_active = true` | `created_at DESC` | 1 + `maybeSingle` |
| tracking | `date,meal_type,is_completed` | `user_id = clientUserId`, date ≥ lundi, complété | aucun | 200 |

Les cibles de l'affectation, `plan_data` et `is_active` ne figurent pas dans
les types générés des tables concernées. Toute erreur d'une des trois requêtes
rendait le domaine Nutrition `unavailable`. Une absence produisait `null`.
Les JSON étaient castés sans validation ; les formats anciens étaient transmis
tels quels. Le contrôleur annulait déjà toute réponse obsolète par
`detailLoadGenerationRef`.

## Frontières retenues

La requête ne peut pas être partagée avec `useNutritionPlans` ou Home : le
détail cible un client lié au coach, possède une génération de chargement
globale et charge aussi l'affectation coach. Trois requêtes restent donc
nécessaires.

- `findLatestAssignedPlanForCoachClient` effectue une lecture directe bornée
  après l'autorisation relationnelle déjà obtenue par le loader de profil. Il
  n'ajoute pas une seconde vérification distante. Sa projection spécialisée
  conserve les quatre cibles runtime requises par l'éditeur historique.
- `createClientDetailAssignedPlanReader` utilise `readClientMealPlanRow`,
  vérifie le couple coach/client et présente le contrat UI historique.
- `createActivePersonalMealPlanReader` conserve le scope owner
  `clientUserId` et utilise `readMealPlanRow`.
- le tracking reste strictement séparé.

## Contrat après raccordement

| Lecture | Projection canonique | Scope/ordre/limite |
|---|---|---|
| affectation coach | `id,client_id,coach_id,calorie_target,protein_target,carb_target,fat_target,plan,created_at,updated_at` | owners, `created_at DESC`, limite 1, `maybeSingle` |
| plan personnel | `id,user_id,created_by,plan:plan_data,active:is_active,created_at` | owner, `is_active = true`, `created_at DESC`, limite 1, `maybeSingle` |
| tracking | inchangée | inchangé |

Le nombre de requêtes initiales reste **3 → 3**. Les readers ne construisent
aucun client et ne créent aucun cache. Le contrôleur conserve la même
neutralisation des réponses obsolètes au changement de client ou démontage.

Le contrôle read-only du 24 juillet 2026 a confirmé le schéma runtime :

- `client_meal_plans` expose `week_start`, les quatre cibles, `plan`,
  `created_at` et `updated_at` en plus des identités ;
- `meal_plans` expose `plan_data` et `is_active`, avec les objectifs/totaux
  legacy au niveau SQL ;
- `meal_tracking` expose notamment `date`, `meal_type` et `is_completed`.

Les trois projections utilisées par le loader ont été exécutées avec succès.
Le couple anonymisé contrôlé possédait un plan coach `…c03a84c1` et un plan
personnel `…fb42f326`, tous deux legacy français sur sept jours et correctement
scopés.

## Matrice des résultats

| Résultat enveloppe/repository | Loader détail client | Valeur UI |
|---|---|---|
| `canonical` | `success` | presenter vers la forme historique |
| `legacy_converted` | `success` + warning interne | JSON et cibles SQL historiques conservés |
| `not_found` | `success` | `null` uniquement |
| `conflict` | `unavailable` | aucune valeur invalide publiée |
| `invalid` | `unavailable` | aucune valeur invalide publiée |
| `legacy_unsupported` | `unavailable` | format isolé |
| panne repository | `unavailable` | erreur expurgée |
| projection UI incomplète | `unavailable` | aucune inconnue transformée en zéro |

Les cibles connues d'une enveloppe canonique sont prioritaires et présentées
dans `calorie_target/protein_target/carb_target/fat_target`. Pour une forme
legacy dont l'enveloppe marque les cibles inconnues, les valeurs SQL déployées
sont conservées. Une valeur réellement absente reste `null`; une valeur non
finie ou négative rend la lecture `invalid`. Aucune inconnue, erreur ou donnée
invalide n'est transformée en zéro.

## Rendu, écritures et rollback

`ClientNutrition` reçoit toujours `mealPlan`, `clientActivePlan.plan_data`,
les mêmes callbacks et les mêmes indicateurs de sauvegarde. Son ordre, son
responsive et `parseMealPlan` ne changent pas.

`saveClientDetailMealPlan` est byte-logiquement inchangé : même
`update/insert`, mêmes scopes coach/client, même RPC profil, même ordre
parallèle et mêmes échecs partiels. Les producteurs IA, activations, payloads
et routes ne sont pas migrés.

Le rollback retire les deux readers du loader et restaure les deux requêtes
directes. Le contrôleur, le composant, le tracking et la fonction de sauvegarde
ne changent pas.

## Dette restante

Les lectures directes de profil, tracking, libellés favoris et catalogues IA
restent séparées : leurs owners, dates, filtres, cycles de fraîcheur ou
sémantiques d'erreur ne sont pas équivalents aux readers de plan. Aucun writer
ne produit encore `NutritionPlanEnvelopeV1`; la Phase 4 demeure `partial`.
