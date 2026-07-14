# Matrices RLS automatisées — Phase 2

> État observé sur les 138 migrations locales au 14 juillet 2026. Les matrices utilisent uniquement Supabase local. Trois migrations additives corrigent désormais les accès critiques révélés par la matrice : `payments`, `coach_clients` et le garde des colonnes sensibles de `profiles`.

## Exécution et frontières

```bash
npm run supabase:local:reset
npm run test:integration:rls
```

La commande `test:integration:rls` réutilise le contrat `ensure` du reset canonique, puis :

1. prépare les sept [personas partagés](./TEST_FIXTURES.md) avec le propriétaire PostgreSQL local ;
2. exécute `tests/integration/rls-matrix.sql` sous les vrais rôles `anon` et `authenticated`, avec `request.jwt.claim.sub` contrôlé ;
3. annule toutes les données SQL par `ROLLBACK` ;
4. crée un compte Auth synthétique local, obtient un JWT utilisateur et vérifie `profiles SELECT own` via PostgREST ;
5. supprime le compte et le profil de vérification en `finally`.

Le service-role sert à préparer et nettoyer la preuve PostgREST, et trois assertions SQL vérifient séparément que les écritures serveur légitimes restent possibles. Aucune assertion d'autorisation utilisateur ne l'utilise. Toute attente sécurisée échoue avec `RLS_MATRIX_FAILED [table/persona/opération]` et un code non nul.

## État des tables et policies

| Table | RLS | Policies effectives | Contrat observé |
|---|---|---|---|
| `profiles` | activée, non forcée | propre SELECT/INSERT/UPDATE; client lit le profil de son coach; coach lié UPDATE client | `auth.uid()` et sous-requêtes `coach_clients`; trigger invoker pour colonnes sensibles |
| `coach_clients` | activée, non forcée | deux extrémités SELECT uniquement | aucun grant de mutation `authenticated`; invitation via RPC authentifiée et attribution par défaut via RPC service-role |
| `coach_invitations` | activée et forcée | coach propriétaire SELECT/INSERT/revoke UPDATE | grants par colonnes; aucun grant anon; consommation uniquement via RPC SECURITY DEFINER authentifiée |
| `push_subscriptions` | activée, non forcée | propriétaire ALL, policy historique dupliquée | `user_id = auth.uid()` en USING et WITH CHECK |
| `payments` | activée, non forcée | client propriétaire SELECT; coach SELECT avec relation active | aucune policy de mutation; aucun grant de mutation à `authenticated`; écritures service-role/RPC serveur uniquement |

Les tables historiques possèdent encore des grants larges hérités du bootstrap; la RLS reste donc la barrière effective. `coach_invitations` est l'exception : grants par colonnes et RLS forcée.

## Matrice métier synthétique

Légende : A autorisé, R refusé, N/A non applicable, É écart connu détaillé plus bas.

| Persona | `profiles` | `coach_clients` | `coach_invitations` | `push_subscriptions` | `payments` |
|---|---|---|---|---|---|
| Anonyme | R toutes opérations | R | R, sans grant | R | R |
| Client propriétaire | A lecture propre et coach actif; R tiers/DELETE/autorité | A lecture de sa relation; R UPDATE/DELETE | R direct | A CRUD propre; R changement propriétaire | A lecture propre; R écritures |
| Second client étranger | R données du premier client | R relation étrangère | R | R souscription étrangère | R paiement étranger |
| Coach lié actif | É lecture profil client absente; UPDATE des champs normaux seulement | A lecture relation; R mutations directes | A CRUD limité à création/consultation/révocation propre | N/A | A lecture des paiements du client lié; R toutes mutations |
| Coach étranger | R données et invitations du premier coach | R relation étrangère | R invitation étrangère | N/A | R lignes d'un autre coach |
| Client `invited` | A propre, R tiers | selon relation réelle | R direct, consommation RPC seulement | propre seulement | aucune élévation |
| Client `lifetime` | A propre, R tiers | selon relation réelle | R | propre seulement | aucune élévation |
| Admin par e-mail | profil client ordinaire | aucune élévation DB | aucune élévation DB | propre seulement | aucune élévation DB |

Le contrat admin `ADMIN_EMAIL` appartient aux routes serveur. Il ne crée ni rôle PostgreSQL ni valeur spéciale de `profiles.role`.

## Couverture automatisée

- Les attentes sécurisées SQL directes couvrent visibilité, INSERT, UPDATE, DELETE, propriété, tiers, catalogue de policies et grants.
- 2 scénarios d'écarts connus restent visibles sous forme de `RLS_KNOWN_GAP`.
- 1 preuve PostgREST traverse Auth local → JWT → rôle `authenticated` → `auth.uid()` → lecture client, refus d'écriture, lecture coach active puis refus coach inactif.
- Relation active et relation inactive sont toutes deux préparées.
- Deux exécutions successives sont exigées afin de prouver rollback et nettoyage.

## Correction de sécurité `payments`

Avant la migration, la policy permissive `payments_coach_all` autorisait un coach à insérer n'importe quelle ligne portant son `coach_id`, puis à la modifier ou la supprimer. Elle ne vérifiait ni relation coach/client, ni statut actif, et les grants historiques donnaient INSERT, UPDATE et DELETE à `authenticated`.

Le contrat appliqué est désormais :

