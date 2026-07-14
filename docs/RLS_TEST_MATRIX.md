# Matrices RLS automatisées — Phase 2

> État observé sur les 136 migrations locales au 14 juillet 2026. Les matrices utilisent uniquement Supabase local. La migration `20260714211500_harden_payments_rls.sql` corrige l'accès critique découvert par la première version de cette matrice.

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
| `coach_clients` | activée, non forcée | deux extrémités SELECT; coach INSERT; client self-INSERT si cible avec rôle coach | aucune policy UPDATE/DELETE; `is_coach_role` SECURITY DEFINER impliqué |
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
| Coach lié actif | É lecture profil client absente; UPDATE prévue mais trigger cassé | A lecture relation | A CRUD limité à création/consultation/révocation propre | N/A | A lecture des paiements du client lié; R toutes mutations |
| Coach étranger | R données et invitations du premier coach | R relation étrangère | R invitation étrangère | N/A | R lignes d'un autre coach |
| Client `invited` | A propre, R tiers | selon relation réelle | R direct, consommation RPC seulement | propre seulement | aucune élévation |
| Client `lifetime` | A propre, R tiers | selon relation réelle | R | propre seulement | aucune élévation |
| Admin par e-mail | profil client ordinaire | aucune élévation DB | aucune élévation DB | propre seulement | aucune élévation DB |

Le contrat admin `ADMIN_EMAIL` appartient aux routes serveur. Il ne crée ni rôle PostgreSQL ni valeur spéciale de `profiles.role`.

## Couverture automatisée

- 62 attentes sécurisées SQL directes couvrent visibilité, INSERT, UPDATE, DELETE, propriété, tiers, catalogue de policies et grants.
- 5 scénarios d'écarts connus restent visibles sous forme de `RLS_KNOWN_GAP`.
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

## Écarts constatés restant hors périmètre

| Gravité | Scénario | Données ou intégrité concernées | Correction suivante |
|---|---|---|---|
| Haute | `guard_profile_sensitive_columns` référence `subscription_price`, colonne absente; même une modification sûre échoue | toutes les mises à jour de profil par `authenticated` | migration corrective dédiée et test de non-régression avant modification |
| Haute | Un coach lié ne peut pas SELECT le profil de son client, bien qu'une policy lui permette UPDATE | données client nécessaires au coaching; contrat produit incohérent | policy SELECT limitée aux relations actives |
| Haute | Un coach peut créer une relation vers n'importe quel client; un client peut se rattacher à n'importe quel vrai coach | relations non consenties, pollution dashboard | création uniquement par invitation/RPC vérifiée |
| Moyenne | Une relation inactive permet encore au client de lire le profil du coach | profil coach après fin de relation | ajouter `status = 'active'` aux sous-requêtes relationnelles |

Ces cinq scénarios ne sont pas transformés en attentes normales. Ils émettent un avertissement à chaque exécution et resteront exploitables jusqu'à une tranche de correction explicitement autorisée. Les trois anciens avertissements critiques `payments` sont désormais des attentes bloquantes de refus.

## Fonctions privilégiées impliquées

- `is_coach_role(uuid)` intervient dans le self-insert `coach_clients` et masque la lecture de `profiles` nécessaire à la policy.
- `consume_coach_invitation(bytea)` est SECURITY DEFINER, authentifié, et réalise consommation, profil et relation atomiquement; les destinataires n'ont aucune lecture directe de la table.
- `claim_stripe_webhook_event` et `finalize_stripe_webhook_event` sont réservées au service-role; elles ne constituent pas une preuve RLS utilisateur sur `payments`.

## Limites

La première tranche ne couvre pas encore Training, Nutrition, Messaging, Realtime ni les autres tables de facturation. Le test SQL prouve PostgreSQL directement; la preuve PostgREST représentative confirme le câblage, sans dupliquer chaque cellule de la matrice sur HTTP.
