# Double lecture du plan personnel dans `HomeTab`

## Décision de données

`HomeTab` ne peut pas réutiliser sans nouvelle hypothèse une donnée déjà
chargée :

- ses props ne contiennent que `coachMealPlan`, issu de
  `client_meal_plans` ;
- `useClientDashboard` ne charge aucun plan personnel `meal_plans` ;
- `useNutritionPlans` appartient à `NutritionTab`, qui n'est monté qu'après
  visite de cet onglet ;
- le rafraîchissement Home dépend de `homeRefreshKey`, tandis que le hook
  Nutrition dépend de sa propre date et de son montage.

Partager cette donnée imposerait donc un nouveau cache ou un déplacement de
responsabilité sans équivalence de fraîcheur démontrée. La requête personnelle
de Home est conservée et raccordée au lecteur commun. Aucun second cache et
aucune requête ne sont ajoutés.

## Requête avant/après

La lecture s'exécute au montage puis à chaque retour sur l'onglet Home, dans le
même `Promise.all` que les complétions et les logs du jour.

| Propriété | Avant | Après |
|---|---|---|
| table | `meal_plans` | `meal_plans` |
| projection | `plan_data` | `id,user_id,created_by,name,plan,active,created_at` |
| owner | `.eq('user_id', session.user.id)` | identique via repository |
| activation | `.eq('is_active', true)` | `.eq('active', true)` |
| ordre | `created_at DESC` | identique |
| limite | 1 + `maybeSingle` | identique |
| requêtes du résumé | 3 | 3 |
| requêtes personnelles | 1 | 1 |
| cache | état local `consumedKcal` | identique |
| rafraîchissement | montage + `homeRefreshKey` | identique |

Les deux autres lectures restent exactement `meal_tracking(meal_type)`,
limite 20, et `daily_food_logs(calories)`, limite 20. Le comportement
historique de leurs erreurs comme collections vides reste inchangé.

## Lecture et calcul

`HomeTab` construit une fois le repository injecté puis appelle
`personalPlanReader.load(uid)`. `readHomeNutritionSummary` calcule le total
depuis l'enveloppe validée, sans reparcourir le JSON legacy brut :

- seuls les repas marqués complétés sont additionnés ;
- les calories des `daily_food_logs` sont ajoutées ;
- zéro explicite reste zéro ;
- valeur négative, non finie, jour inconnu ou énergie inconnue échoue
  fail-closed ;
- aucun arrondi intermédiaire n'est ajouté.

| Résultat plan | Résultat résumé | Effet visible |
|---|---|---|
| `canonical` | `ready` | `consumedKcal` mis à jour |
| `legacy_converted` | `ready` | même rendu historique |
| `not_found` | `absent` | logs seuls, seul cas d'absence |
| `conflict` | `conflict` | valeur précédente conservée |
| `invalid` | `invalid` | valeur précédente conservée |
| `legacy_unsupported` | `legacy_unsupported` | valeur précédente conservée |
| panne repository | `failure` expurgé | valeur précédente conservée |

Un compteur de requête et son cleanup empêchent une réponse ancienne de
remplacer celle du nouvel owner ou d'un rafraîchissement plus récent.

## UI, écritures et rollback

Le contrat public de `HomeTab`, ses props et ses composants restent inchangés.
`EnergyCard` et `NutritionCard` reçoivent toujours le même état
`consumedKcal`. Streak, entraînement, progression, calendrier, eau, check-in,
responsive et callbacks sont hors de la frontière.

Aucune écriture Nutrition n'est ajoutée ou migrée. Les mutations eau et
check-in préexistantes dans `HomeTab` sont inchangées.

Le rollback restaure uniquement la requête `meal_plans` et le calcul inline
précédents, puis retire `home-nutrition-summary.ts`. Les deux autres requêtes,
le cycle de rafraîchissement et le rendu ne changent pas.

Restent à raccorder les lectures du détail client coach et les autres
consommateurs directs inventoriés. Tous les producteurs, activations et
écritures restent legacy. La Phase 4 demeure `partial`.
