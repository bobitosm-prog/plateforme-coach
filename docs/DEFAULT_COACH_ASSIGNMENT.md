# Attribution du coach par défaut

L’attribution automatique est distincte de l’[invitation vérifiée](./COACH_INVITATION_CONTRACT.md) : elle crée uniquement une relation `coach_clients` et ne modifie jamais l’abonnement.

## Autorité

- le client provient exclusivement de la session lue par `auth.getUser()` dans `POST /api/coach/default-assignment` ;
- le coach provient exclusivement de `DEFAULT_COACH_EMAIL`, variable serveur non préfixée `NEXT_PUBLIC_` ;
- le body doit être vide ou `{}` et ne peut fournir ni `clientId`, ni `coachId`, ni rôle, ni abonnement ;
- l’e-mail configuré doit résoudre exactement un profil dont le rôle est `coach`, sinon la route échoue fermée ;
- la clé service-role n’est créée et utilisée que dans la route serveur.

## Atomicité et idempotence

La RPC `assign_default_coach(uuid, uuid)` est exécutable uniquement par `service_role`. Elle sérialise les demandes par client, valide les deux rôles et refuse de remplacer ou réactiver une relation existante. Deux appels identiques renvoient donc la relation initiale sans seconde insertion. L’index partiel `coach_clients_one_active_per_client_idx` interdit plusieurs relations actives, y compris entre producteurs concurrents.

Le chemin navigateur commence par lire une relation active. En son absence, il appelle la route sans body. Il n’exécute plus `get_default_coach_id`, `is_coach_role` ni aucune mutation directe de `coach_clients`.

## Déploiement et rollback vers l’avant

Définir `DEFAULT_COACH_EMAIL` sur l’adresse normalisée du profil coach voulu. Une configuration absente, ambiguë ou pointant vers un client renvoie `503` sans mutation. Le rollback consiste à livrer une migration ultérieure et une nouvelle route bornée ; les anciennes policies d’INSERT et les helpers publics ne doivent pas être restaurés.
