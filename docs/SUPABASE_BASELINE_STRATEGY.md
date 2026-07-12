# Stratégie de baseline Supabase

## Problème observé

Le dépôt ne contenait aucune création versionnée de `public.profiles`. La première
migration, `20260318_messages.sql`, créait pourtant deux clés étrangères vers
`profiles(id)`. Un PostgreSQL vide échouait donc immédiatement.

L'audit montre qu'il ne s'agit pas d'un objet isolé : plusieurs tables et données
initiales ont été créées hors de l'historique Git, probablement depuis le dashboard
Supabase, le SQL Editor ou un bootstrap non conservé.

## Chronologie factuelle

| Date/version | Fait observé |
|---|---|
| avant 2026-03-18 | Baseline non versionnée : `profiles` et plusieurs tables applicatives existent déjà implicitement. |
| 20260318 | `messages` référence `profiles`; une policy est ajoutée à `progress_photos`. |
| 20260320–20260325 | Policies/FK supposent `coach_clients`, `meal_tracking` et `profiles`; deux modèles incompatibles de `scheduled_sessions` commencent à coexister. |
| 20260327–20260412 | Des migrations altèrent `profiles`, `custom_foods`, `exercises_db` et utilisent `workout_sessions`/`client_programs`. |
| 20260415 | `backfill_badge_id` utilise `user_badges.badge_id` et `celebrated` avant leur ajout versionné; le “master RLS fix” crée tardivement plusieurs tables déjà utilisées. |
| 20260419 | Une policy utilise `daily_checkins` avant la migration qui crée cette table. |
| 20260521 | Une migration contient un délimiteur de fonction invalide `AS $ ... $;`. |
| 20260531 | La migration `complete_variant_group` exige un catalogue préexistant de 178 exercices; ce catalogue est désormais versionné avant les migrations incrémentales. |

La recherche Git (`-S 'CREATE TABLE profiles'`) ne trouve aucune définition
historique supprimée. Aucun dump de schéma, types Supabase générés ou snapshot de
production n'est versionné. Les documents confirmaient un catalogue de 178 exercices
sans en contenir le seed complet. Une lecture REST autorisée de la seule table
catalogue a fourni les 176 lignes canoniques actuelles; les deux doublons historiques
supprimés en juillet sont restaurés depuis les UUID et paires explicitement consignés
par la migration de déduplication.

## Dépendances antérieures à leur définition versionnée

| Migration | Objet dépendant | Colonnes attendues | Dépendance |
|---|---|---|---|
| `20260318_messages.sql` | `profiles` | `id` | deux FK |
| `20260318_progress_photos_rls.sql` | `progress_photos` | `user_id` | policies |
| `20260320_coach_update_client_profiles.sql` | `profiles`, `coach_clients` | `id`, `coach_id`, `client_id` | policy |
| `20260320_scheduled_sessions.sql` | `profiles` | `id` | FK |
| `20260325_meal_tracking_coach_rls.sql` | `meal_tracking`, `coach_clients` | `user_id`, `coach_id`, `client_id` | policies |
| `20260327_subscription_fields.sql` | `profiles`, `coach_clients` | abonnement et relation | ALTER/UPDATE |
| `20260328_barcode_column.sql` | `custom_foods` | `barcode`, `image_url` | ALTER |
| `20260409`–`20260413` | `exercises_db` | `name`, média, description, variantes | ALTER/UPDATE |
| `20260412_standardize_session_types.sql` | `scheduled_sessions`, `workout_sessions`, `client_programs`, `custom_programs` | modèles de programme/session | UPDATE |
| `20260415_backfill_badge_id.sql` | `user_badges` | `badge_id`, `badge_type`, `celebrated` | UPDATE |
| `20260419_coach_rls_read.sql` | `daily_checkins` | `user_id` | policy |
| `20260521205152_drop_insecure_meal_rls_policies.sql` | `meal_logs` | `user_id` | policy |
| `20260531043341_complete_variant_group.sql` | seed `exercises_db` | 178 lignes et UUID canoniques | UPDATE + assertion de données |

## Structure canonique de `profiles`

La baseline retient uniquement les colonnes démontrées par les migrations et les
usages applicatifs antérieurs : identité (`id`, `email`, `full_name`, `role`),
mesures/objectifs fitness, objectifs nutritionnels, onboarding, abonnement Stripe,
coordonnées et timestamps. Les colonnes ajoutées explicitement plus tard restent
la responsabilité de leurs migrations incrémentales.

`profiles.id` référence `auth.users(id)` avec suppression en cascade, conformément
au modèle Supabase et aux usages existants. RLS est activée dès la baseline ; les
policies restent définies par les migrations historiques.

## Stratégies comparées

