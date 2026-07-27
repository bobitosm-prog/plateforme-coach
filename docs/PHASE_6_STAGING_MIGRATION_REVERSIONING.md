# Phase 6 — re-versioning immuable des migrations staging

## Verdict

Le re-versioning est déterministe et résout localement toutes les collisions :

- 142 sources historiques et 142 SHA-256 épinglés;
- 142 versions staging uniques;
- 73 fichiers re-versionnés dans 17 groupes;
- zéro source historique modifiée;
- zéro collision restante;
- ordre lexical historique strictement conservé;
- historique distant staging toujours vide;
- aucune migration ou donnée distante appliquée.

Le plan ne peut toutefois pas atteindre le dry-run Supabase : 53 migrations
exécutent des mutations de données non autorisées. Le garde s'arrête avant de
créer le workdir temporaire et avant d'appeler la CLI.

## Autorité et règle exacte

L'autorité versionnable est
`scripts/preproduction/staging-migration-manifest.json`. Elle est régénérée
par `scripts/preproduction/staging-migration-manifest.mjs` à partir des seules
sources `supabase/migrations/*.sql`.

Pour chaque fichier trié lexicalement :

1. une version historique unique reste inchangée;
2. une version date-only `YYYYMMDD` partagée devient
   `YYYYMMDD` + rang lexical one-based sur six chiffres;
3. le suffixe `_nom.sql` et le contenu sont inchangés;
4. aucun timestamp courant, aléa ou état distant n'intervient;
5. le manifeste fixe chemin source, version/nom historiques, SHA-256,
   version/nom staging, ordre absolu, groupe de collision, catégorie,
   dépendances connues, autorisation et inventaire des mutations.

Exemple : les trois fichiers `20260327_*`, triés lexicalement, deviennent
`20260327000001_*`, `20260327000002_*` et `20260327000003_*`.

Le materializer `scripts/preproduction/materialize-staging-migrations.mjs`
recalcule intégralement le manifeste et exige une égalité JSON exacte. Il
refuse source ajoutée/supprimée/modifiée, SHA différent, ordre différent,
collision, autorisation masquée, ref lié différent ou manifeste
d'environnement invalide. Si tous les contrôles devenaient verts, il copierait
les sources sous leurs noms staging dans un workdir temporaire hors Git,
activerait les migrations uniquement dans sa copie de `config.toml`, lancerait
uniquement `supabase db push --dry-run`, puis supprimerait toujours le workdir.

## Preuve d'ordre et collisions résolues

| Groupe | Fichiers | Re-versioning staging |
|---|---:|---|
| `20260318` | 2 | `messages` → `20260318000001`; `progress_photos_rls` → `20260318000002` |
| `20260320` | 2 | `coach_update_client_profiles` → `20260320000001`; `scheduled_sessions` → `20260320000002` |
| `20260327` | 3 | rangs `000001` à `000003` |
| `20260328` | 4 | rangs `000001` à `000004` |
| `20260329` | 4 | rangs `000001` à `000004` |
| `20260403` | 3 | rangs `000001` à `000003` |
| `20260404` | 3 | rangs `000001` à `000003` |
| `20260409` | 2 | rangs `000001` à `000002` |
| `20260412` | 2 | rangs `000001` à `000002` |
| `20260413` | 9 | rangs `000001` à `000009` |
| `20260415` | 9 | rangs `000001` à `000009` |
| `20260416` | 3 | rangs `000001` à `000003` |
| `20260419` | 16 | rangs `000001` à `000016` |
| `20260420` | 2 | rangs `000001` à `000002` |
| `20260421` | 2 | rangs `000001` à `000002` |
| `20260422` | 4 | rangs `000001` à `000004` |
| `20260612` | 3 | rangs `000001` à `000003` |

La liste exacte des 142 mappings et leur ordre absolu résident dans le
manifeste JSON. Les tests prouvent 142 noms triés strictement, 142 SHA valides,
73 versions changées, 17 groupes résolus et 142 versions uniques.

## Catalogue synthétique autorisé

`20260317010000_seed_exercises_catalog.sql` :

- SHA-256 :
  `e8fb102e03220fc263fa2f8900785e8d007c3de211122d69b0aa13cffb168a11`;
- ordre absolu : 2, après la baseline initiale;
- seule cible écrite : `public.exercises_db`;
- 178 identifiants UUID déterministes;
- aucun email, téléphone ou donnée utilisateur;
- insertion conditionnée par
  `WHERE NOT EXISTS (SELECT 1 FROM public.exercises_db)`;
- base vide : catalogue inséré puis contrôlé non vide;
- base non vide : aucune ligne ajoutée;
- replay : idempotent;
- dépendance explicite de plusieurs migrations d'exercices ultérieures.

Il est classé `reference_data_authorized`. Ce n'est pas le seed séparé de la
CLI et il ne déclenche aucune lecture ou écriture distante pendant ce chantier.

## Inventaire des mutations

L'analyse distingue les instructions exécutées pendant la migration de celles
présentes uniquement dans le corps d'une fonction/procédure :

- 71 fichiers contiennent au moins une instruction ou un appel potentiellement
  mutateur;
