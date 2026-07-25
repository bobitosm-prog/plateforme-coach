# Adhérence repas Nutrition dans Analytics coach

## Périmètre et flux

C10 couvre exclusivement l'indicateur d'adhérence repas rendu dans chaque
ligne de `CoachAnalytics`. Le flux est :

`CoachAnalytics → useCoachAnalytics → relations actives →
active_related_profiles → lecture groupée meal_tracking →
aggregateCoachMealAdherence → ClientAnalytics → badge repas`.

Les cartes clients, séances, poids, streak, statuts, filtres et tris conservent
leurs calculs historiques. Cette lecture ne transporte ni aliment, ni macro,
ni plan Nutrition et n'est donc pas compatible avec
`NutritionPlanEnvelopeV1`.

## Autorité et requête

L'owner de la surface est `coachId`. Le scope client est construit en deux
étapes :

1. `listActiveClientsForCoach(coachId, limit 100)` ne conserve que les
   relations `status = active`;
2. `listActiveRelatedProfiles(clientIds, limit 100)` passe par la vue
   `active_related_profiles`, qui vérifie également la relation active.

Une seule requête `meal_tracking` est ensuite exécutée pour tous les profils
visibles :

```text
select('user_id, date, is_completed')
in('user_id', clientIds)
gte('date', fetch7d)
```

Il n'existe ni tri, ni limite, ni `single/maybeSingle`. `fetch7d` conserve le
calcul historique : date locale moins sept jours, puis date civile extraite
de `toISOString()`. La borne basse est inclusive et il n'existe pas de borne
haute. La requête reste la troisième des trois lectures Analytics parallèles
(`completed_sessions`, `weight_logs`, `meal_tracking`).

Le chemin complet avec clients exécute donc cinq lectures : relations,
profils liés, puis ces trois lectures parallèles. Sans relation active, il
s'arrête après la première. C10 reste une seule requête groupée et n'ajoute
aucune lecture par client.

Le chargement se produit au montage/changement de coach et via `refresh`.
Il n'existe ni polling, ni cache réseau. Un compteur de requête et le cleanup
du hook ignorent désormais toute réponse d'un ancien refresh, coach ou
composant démonté.

## Schéma runtime vérifié

La projection distante étendue
`meal_tracking(user_id,date,meal_type,is_completed)` répond HTTP 200.
L'OpenAPI déployée décrit :

- `user_id` : UUID, non marqué requis par l'OpenAPI;
- `date` : date, requise, valeur par défaut `CURRENT_DATE`;
- `meal_type` : texte, requis;
- `is_completed` : booléen non marqué requis, valeur par défaut `false`;
- aucune colonne `client_id` et aucune colonne `completed`.

Les types générés locaux sont en retard : ils exposent encore
`completed: boolean | null` et n'exposent pas `is_completed`. C10 conserve donc
la projection runtime déjà validée. Le scope ne repose sur aucune relation
PostgREST embarquée : il est dérivé avant la requête, puis protégé par la RLS
coach/client historique.

## Formule historique

La formule reste :

```text
arrondi(nombre de lignes is_completed = true / 28 × 100)
```

Le dénominateur fixe représente `7 jours × 4 repas`. Il ne dépend ni du nombre
de lignes observées, ni d'un plan assigné. Une ligne valide `false` rend donc
le calcul connu et peut produire un vrai `0 %`. Les doublons valides continuent
à compter comme plusieurs lignes, car la projection historique ne transporte
ni identifiant ni clé de déduplication. Les valeurs valides et leur arrondi
sont inchangés.

Un dénominateur non fini ou inférieur ou égal à zéro est explicitement non
calculable. Le chemin runtime utilise toujours 28.

## États read-only

Chaque client possède désormais une valeur et un statut :

| Entrée | Statut | Pourcentage |
|---|---|---:|
| au moins une ligne valide | `known` | formule historique |
| succès `[]` ou aucune ligne pour ce client | `no_tracking` | `null` |
| date ou `is_completed` invalide dans le scope | `invalid` | `null` |
| panne au premier chargement | `unavailable` | `null` |
| panne après résultat confirmé | `stale` | dernière valeur confirmée |

Une ligne d'un client hors scope est ignorée. Une date antérieure à la borne
est exclue. `is_completed` doit être un booléen; `null`, chaîne ou autre type
rend uniquement le client concerné non calculable. `data = null` sans erreur
est une réponse invalide et devient une panne, jamais une collection vide.

Visuellement, une adhérence non calculable affiche `—`; un vrai zéro issu d'au
moins une ligne valide `false` affiche toujours `0%`. Une panne ne vide pas les
autres métriques coach : elles continuent d'être recalculées. Si une valeur
d'adhérence du même coach était visible, elle reste affichée pendant la panne.
Un changement de coach efface immédiatement toute valeur confirmée de l'ancien
scope.

## Frontière retenue

`aggregateCoachMealAdherence` est spécifique à Analytics coach. Les frontières
existantes ne sont pas réutilisées :

- le détail client charge un owner unique, une semaine choisie et une limite
  200;
- `useNutritionPlans` charge un jour et uniquement les repas complétés;
- Home possède son propre cycle à trois requêtes;
- les agrégations Progression portent des calories/macros, pas une conformité
  à dénominateur fixe.

Réutiliser l'une d'elles modifierait owner, fenêtre, projection, granularité,
limite ou cycle de fraîcheur.

## Périmètre préservé

Le nombre de requêtes, l'owner, le scope de relations actives, la projection,
la borne, l'absence de tri/limite, le déclenchement et les résultats valides
sont inchangés. Aucune écriture `meal_tracking`, aucun insert, update, upsert,
delete, RPC, payload, invitation ou attribution coach n'a changé.
