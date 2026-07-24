# Contrôle Nutrition read-only de génération initiale

## Portée et flux complet

Ce raccordement ne concerne que le contrôle d'existence qui précède la
génération initiale. Le producteur IA, les mutations et les payloads restent
hors périmètre.

```text
DashboardClientIsland
  → useClientDashboard
    → sessionProfileLoader / profileRepository
    → profile.needs_initial_generation + session.user.id
  → useInitialGeneration
    → createNutritionPlanRepository
      → findFirstActivePersonalPlanForOwner
        → Supabase meal_plans
    → createActivePersonalMealPlanReader
      → readMealPlanRow / NutritionPlanEnvelopeV1
    → settleInitialGenerationMealPlanControl
      → hasMeal local
    → step React
      → bannière « Préparation de ton plan nutrition... »
```

Le profil peut venir du cache dashboard owner-scoped de cinq minutes ou de la
lecture profil coordonnée. Le contrôle `meal_plans` n'a aucun cache, polling
ou refresh : il part une fois par montage après résolution de `userId`,
`profile`, `supabase` et du flag. `startedRef` empêche une seconde lecture.
Le cleanup pose `cancelled = true`; il neutralise les `setStep` obsolètes mais
ne doit pas annuler les écritures déjà engagées.

## Inventaire des lectures

| Source | Rôle dans ce flux | Lecture directe du hook |
|---|---|---|
| `profiles` | fournit `needs_initial_generation` et le profil de génération | non, chargé en amont par le dashboard |
| `meal_plans` | contrôle Nutrition read-only | oui, une requête |
| `custom_programs` | contrôle Training indépendant | oui, une requête après Nutrition |
| `client_meal_plans` | aucun | non |
| `meal_tracking` | aucun | non |
| `saved_meals` | aucun | non |

Les deux contrôles restent séquentiels. Une exception levée par le premier
conserve le repli historique « générer les deux ». Une panne Supabase normale,
retournée comme résultat, est expurgée par le repository et équivaut à
`hasMeal = false` au premier chargement.

## Requête avant et après

| Propriété | Avant | Après |
|---|---|---|
| table | `meal_plans` | `meal_plans` |
| nombre | 1 | 1 |
| owner | session `userId` via `user_id` | identique |
| activation | `is_active = true` | identique |
| projection | `id` | `id,user_id,created_by,plan:plan_data,active:is_active,created_at` |
| ordre | aucun | aucun |
| limite | 1 | 1 |
| résultat PostgREST | collection | collection |
| `single` / `maybeSingle` | aucun | aucun |
| cache / polling / refresh | aucun | identique |

La méthode existante `findActivePersonalPlanForOwner` n'est volontairement
pas réutilisée directement : elle impose `created_at DESC` et
`maybeSingle`, deux sémantiques absentes de ce contrôle. La méthode spécialisée
`findFirstActivePersonalPlanForOwner` conserve la requête historique et injecte
son résultat dans le reader commun.

## Schéma runtime vérifié

Le 24 juillet 2026, une lecture distante anonymisée a exécuté avec succès :

- la projection historique `meal_plans(id)` filtrée sur `is_active`;
- la projection finale avec les alias PostgREST `plan:plan_data` et
  `active:is_active`;
- le contrôle `custom_programs(id,user_id,is_active)` sous sa forme exacte
  `select('id')`;
- l'entrée profil `profiles(id,needs_initial_generation)`.

La ligne active anonymisée `…47ad21ff` a exposé exactement `active`,
`created_at`, `created_by`, `id`, `plan`, `user_id`. Son document était une
semaine legacy française sur sept jours. Aucune écriture distante n'a été
effectuée et aucune donnée personnelle n'a été copiée.

## Matrice de décision

Le contrôle ne rend pas le plan : il décide seulement si une génération est
nécessaire. Pour préserver le `select('id')` déployé, toute ligne active
trouvée reste « présente », même si son document n'est pas affichable.

| Résultat reader | Preuve de contrôle | `hasMeal` au premier chargement |
|---|---|---:|
| `ready / canonical` | `canonical` | `true` |
| `ready / legacy_converted` | `legacy_converted` | `true` |
| `absent` | `not_found` | `false` |
| `conflict` | `conflict` | `true` |
| `invalid` | `invalid` | `true` |
| `legacy_unsupported` | `legacy_unsupported` | `true` |
| `failure` | `failure` | `false` |

Une panne après une décision déjà visible conserve la présence précédente et
porte l'état `error`; une réponse déclarée obsolète conserve tout l'état
précédent. Le hook n'expose pas cette décision et ne lance pas de second
contrôle dans son cycle actuel. La bannière continue d'être protégée par
`cancelled`.

## Production, rendu et écritures

`origin/main` (`e61b532`) contient le contrôle direct historique
`select('id') / user_id / is_active / limit(1)`. Le raccordement reproduit sa
décision, son ordre d'exécution, sa limite, son repli d'erreur et son timing.
Seule la projection devient assez riche pour traverser la frontière canonique.

L'API de `useInitialGeneration`, les props de `DashboardClientIsland`, les
libellés, les callbacks et les transitions `idle/meal/program/done/error`
restent inchangés. Les appels `generate-meal-plan`, la consommation SSE,
`meal_plans.update`, `meal_plans.insert`, la génération Training et
`updateProfile` n'ont pas été déplacés ou modifiés.

La Phase 4 reste `partial` à cause des deux divergences historiques de totaux.
RC1 reste à 0/38 et la Phase 9 inactive.