| Stratégie | Base existante | Reset zéro | Maintenance | Divergence | Décision |
|---|---|---|---|---|---|
| A. Migration historique antérieure additive | sûre avec `CREATE TABLE IF NOT EXISTS`; version à marquer comme appliquée lors d'un futur déploiement contrôlé | oui pour la structure connue | faible | faible si la baseline reste canonique | retenue |
| B. Snapshot distinct nouvelles installations | aucun impact | nécessite un chemin d'exécution séparé | élevée | deux sources de vérité | rejetée |
| C. Rebase complet des anciennes migrations | risque élevé pour l'historique Supabase | oui | très élevée | élevée | rejetée |
| D. Compatibilité minimale pour `profiles` seulement | sûre mais incomplète | échoue plus loin | moyenne | masque les objets manquants | rejetée |
| E. `migration repair` distant | potentiellement sûr après audit distant | ne recrée pas le schéma absent | moyenne | inconnue sans accès distant | reportée, jamais automatique |

## Stratégie choisie

`20260317000000_initial_schema_baseline.sql` est une baseline historique additive.
Elle précède la première migration et définit le schéma réellement supposé par les
migrations précoces. Elle n'effectue aucun `DROP`, aucun renommage, aucun backfill et
aucune modification de données existantes. Le seed historique séparé
`20260317010000_seed_exercises_catalog.sql` ne s'exécute que lorsque
`exercises_db` est vide.

### Base vide

La baseline crée les objets initiaux, le seed restaure les 178 exercices avec leurs
UUID, équipements legacy et groupes de variantes, puis toutes les migrations
incrémentales sont exécutées dans leur ordre lexical. Le reset réel atteint et
valide désormais la dernière migration versionnée.

### Base existante

Les `CREATE TABLE IF NOT EXISTS` ne recréent ni ne remplacent une table existante et
n'altèrent aucune donnée. Toutefois, ajouter rétroactivement un timestamp à
l'historique Supabase ferait apparaître une version non appliquée. Le déploiement
futur devra donc :

1. comparer en lecture seule le schéma distant à cette baseline ;
2. sauvegarder la base ;
3. marquer la version baseline comme appliquée avec le mécanisme officiel Supabase
   uniquement si tous les objets existent et sont compatibles ;
4. sinon produire une migration corrective additive séparée ;
5. ne jamais lancer automatiquement `db push` avec cette version rétroactive.

Seuls le catalogue applicatif et les métadonnées OpenAPI nécessaires aux objets
historiques ont été lus; aucune donnée utilisateur ou financière n'a été exportée,
et aucun état distant n'a été muté. Une correspondance générale du schéma ou de
l'historique distant n'est donc pas revendiquée.

## Correction historique explicite

`20260521212741_fix_coach_clients_policy_with_security_definer.sql` utilisait un
délimiteur PostgreSQL invalide. La correction `AS $ ... $;` vers `AS $$ ... $$;` ne
change ni la fonction ni les droits. Elle permet seulement au fichier versionné
d'être parsé sur une nouvelle installation. Un environnement ayant déjà enregistré
cette migration ne la rejoue pas.

## Procédure de test locale

1. Démarrer un PostgreSQL temporaire sur loopback.
2. Créer une base jetable.
3. Définir uniquement les objets plateforme Supabase avec
   `tests/integration/supabase-platform-bootstrap.sql`.
4. Exécuter `tests/integration/reset-migrations.sh` avec une URL strictement locale.
5. Exécuter les assertions de baseline et les suites d'invitation.
6. Détruire la base et arrêter le cluster.

Le script refuse toute URL ne contenant ni `127.0.0.1` ni `localhost`.

## Rollback

- Avant déploiement distant : retirer la baseline et la correction syntaxique du
  lot; aucune base distante n'est affectée.
- Après marquage distant de la baseline : réparer uniquement l'état de l'historique
  de migrations selon la procédure Supabase documentée; ne jamais supprimer les
  tables créées, car elles peuvent contenir des données historiques.
- Sur une nouvelle base locale : détruire la base jetable et relancer le reset.

## Risques ouverts

- Le schéma distant et son historique de versions restent inconnus.
- Les deux modèles historiques de `scheduled_sessions` sont conservés sous forme de
  superset compatible; leur consolidation métier doit rester un chantier séparé.
- Le seed ne contient que les champs nécessaires aux migrations historiques; les
  enrichissements descriptifs restent la responsabilité des migrations suivantes.
- Toute adoption distante de la baseline rétroactive reste soumise à l'audit et à
  la procédure de marquage contrôlée décrits ci-dessus.

## Prochaine action technique

Migrer le parcours `/join` vers l'invitation vérifiée, conformément à la prochaine
tâche P0 de la Phase 1. La baseline rétroactive ne doit pas être déployée sans audit
de schéma et procédure de marquage contrôlée.
