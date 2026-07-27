# Phase 6 — classification des mutations de données staging

## Verdict

Les 53 migrations précédemment bloquées sont classées exhaustivement :

| Catégorie | Total | Décision proposée |
|---|---:|---|
| A — structure + backfill sûr | 6 | autoriser |
| B — compatibilité historique | 4 | autoriser comme no-op démontré sur base neuve |
| C — référence synthétique | 36 | autoriser |
| D — destructive, personnelle ou ambiguë | 6 | refuser par défaut; décision individuelle |
| E — inutile sur staging neuf | 1 | refuser/exclure |
| F — analyse insuffisante | 0 | aucune |

L'autorité exécutable est
`scripts/preproduction/staging-mutation-classification.mjs`. Pour chacune des
53 migrations, sa sortie JSON fournit le chemin, les versions historique et
staging, le SHA-256, l'ordre, les tables, opérations, prédicats `WHERE`, la
portée, les comportements base vide/peuplée, l'idempotence, les dépendances,
les signaux personnels, le risque et la nécessité staging. Toute modification
de catégorie est refusée fail-closed.

Commande locale de restitution du tableau complet :

```bash
node scripts/preproduction/staging-mutation-classification.mjs \
  --manifest scripts/preproduction/staging-migration-manifest.json
```

## Tableau complet des 53 décisions

Les versions staging et SHA-256 exacts restent épinglés dans le
[manifeste immuable](../scripts/preproduction/staging-migration-manifest.json);
la commande ci-dessus les joint à chaque ligne.

