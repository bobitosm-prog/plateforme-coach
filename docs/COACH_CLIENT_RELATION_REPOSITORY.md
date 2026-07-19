# Repository des relations coach/client

## Périmètre

`createCoachClientRelationRepository(client)` centralise les lectures de
`coach_clients` nécessaires aux dashboards coach/client et expose la projection
relationnelle sûre `active_related_profiles`. Le client Supabase est injecté :
le repository ne crée aucune session, ne détient aucun `service_role` et ne
transforme jamais un identifiant fourni en preuve d'autorité.

La RLS du client injecté reste l'autorité. Avec un client de session, une ligne
étrangère est invisible et produit le même résultat `not_found` qu'une absence.
Avec un client privilégié, l'appelant serveur doit avoir authentifié puis
autorisé l'opération avant d'appeler le repository.

## Projection et méthodes

La projection relationnelle canonique est limitée à `id`, `coach_id`,
`client_id`, `status`, `created_at` et `invited_by_coach`. Les méthodes sont
read-only :

| Méthode | Portée | Résultat |
|---|---|---|
| `findRelationByPair` | paire coach/client | `active`, `inactive` ou `not_found` |
| `findActiveBetween` | paire active exacte | relation, absence ou conflit |
| `hasActiveRelation` | paire active exacte | booléen, sans masquer une panne |
| `findActiveCoachForClient` | client | relation active unique ou conflit fail-closed |
| `listActiveClientsForCoach` | coach | liste ordonnée et bornée à 100 |
| `listActiveRelatedProfiles` | IDs déjà obtenus par relation | projection de profils soumise à la vue et à la RLS |

Les listes de relations sont ordonnées par `created_at`, puis `id` pour rendre
les égalités déterministes. La vue de profils expose les champs de présentation
et de suivi déjà utilisés par le dashboard, mais aucun rôle, champ Stripe,
statut d'abonnement autoritaire, essai ou donnée interne de planification.

## États, conflits et erreurs

Le repository utilise `RepositoryResult<T>` :

- `ok` porte une relation, une liste ou un état explicite ;
- `not_found` couvre l'absence et l'invisibilité RLS sans permettre
  l'énumération ;
- `failure` ne conserve qu'une catégorie et un code borné ; aucun message SQL,
  payload, e-mail ou token n'est propagé ;
- plus d'une relation active visible pour un client produit
  `failure/conflict` avec `MULTIPLE_ACTIVE`, même si l'index SQL
  `coach_clients_one_active_per_client_idx` doit déjà empêcher cet état.

Un statut différent de `active` n'est jamais promu silencieusement. La méthode
de paire générale le restitue comme `inactive`; les méthodes actives répondent
par absence.

## Consommateurs migrés

- liste et projection des clients dans `useCoachDashboard` ;
- liste et projection des clients dans `useCoachAnalytics` ;
- résolution du coach actif dans le dashboard client ;
- contrôle de relation avant lecture d'un plan Nutrition assigné.

Le dashboard client ne lance l'affectation du coach par défaut qu'après une
absence confirmée. Une panne ou un conflit arrête la résolution, ce qui évite
qu'une erreur de lecture soit interprétée comme une autorisation de mutation.

## Limites et coexistence legacy

Les mutations restent volontairement hors du repository : acceptation
d'invitation, affectation du coach par défaut et déconnexion conservent leurs
frontières serveur/RPC existantes. Les lecteurs spécialisés Billing conservent
leurs ports internes afin de ne pas modifier leurs contrats Stripe dans cette
tranche.

Six lectures applicatives restent à migrer séparément : autorisation push,
permissions client, onboarding, feedback vidéo et les deux lecteurs Billing.
Le feedback vidéo et les permissions historiques ne filtrent pas tous encore
le statut `active`; les déplacer sans décision changerait leur comportement.
La route de déconnexion est une mutation et n'est pas comptée comme lecteur.

## Sécurité locale vérifiée

Les policies `coach_clients_read` limitent la lecture aux deux extrémités de la
relation. Les rôles navigateur n'ont plus de privilège direct
`INSERT/UPDATE/DELETE`. `active_related_profiles` exige une relation active et
exclut les champs d'autorité. Ces garanties restent testées par la
[matrice RLS](RLS_TEST_MATRIX.md) et le
[harness coach/client](E2E_COACH_CLIENT_HARNESS.md).