- `payments_client_select_own` limite un client à `client_id = auth.uid()` ;
- `payments_coach_select_active_clients` exige `coach_id = auth.uid()` et une ligne `coach_clients` correspondante avec `status = 'active'` ;
- aucune policy INSERT, UPDATE ou DELETE n'existe pour un utilisateur ;
- `anon` n'a aucun privilège sur la table et `authenticated` conserve uniquement SELECT ;
- checkout plateforme, webhook Stripe et administration continuent d'utiliser la service-role ;
- la suppression de compte continue d'utiliser sa fonction serveur privilégiée existante ;
- l'e-mail admin n'est pas interprété par PostgreSQL : l'autorité reste vérifiée par la route serveur, puis la lecture utilise la service-role.

La migration est compatible avec les producteurs recensés, car aucun producteur légitime n'écrit avec un JWT utilisateur. Le rollback est uniquement vers l'avant : si une écriture authentifiée légitime apparaît, une migration ultérieure devra ajouter une RPC ou une policy bornée après définition de son autorité. La policy `payments_coach_all` ne doit pas être restaurée.

## Correction de sécurité `coach_clients`

Avant la migration, un coach pouvait insérer une relation vers n’importe quel client et un client pouvait s’attacher à n’importe quel profil coach grâce à `coach_clients_manage`, `coach_clients_self_insert_safe`, `is_coach_role(uuid)` et `get_default_coach_id(text)`.

Le contrat appliqué est désormais :

- aucune policy de mutation et aucun grant INSERT/UPDATE/DELETE pour `authenticated` ;
- client, coach, invited, lifetime et admin e-mail ne peuvent muter directement la table ;
- `consume_coach_invitation(bytea)` reste la seule mutation issue d’un utilisateur authentifié, avec identités tirées de l’invitation et de `auth.uid()` ;
- l’[attribution par défaut](./DEFAULT_COACH_ASSIGNMENT.md) utilise une route sans autorité dans le body et la RPC service-role `assign_default_coach(uuid, uuid)` ;
- l’index partiel garantit au plus une relation active par client ;
- les helpers navigateur privilégiés ont été supprimés.

## Correction du garde `profiles`

La fonction historique référençait statiquement `NEW.subscription_price` alors que cette colonne n’existe dans aucune migration canonique. PostgreSQL ne résolvait cette référence qu’au premier UPDATE, ce qui faisait échouer même `full_name`, `phone` ou `calorie_goal`. Les usages restants de `subscription_price` sont des lecteurs historiques d’administration et de dashboard; ils ne justifient pas de créer une colonne sans modèle métier ni producteur canonique. Une ancienne base peut néanmoins encore la contenir.

La migration `20260714233000_fix_profile_sensitive_columns_guard.sql` compare `to_jsonb(NEW)` et `to_jsonb(OLD)` sur une liste explicite. Le contrat est :

- champs utilisateur normaux autorisés sous les policies existantes ;
- `role`, `status`, `subscription_type`, `subscription_status`, `subscription_end_date`, `trial_ends_at`, `beta_campaign_id` et les références `stripe_customer_id`, `stripe_subscription_id`, `stripe_account_id` refusés à `authenticated` et `anon` ;
- `subscription_price` et `stripe_onboarding_complete` restent protégés si ces clés existent sur une ancienne base, sans être ajoutés au schéma canonique ;
- le SQLSTATE `42501` et le message `Colonne protégée non modifiable: <colonne>` restent stables ;
- PostgreSQL, `service_role` et les RPC `SECURITY DEFINER` contrôlées conservent leur bypass.

Les producteurs privilégiés confirmés sont les webhooks et routes Stripe utilisant la service-role, les routes admin après contrôle `ADMIN_EMAIL`, ainsi que `set_role`, `set_initial_trial`, `claim_beta_slot` et `consume_coach_invitation`. La matrice vérifie une mise à jour normale, chaque autorité sensible, une mutation mixte atomiquement refusée, une table de compatibilité contenant `subscription_price`, le bypass service-role et la RPC d’essai.

## Écarts constatés restant hors périmètre

| Gravité | Scénario | Données ou intégrité concernées | Correction suivante |
|---|---|---|---|
| Haute | Un coach lié ne peut pas SELECT le profil de son client, bien qu'une policy lui permette UPDATE | données client nécessaires au coaching; contrat produit incohérent | policy SELECT limitée aux relations actives |
| Moyenne | Une relation inactive permet encore au client de lire le profil du coach | profil coach après fin de relation | ajouter `status = 'active'` aux sous-requêtes relationnelles |

Ces deux scénarios ne sont pas transformés en attentes normales. Ils émettent un avertissement à chaque exécution. Le défaut du garde `profiles` est désormais couvert par des attentes bloquantes.

## Fonctions privilégiées impliquées

- `consume_coach_invitation(bytea)` est SECURITY DEFINER, authentifié, et réalise consommation, profil et relation atomiquement; les destinataires n'ont aucune lecture directe de la table.
- `assign_default_coach(uuid, uuid)` est SECURITY DEFINER, exécutable uniquement par `service_role`, sérialisée et sans mutation d’abonnement.
- `claim_stripe_webhook_event` et `finalize_stripe_webhook_event` sont réservées au service-role; elles ne constituent pas une preuve RLS utilisateur sur `payments`.

## Limites

La première tranche ne couvre pas encore Training, Nutrition, Messaging, Realtime ni les autres tables de facturation. Le test SQL prouve PostgreSQL directement; la preuve PostgREST représentative confirme le câblage, sans dupliquer chaque cellule de la matrice sur HTTP.