| Catégorie | Migration | Tables | Mutation | Base vide | Base peuplée | Décision |
|---|---|---|---|---|---|---|
| A | `20260327_subscription_fields.sql` | `profiles` | UPDATE/backfill Billing | colonnes créées, UPDATE no-op | clients coachés deviennent `invited/active` | autoriser |
| A | `20260327_trial_period.sql` | `profiles` | UPDATE/backfill trial | colonne créée, UPDATE no-op | essai dérivé de `created_at` si absent | autoriser |
| A | `20260418_muscles_worked.sql` | `workout_sessions` | UPDATE/backfill | colonne créée, UPDATE no-op | muscles dérivés du nom si absents | autoriser |
| A | `20260529213128_add_next_diagnostic_at_to_profiles.sql` | `profiles` | UPDATE/backfill | colonne/index créés, UPDATE no-op | planification des clients onboardés | autoriser |
| A | `20260530151940_add_profile_equipment.sql` | `profiles` | UPDATE/backfill + contraintes | colonnes/contraintes créées | NULL devient `gym`/tableau vide | autoriser |
| A | `20260531104041_add_next_program_regen_at.sql` | `profiles` | UPDATE/backfill | colonne créée, UPDATE no-op | échéance à `NOW()+14j` si absente | autoriser |
| B | `20260412_standardize_session_types.sql` | sessions/programmes | normalisation UPDATE/JSONB | no-op | réécrit l'historique Training | autoriser comme compatibilité |
| B | `20260415_backfill_badge_id.sql` | `user_badges` | UPDATE | no-op | copie `badge_type` vers `badge_id` si NULL | autoriser comme compatibilité |
| B | `20260612_backfill_personal_records.sql` | `personal_records` | UPSERT dérivé | no-op sans séances | calcule les records Training | autoriser comme compatibilité |
| B | `20260703110000_canonicalize_profiles_objective.sql` | `profiles` | normalisation UPDATE | no-op | canonise l'objectif Nutrition/fitness | autoriser comme compatibilité |
| C | `20260328_recipes.sql` | `recipes` | INSERT référence | insère 5 recettes publiques | `ON CONFLICT` protège les IDs | autoriser |
| C | `20260409_exercise_variants.sql` | `exercises_db` | 54 UPDATE référence | enrichit le catalogue | affectations déterministes par nom | autoriser |
| C | `20260412_exercise_descriptions.sql` | `exercises_db` | 72 UPDATE référence | enrichit le catalogue | seulement descriptions absentes | autoriser |
| C | `20260413_exercise_video_developpe_couche.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible nom/URL NULL | autoriser |
| C | `20260413_exercise_video_developpe_incline.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible nom/URL NULL | autoriser |
| C | `20260413_exercise_video_developpe_militaire.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible deux noms | autoriser |
| C | `20260413_exercise_video_developpe_militaire_barre.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260413_exercise_video_rowing_barre.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260413_exercise_video_souleve_de_terre.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260413_exercise_video_souleve_terre_roumain.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260413_exercise_video_squat_barre.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible noms connus | autoriser |
| C | `20260413_exercise_video_tractions_pronation.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260415_exercise_video_curl_barre_droit.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260415_exercise_video_curl_halteres.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260415_exercise_video_developpe_militaire_barre_debout.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260415_gamification_badges.sql` | `badges` | INSERT référence | crée et peuple les badges | `ON CONFLICT DO NOTHING` | autoriser |
| C | `20260415_gamification_fix_rls.sql` | `badges` | INSERT référence + RLS | RLS et badges établis | policy idempotente, badges protégés | autoriser |
| C | `20260419_curl_halteres_v4.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260419_dips_video_v4.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260419_militaire_video_v4.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260419_rdl_video_v4.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260419_souleve_video_v4.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260419_squat_video_v4.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible noms connus | autoriser |
| C | `20260419_tractions_video_v4.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260420_elevations_laterales_v4.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260420_kettlebell_swing_v4.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260421_arnold_press_video.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible nom `ILIKE` | autoriser |
| C | `20260421_hip_thrust_video.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible nom `ILIKE` | autoriser |
| C | `20260422_curl_concentre_video.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible nom `ILIKE` | autoriser |
| C | `20260422_curl_halteres_alterne_video.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible nom `ILIKE` | autoriser |
| C | `20260422_curl_marteau_video.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible nom `ILIKE` | autoriser |
| C | `20260422_elevations_frontales_halteres_video.sql` | `exercises_db` | UPDATE média | enrichit le catalogue | cible un nom | autoriser |
| C | `20260518180000_add_missing_parent_exercises.sql` | `exercises_db` | INSERT référence | ajoute 25 parents | `ON CONFLICT(name) DO NOTHING` | autoriser |
| C | `20260530145524_normalize_exercises_equipment.sql` | `exercises_db` | normalisation + contrainte | normalise le catalogue seedé | backup legacy, mapping déterministe | autoriser |
| C | `20260531043341_complete_variant_group.sql` | `exercises_db` | 23 UPDATE référence | complète le catalogue seedé | seulement `variant_group IS NULL` | autoriser |
| C | `20260622120000_normalize_abdos_muscle_group.sql` | `exercises_db` | normalisation UPDATE | normalise le catalogue | second passage no-op | autoriser |
| D | `20260419_cleanup_empty_programs.sql` | `custom_programs` | DELETE | no-op attendu | supprime des programmes utilisateur | refuser |
| D | `20260419_coach_clients_unique.sql` | `coach_clients` | DELETE + UNIQUE | DELETE no-op, contrainte nécessaire | supprime les doublons | autorisée individuellement après preuve rollback |
| D | `20260419_invited_by_coach.sql` | `coach_clients` | UPDATE ciblé | no-op attendu | cible un email personnel codé en dur | refuser |
| D | `20260530033322_backfill_next_diagnostic_at_orphans.sql` | `profiles` | UPDATE ciblé | no-op attendu | cible un UUID utilisateur codé en dur | refuser |
| D | `20260530034000_backfill_week_start_sunday_to_monday.sql` | `weekly_diagnostics` | DELETE + UPDATE | no-op attendu | UUID de diagnostic et données coaching | refuser |
| D | `20260701200000_dedup_exercises_db.sql` | `exercises_db` | UPDATE FK + DELETE | supprime deux doublons synthétiques | fusion irréversible | autorisée individuellement après preuve rollback |
| E | `20260530044500_backfill_full_name_capitalize.sql` | `profiles` | UPDATE nom | no-op | réécrit les noms historiques | exclure |

## Signaux personnels et sensibles

Aucun secret, identifiant Stripe, téléphone, blob ou URL
`app.moovx.ch`/`moovx.ch` n'est présent dans ces 53 mutations.

Signaux nécessitant attention :

- `20260419_invited_by_coach.sql` : email personnel codé en dur;
- `20260530033322_backfill_next_diagnostic_at_orphans.sql` : UUID utilisateur
  codé en dur et calendrier personnel;
- `20260530034000_backfill_week_start_sunday_to_monday.sql` : UUID de
  diagnostic et donnée coaching/santé;
