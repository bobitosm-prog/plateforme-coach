# Premier consommateur de la double lecture des plans Nutrition

## Consommateur retenu

Le seul consommateur migré est `findLatestCoachMealPlan` dans
`lib/client-dashboard/nutrition-measurements-loader.ts`, utilisé par le
dashboard client pour transmettre le dernier plan coach à `HomeTab` et
`NutritionTab`.

Ce choix minimise le rayon d'impact :

- lecture seule, sans callback de mutation ;
- projection exacte et bornée à `plan`;
- scope `client_id` déjà dérivé du profil authentifié ;
- tri `created_at DESC`, limite 1 et `maybeSingle`;
- contrat UI historique : un JSON de semaine ou `null`;
- tests unitaires préexistants du loader ;
- rollback limité au retrait de `readLatestCoachMealPlan(mealPlan)`.

La [lecture personnelle de `useNutritionPlans`](NUTRITION_PERSONAL_PLAN_DOUBLE_READ.md)
est désormais le second raccordement et le
[résumé Home](NUTRITION_HOME_PLAN_DOUBLE_READ.md) le troisième. Le détail
client coach et les autres lectures directes restent explicitement non migrés.

| Candidat lors du premier raccordement | Décision initiale | Motif |
|---|---|---|
| `useNutritionPlans` | différé | combine lecture, cache/lifecycle et mutation `meal_tracking`; projection legacy `plan_data/is_active` |
| `lib/coaching/client-detail/nutrition.ts` | différé | charge plans personnel et coach et contient la sauvegarde coach dans le même domaine |
| `HomeTab` | différé | requête directe `plan_data`, calcul du jour et composition UI dans le composant |
| `NutritionTab` / section plans | différé | consomme simultanément plan personnel prioritaire, plan coach et shopping |
| dernier plan coach du dashboard | retenu | lecture seule `plan`, une ligne, presenter et rollback isolés |

## Contrat avant raccordement

| Élément | Comportement |
|---|---|
| Table | `client_meal_plans` |
| Projection | `plan` |
| Scope | `.eq('client_id', clientUserId)` |
| Ordre | `.order('created_at', { ascending: false })` |
| Limite | `.limit(1).maybeSingle()` |
| Absence | repository `not_found`, exposé à l'UI comme `null` |
| Panne | erreur repository expurgée, échec du loader |
| Contenu | `plan` brut transmis sans validation |
| UI | `coachMealPlan` JSON brut, ensuite lu par les adaptateurs historiques |

Les formes `plan_data` et `is_active` ne sont pas projetées par ce lecteur et
ne sont pas ajoutées.

## Contrat après raccordement

`lib/client-dashboard/coach-meal-plan-reader.ts` reçoit le
`RepositoryResult<{plan}>`, appelle `readClientMealPlanRow()` puis présente un
document valide dans le contrat UI historique :

| Résultat commun | Résultat consommateur | Comportement |
|---|---|---|
| `canonical` | `ready`, source `canonical` | projection explicite vers les sept jours français `meals/foods` |
| `legacy_converted` | `ready`, source `legacy_converted` | JSON original conservé byte-logiquement, warning interne |
| `conflict` | `conflict` | échec récupérable `document_conflict`, jamais absence |
| `invalid` | `invalid` | échec récupérable `invalid_document` |
| `legacy_unsupported` | `legacy_unsupported` | isolation `unsupported_legacy` |
| repository `not_found` | `absent` | seul cas produisant `coachMealPlan: null` |
| repository failure | `failure` | catégorie expurgée conservée |

Le presenter refuse une projection si quantité, calories, protéines, glucides
ou lipides sont inconnus. Il ne transforme donc aucune inconnue en zéro.
Fibres inconnues restent hors du contrat UI historique, qui ne les affiche pas.

Le loader agrégé conserve son contrat public de succès. En cas de document
invalide, conflictuel ou unsupported, il retourne son échec existant avec
`sources: ['coach_meal_plan']` et un `planReason` stable. Aucun contenu,
identifiant ou détail SQL n'est journalisé.

## Requêtes avant/après

| Propriété | Avant | Après |
|---|---|---|
| requêtes `client_meal_plans` | 1 | 1 |
| projection | `plan` | `plan` |
| filtre | `client_id` | `client_id` |
| tri | `created_at DESC` | `created_at DESC` |
| limite | 1 | 1 |
| construction Supabase | existante injectée | inchangée |
| écritures | 0 | 0 |

La neutralisation des réponses obsolètes reste assurée par le coordinateur
`ProfileLoadCoordinator` de `useClientDashboardData`: le raccordement ne crée
aucune nouvelle promesse, requête, subscription ou cache.

## Double lecture couverte

Les tests du lecteur commun continuent de couvrir :

- `plan` seul et `plan_data` seul ;
- sources équivalentes ou divergentes ;
- canonique invalide avec legacy valide ;
- `active`/`is_active` identiques ou divergents.

Le consommateur sélectionné ne demande que `client_meal_plans.plan`; il ne
simule pas des colonnes inexistantes pour répéter ces cas.

## Rollback et limites

Le rollback restaure l'affectation directe
`mealPlan.ok ? mealPlan.data.plan : null` dans le loader et supprime la
frontière isolée. La requête, le cache et l'UI ne changent pas.

Restent non migrés :

- `lib/coaching/client-detail/nutrition.ts`;
- les producteurs préférences, onboarding, diagnostic, coach IA et édition
  coach ;
- toutes les écritures et désactivations.

La Phase 4 reste `partial`; les deux divergences historiques restent visibles.