- 59 en exécutent au temps de migration;
- 12 ne les contiennent que dans une définition, donc sans mutation au replay;
- 1 des 59 est le catalogue autorisé;
- 5 sont des crons historiques autorisés seulement comme no-op tant que
  `pg_cron` est absent;
- 53 nécessitaient encore une décision opérateur à ce point de
  l'inventaire. Leur décision finale est consignée dans
  [`PHASE_6_STAGING_DATA_MUTATION_CLASSIFICATION.md`](PHASE_6_STAGING_DATA_MUTATION_CLASSIFICATION.md).

Les cinq migrations cron historiques sont
`20260506_chat_ai_messages.sql`,
`20260529120000_schedule_weekly_diagnostic_cron.sql`,
`20260529140000_update_weekly_diagnostic_cron_to_daily.sql`,
`20260531110137_schedule_training_regen_cron.sql` et
`20260613_streak_reminder.sql`. La première crée un job SQL interne de purge;
les quatre autres concernent les appels HTTP MoovX. Avec `pg_cron` distant
absent, leurs blocs conditionnels n'exécutent aucune création de job.

### Inventaire initial des 53 migrations soumises à décision

```text
20260327_subscription_fields.sql
20260327_trial_period.sql
20260328_recipes.sql
20260409_exercise_variants.sql
20260412_exercise_descriptions.sql
20260412_standardize_session_types.sql
20260413_exercise_video_developpe_couche.sql
20260413_exercise_video_developpe_incline.sql
20260413_exercise_video_developpe_militaire.sql
20260413_exercise_video_developpe_militaire_barre.sql
20260413_exercise_video_rowing_barre.sql
20260413_exercise_video_souleve_de_terre.sql
20260413_exercise_video_souleve_terre_roumain.sql
20260413_exercise_video_squat_barre.sql
20260413_exercise_video_tractions_pronation.sql
20260415_backfill_badge_id.sql
20260415_exercise_video_curl_barre_droit.sql
20260415_exercise_video_curl_halteres.sql
20260415_exercise_video_developpe_militaire_barre_debout.sql
20260415_gamification_badges.sql
20260415_gamification_fix_rls.sql
20260418_muscles_worked.sql
20260419_cleanup_empty_programs.sql
20260419_coach_clients_unique.sql
20260419_curl_halteres_v4.sql
20260419_dips_video_v4.sql
20260419_invited_by_coach.sql
20260419_militaire_video_v4.sql
20260419_rdl_video_v4.sql
20260419_souleve_video_v4.sql
20260419_squat_video_v4.sql
20260419_tractions_video_v4.sql
20260420_elevations_laterales_v4.sql
20260420_kettlebell_swing_v4.sql
20260421_arnold_press_video.sql
20260421_hip_thrust_video.sql
20260422_curl_concentre_video.sql
20260422_curl_halteres_alterne_video.sql
20260422_curl_marteau_video.sql
20260422_elevations_frontales_halteres_video.sql
20260518180000_add_missing_parent_exercises.sql
20260529213128_add_next_diagnostic_at_to_profiles.sql
20260530033322_backfill_next_diagnostic_at_orphans.sql
20260530034000_backfill_week_start_sunday_to_monday.sql
20260530044500_backfill_full_name_capitalize.sql
20260530145524_normalize_exercises_equipment.sql
20260530151940_add_profile_equipment.sql
20260531043341_complete_variant_group.sql
20260531104041_add_next_program_regen_at.sql
20260612_backfill_personal_records.sql
20260622120000_normalize_abdos_muscle_group.sql
20260701200000_dedup_exercises_db.sql
20260703110000_canonicalize_profiles_objective.sql
```

Chaque entrée du manifeste fournit les tables/appels, lignes et nombre
d'opérations détectées. Aucune décision n'est inférée depuis le nom du fichier.

## Dry-runs et état distant

Le dry-run opérateur re-versionné valide le manifeste puis retourne :

```text
migrationCount=142
shaCount=142
uniqueStagingVersionCount=142
reversionedMigrationCount=73
resolvedCollisionGroupCount=17
blockedMigrations=53
acceptableForSupabaseDryRun=false
workdirCreated=false
supabaseDryRunExecuted=false
```

Le dry-run Supabase re-versionné n'est pas exécuté : le même outil le bloque
avant le workdir, conformément à la règle « chaque migration de données doit
être explicitement autorisée ou refusée ». Exécuter directement la CLI
contournerait cette garde.

Après ce refus, `supabase migration list --linked` confirme encore 142 versions
locales et 0 version distante. Il n'existe donc aucune migration appliquée,
aucune écriture dans l'historique distant et aucune divergence créée.

## Prochaine autorisation

La [classification A–F](PHASE_6_STAGING_DATA_MUTATION_CLASSIFICATION.md) et
les preuves SQL autorisent A/B/C et les deux D individuelles. Le plan final
exclut cinq mutations, ajoute une projection schema-only, matérialise
138 fichiers et passe le dry-run Supabase. Cela n'autorise toujours ni
`db push` réel, ni `migration repair`, ni seed séparé, ni configuration cron.