- catégories B sur sessions, records et objectif : données personnelles
  potentielles, mais aucun identifiant réel codé en dur et no-op sur base
  staging vide avant seed.

## Plan strict

- catégories incluses parmi les 53 : A + C;
- migrations totales : 131;
- exclusions : 11;
- collisions : 0;
- ordre historique : conservé;
- SHA : conservés;
- dry-run Supabase : refusé avant workdir;
- schéma final probable : incomplet.

Exclusions exactes :

```text
20260412_standardize_session_types.sql
20260415_backfill_badge_id.sql
20260419_cleanup_empty_programs.sql
20260419_coach_clients_unique.sql
20260419_invited_by_coach.sql
20260530033322_backfill_next_diagnostic_at_orphans.sql
20260530034000_backfill_week_start_sunday_to_monday.sql
20260530044500_backfill_full_name_capitalize.sql
20260612_backfill_personal_records.sql
20260701200000_dedup_exercises_db.sql
20260703110000_canonicalize_profiles_objective.sql
```

## Plan compatibilité

- catégories incluses parmi les 53 : A + B + C;
- migrations totales : 135;
- exclusions : 7;
- collisions : 0;
- ordre historique : conservé;
- SHA : conservés;
- dry-run Supabase : refusé avant workdir;
- schéma final probable : incomplet.

Exclusions exactes :

```text
20260419_cleanup_empty_programs.sql
20260419_coach_clients_unique.sql
20260419_invited_by_coach.sql
20260530033322_backfill_next_diagnostic_at_orphans.sql
20260530034000_backfill_week_start_sunday_to_monday.sql
20260530044500_backfill_full_name_capitalize.sql
20260701200000_dedup_exercises_db.sql
```

Les deux anciens plans cassaient trois dépendances explicites :

1. absence de la contrainte `coach_clients_coach_client_unique`;
2. absence du contrat de prévention des doublons coach/client;
3. identité canonique ambiguë avant l'ajout de `exercise_id`.

L'audit a corrigé une hypothèse documentaire : aucune migration suivante ne
crée réellement un index case-insensitive. La migration suivante est
`20260701201000_add_exercise_id_to_workout_sets.sql`. La déduplication reste
nécessaire pour passer du catalogue historique synthétique 178 lignes au
catalogue canonique 176 lignes avant ce déploiement d'identité.

## Recommandation

La décision opérateur autorise A, B et C et refuse les cinq migrations
historiques listées ci-dessous. Les deux D individuelles sont désormais
autorisées après preuves SQL transactionnelles vertes :

- `coach_clients_unique` : table initiale vide, `DELETE 0`, contrainte créée,
  deux relations distinctes acceptées, doublon refusé, second replay sans
  suppression;
- `dedup_exercises_db` : 178 références synthétiques, deux groupes de doublons,
  deux suppressions, deux FK réassignées, 176 lignes finales, zéro FK pendante
  et index hypothétique `lower(name)` applicable.

## Plan staging final

- sources historiques incluses : 137;
- projection staging schema-only : 1;
- total matérialisé : 138;
- exclusions historiques : 5;
- versions uniques : 138;
- collisions : 0;
- ordre : conservé;
- schéma final : complet;
- empreinte de la liste opérateur :
  `030a1e34757b7c069448d40ff6643e6770e57b58154e92a73bb6db7044b22535`.

Exclusions exactes :

```text
20260419_cleanup_empty_programs.sql
20260419_invited_by_coach.sql
20260530033322_backfill_next_diagnostic_at_orphans.sql
20260530034000_backfill_week_start_sunday_to_monday.sql
20260530044500_backfill_full_name_capitalize.sql
```

`20260419_invited_by_coach.sql` mélange DDL requis et UPDATE vers un email
personnel. Il est exclu et remplacé au même emplacement lexical par
`20260419000010_invited_by_coach_schema_only.sql`, SHA-256
`5ac371ef59391920d8f5107638a3b7352d45dd66253850f2f25c6b895b8b9b46`.
Cette projection ajoute uniquement la colonne et ne contient aucun UPDATE.

Le materializer a créé 138 fichiers dans un workdir temporaire, vérifié leurs
SHA et leur ordre, exécuté `supabase db push --dry-run` avec succès, puis
supprimé le workdir. Aucune migration n'a été appliquée.
