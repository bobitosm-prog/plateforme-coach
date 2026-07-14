# Matrices RLS automatisées — Phase 2

> État observé sur les 135 migrations locales au 14 juillet 2026. Les matrices ne modifient aucune policy. Elles utilisent uniquement Supabase local.

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

Le service-role sert uniquement à préparer et nettoyer la preuve PostgREST. Aucune assertion d'autorisation utilisateur ne l'utilise. Toute attente sécurisée échoue avec `RLS_MATRIX_FAILED [table/persona/opération]` et un code non nul.

## État des tables et policies

| Table | RLS | Policies effectives | Contrat observé |
|---|---|---|---|
| `profiles` | activée, non forcée | propre SELECT/INSERT/UPDATE; client lit le profil de son coach; coach lié UPDATE client | `auth.uid()` et sous-requêtes `coach_clients`; trigger invoker pour colonnes sensibles |
| `coach_clients` | activée, non forcée | deux extrémités SELECT; coach INSERT; client self-INSERT si cible avec rôle coach | aucune policy UPDATE/DELETE; `is_coach_role` SECURITY DEFINER impliqué |
| `coach_invitations` | activée et forcée | coach propriétaire SELECT/INSERT/revoke UPDATE | grants par colonnes; aucun grant anon; consommation uniquement via RPC SECURITY DEFINER authentifiée |
| `push_subscriptions` | activée, non forcée | propriétaire ALL, policy historique dupliquée | `user_id = auth.uid()` en USING et WITH CHECK |
| `payments` | activée, non forcée | client SELECT; coach ALL si `coach_id = auth.uid()` | aucun contrôle de relation active ni restriction service-only des écritures |

Les tables historiques possèdent encore des grants larges hérités du bootstrap; la RLS reste donc la barrière effective. `coach_invitations` est l'exception : grants par colonnes et RLS forcée.

## Matrice métier synthétique

Légende : A autorisé, R refusé, N/A non applicable, É écart connu détaillé plus bas.

| Persona | `profiles` | `coach_clients` | `coach_invitations` | `push_subscriptions` | `payments` |
|---|---|---|---|---|---|
| Anonyme | R toutes opérations | R | R, sans grant | R | R |
| Client propriétaire | A lecture propre et coach actif; R tiers/DELETE/autorité | A lecture de sa relation; R UPDATE/DELETE | R direct | A CRUD propre; R changement propriétaire | A lecture propre; R écritures |
| Second client étranger | R données du premier client | R relation étrangère | R | R souscription étrangère | R paiement étranger |
| Coach lié actif | É lecture profil client absente; UPDATE prévue mais trigger cassé | A lecture relation | A CRUD limité à création/consultation/révocation propre | N/A | A lecture des lignes portant son ID; É écritures |
| Coach étranger | R données et invitations du premier coach | R relation étrangère | R invitation étrangère | N/A | R lignes d'un autre coach |
| Client `invited` | A propre, R tiers | selon relation réelle | R direct, consommation RPC seulement | propre seulement | aucune élévation |
| Client `lifetime` | A propre, R tiers | selon relation réelle | R | propre seulement | aucune élévation |
| Admin par e-mail | profil client ordinaire | aucune élévation DB | aucune élévation DB | propre seulement | aucune élévation DB |

Le contrat admin `ADMIN_EMAIL` appartient aux routes serveur. Il ne crée ni rôle PostgreSQL ni valeur spéciale de `profiles.role`.

## Couverture automatisée

- 42 attentes sécurisées SQL directes couvrent visibilité, INSERT, UPDATE, DELETE, propriété, tiers et grants.
- 8 scénarios d'écarts connus restent visibles sous forme de `RLS_KNOWN_GAP`.
- 1 preuve PostgREST traverse Auth local → JWT → rôle `authenticated` → `auth.uid()` → policy.
- Relation active et relation inactive sont toutes deux préparées.
- Deux exécutions successives sont exigées afin de prouver rollback et nettoyage.

## Écarts constatés — aucune correction dans cette tranche

| Gravité | Scénario | Données ou intégrité concernées | Correction suivante |
|---|---|---|---|
| Critique | Un coach peut INSERT/UPDATE/DELETE des `payments` dès qu'il place son propre `coach_id`, même pour un client non lié | intégrité facturation, faux paiements, suppression | rendre les écritures service-role/RPC uniquement et conserver lecture coach explicitement justifiée |
| Haute | `guard_profile_sensitive_columns` référence `subscription_price`, colonne absente; même une modification sûre échoue | toutes les mises à jour de profil par `authenticated` | migration corrective dédiée et test de non-régression avant modification |
| Haute | Un coach lié ne peut pas SELECT le profil de son client, bien qu'une policy lui permette UPDATE | données client nécessaires au coaching; contrat produit incohérent | policy SELECT limitée aux relations actives |
| Haute | Un coach peut créer une relation vers n'importe quel client; un client peut se rattacher à n'importe quel vrai coach | relations non consenties, pollution dashboard | création uniquement par invitation/RPC vérifiée |
| Moyenne | Une relation inactive permet encore au client de lire le profil du coach | profil coach après fin de relation | ajouter `status = 'active'` aux sous-requêtes relationnelles |

Ces scénarios ne sont pas transformés en attentes normales. Ils émettent un avertissement à chaque exécution et resteront exploitables jusqu'à une tranche de correction explicitement autorisée.

## Fonctions privilégiées impliquées

- `is_coach_role(uuid)` intervient dans le self-insert `coach_clients` et masque la lecture de `profiles` nécessaire à la policy.
- `consume_coach_invitation(bytea)` est SECURITY DEFINER, authentifié, et réalise consommation, profil et relation atomiquement; les destinataires n'ont aucune lecture directe de la table.
- `claim_stripe_webhook_event` et `finalize_stripe_webhook_event` sont réservées au service-role; elles ne constituent pas une preuve RLS utilisateur sur `payments`.

## Limites

La première tranche ne couvre pas encore Training, Nutrition, Messaging, Realtime ni les autres tables de facturation. Le test SQL prouve PostgreSQL directement; la preuve PostgREST représentative confirme le câblage, sans dupliquer chaque cellule de la matrice sur HTTP.
