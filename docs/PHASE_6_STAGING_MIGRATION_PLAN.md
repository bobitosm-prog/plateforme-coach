# Phase 6 — plan de migrations staging

## Verdict

La comparaison initiale a établi que les dry-runs Supabase CLI et opérateur
proposaient le même ensemble de 142 fichiers, dans le même ordre lexical. Le
[manifeste immuable](PHASE_6_STAGING_MIGRATION_REVERSIONING.md) donne désormais
une version staging unique aux 73 fichiers des 17 groupes en collision, sans
modifier les 142 sources, et le catalogue d'exercices est explicitement
autorisé.

Le [plan final](PHASE_6_STAGING_DATA_MUTATION_CLASSIFICATION.md) est désormais
apte au dry-run : 137 sources historiques, une projection schema-only, cinq
exclusions, 138 versions uniques et zéro collision. Le dry-run Supabase est
vert et le workdir a été supprimé. Le plan n'est toujours **pas autorisé à
l'application** : aucun `db push` réel, `repair` ou seed distant n'est permis.

## Preuves read-only

La cible liée est `cycbnnojcymjnaqomlyj`; le ref production
`njlzossopgknanhkzcbk` est refusé par le garde. `supabase migration list
--linked` retourne 142 entrées locales et un champ `remote` vide pour chacune :
0 version distante, 0 nom distant, 0 doublon distant et 0 migration distante
sans équivalent local.

Le workdir `/tmp/moovx-phase6-supabase-workdir` reproduisait
`supabase/config.toml`, les 142 migrations et les métadonnées de lien sans
secret. Seule sa copie de `[db.migrations].enabled` passait à `true`. Le
dry-run officiel via `--workdir` et le runner opérateur donnent :

| Contrôle | Supabase CLI | Runner opérateur |
|---|---:|---:|
| migrations proposées | 142 | 142 |
| différence d'ensemble | 0 | 0 |
| différence d'ordre | 0 | 0 |
| déjà appliquées | 0 | 0 |
| seed séparé | exclu | exclu |
| rôles | exclus | exclus |
| jobs cron créés | 0 | 0 |

## Cause de `migrations.enabled=false`

Le réglage a été introduit avec `supabase/config.toml` au commit `d3e8a33`.
Son commentaire indique explicitement que les fichiers historiques partagent
des préfixes date-only et que le reset local les applique un par un dans
l'ordre lexical sans changer leur identité. Le réglage appartient à la
configuration CLI globale du dépôt; il n'est pas spécifique à staging.

Le passer durablement à `true` ferait réapparaître dans toutes les commandes
CLI les collisions historiques ci-dessous. Le dry-run les liste mais ne
démontre pas qu'une application pourrait enregistrer plusieurs fichiers sous
une même version logique. La configuration versionnée reste donc inchangée.

## Classification A/B/C/D/E avant re-versioning

| Classe | Nombre | Décision |
|---|---:|---|
| A — déjà appliquée à distance | 0 | historique distant vide |
| B — à appliquer | 68 | version logique unique, sous réserve de résoudre tous les E avant une application globale |
| C — locale volontairement exclue | 0 | aucune exclusion silencieuse dans les deux plans |
| D — distante uniquement | 0 | aucune version distante |
| E — collision ou ambiguïté bloquante | 74 | 73 fichiers en collision et 1 migration de données de référence non autorisée |

### B — versions uniques à appliquer

```text
20260317000000_initial_schema_baseline.sql
20260321_push_subscriptions.sql
20260325_meal_tracking_coach_rls.sql
20260411_exercise_info_columns.sql
20260417_photo_adjustments.sql
20260418_muscles_worked.sql
20260424_add_completed_sessions.sql
20260426_add_training_program_id_to_client_programs.sql
20260429_add_tags_to_training_programs.sql
20260506_chat_ai_messages.sql
20260517120000_stripe_webhook_dedup.sql
20260517140000_ai_usage_logs_rate_limiting.sql
20260517160000_add_preferred_locale_to_profiles.sql
20260518180000_add_missing_parent_exercises.sql
20260521203522_drop_insecure_rls_policies.sql
20260521205152_drop_insecure_meal_rls_policies.sql
20260521210640_fix_insert_libre_logs.sql
20260521211443_harden_coach_clients_self_insert.sql
20260521212741_fix_coach_clients_policy_with_security_definer.sql
20260522050836_add_get_default_coach_id_helper.sql
20260522090303_add_delete_user_account_rpc.sql
20260522130925_add_workout_summary_rpc.sql
20260525094500_add_exercise_i18n_columns.sql
20260527202908_allow_clients_read_coach_profiles.sql
20260529054735_create_weekly_diagnostics_table.sql
20260529120000_schedule_weekly_diagnostic_cron.sql
20260529140000_update_weekly_diagnostic_cron_to_daily.sql
20260529213128_add_next_diagnostic_at_to_profiles.sql
20260530033322_backfill_next_diagnostic_at_orphans.sql
20260530034000_backfill_week_start_sunday_to_monday.sql
20260530044500_backfill_full_name_capitalize.sql
20260530145524_normalize_exercises_equipment.sql
20260530151940_add_profile_equipment.sql
20260531043341_complete_variant_group.sql
20260531075113_add_needs_initial_generation.sql
20260531104041_add_next_program_regen_at.sql
20260531110137_schedule_training_regen_cron.sql
20260602_create_coach_appointments.sql
20260605141613_fix_profiles_training_location_default.sql
20260613_streak_reminder.sql
20260617120000_guard_profile_sensitive_columns.sql
20260617120100_drop_duplicate_profiles_update_policy.sql
20260617130000_beta_campaigns_public_read.sql
20260622120000_normalize_abdos_muscle_group.sql
20260622130000_add_rir_workout_sets.sql
20260622140000_add_rir_preferences_profiles.sql
20260630100000_set_initial_trial_rpc.sql
20260630101000_set_role_rpc.sql
20260630102000_add_coach_columns.sql
20260630103000_fix_coach_column_types.sql
20260630104000_handle_new_user_role_from_metadata.sql
20260701200000_dedup_exercises_db.sql
20260701201000_add_exercise_id_to_workout_sets.sql
20260703110000_canonicalize_profiles_objective.sql
20260703170000_lock_objective_drop_goal.sql
20260704140000_beta_campaign_link.sql
20260706100000_delete_account_weekly_diagnostics.sql
20260708100000_commissions_rls.sql
20260711190500_add_coach_invitations.sql
20260712143000_harden_stripe_webhook_claims.sql
20260712190000_add_coach_monthly_rate.sql
20260714211500_harden_payments_rls.sql
20260714224500_harden_coach_clients_writes.sql
20260714233000_fix_profile_sensitive_columns_guard.sql
20260715001000_secure_related_profile_visibility.sql
20260719160000_secure_messages.sql
20260720190000_atomic_ai_usage.sql
20260725190000_configure_environment_scoped_cron.sql
```

### E — collisions de version

| Version | Fichiers |
|---|---|
| `20260318` | `20260318_messages.sql`, `20260318_progress_photos_rls.sql` |
| `20260320` | `20260320_coach_update_client_profiles.sql`, `20260320_scheduled_sessions.sql` |
| `20260327` | `20260327_bug_reports_and_logs.sql`, `20260327_subscription_fields.sql`, `20260327_trial_period.sql` |
| `20260328` | `20260328_barcode_column.sql`, `20260328_recipes.sql`, `20260328_user_badges.sql`, `20260328_water_intake.sql` |
| `20260329` | `20260329_cardio.sql`, `20260329_personal_records.sql`, `20260329_scan_history.sql`, `20260329_scheduled_sessions.sql` |
| `20260403` | `20260403_fitness_onboarding.sql`, `20260403_onboarding_photo.sql`, `20260403_progress_photos_ai.sql` |
| `20260404` | `20260404_body_assessments.sql`, `20260404_community_foods.sql`, `20260404_custom_programs.sql` |
| `20260409` | `20260409_exercise_instructions.sql`, `20260409_exercise_variants.sql` |
| `20260412` | `20260412_exercise_descriptions.sql`, `20260412_standardize_session_types.sql` |
| `20260413` | `20260413_exercise_video_developpe_couche.sql`, `20260413_exercise_video_developpe_incline.sql`, `20260413_exercise_video_developpe_militaire.sql`, `20260413_exercise_video_developpe_militaire_barre.sql`, `20260413_exercise_video_rowing_barre.sql`, `20260413_exercise_video_souleve_de_terre.sql`, `20260413_exercise_video_souleve_terre_roumain.sql`, `20260413_exercise_video_squat_barre.sql`, `20260413_exercise_video_tractions_pronation.sql` |
| `20260415` | `20260415_backfill_badge_id.sql`, `20260415_body_analyses.sql`, `20260415_exercise_video_curl_barre_droit.sql`, `20260415_exercise_video_curl_halteres.sql`, `20260415_exercise_video_developpe_militaire_barre_debout.sql`, `20260415_gamification_badges.sql`, `20260415_gamification_fix_rls.sql`, `20260415_master_rls_fix.sql`, `20260415_user_badges_celebrated.sql` |
| `20260416` | `20260416_ai_usage_log.sql`, `20260416_periodization_columns.sql`, `20260416_program_scheduling.sql` |
| `20260419` | `20260419_cleanup_empty_programs.sql`, `20260419_coach_clients_unique.sql`, `20260419_coach_meal_plans_rls.sql`, `20260419_coach_rls_read.sql`, `20260419_coach_rls_write.sql`, `20260419_curl_halteres_v4.sql`, `20260419_custom_programs_coach_rls.sql`, `20260419_daily_checkins.sql`, `20260419_dips_video_v4.sql`, `20260419_invited_by_coach.sql`, `20260419_messages_coach_rls.sql`, `20260419_militaire_video_v4.sql`, `20260419_rdl_video_v4.sql`, `20260419_souleve_video_v4.sql`, `20260419_squat_video_v4.sql`, `20260419_tractions_video_v4.sql` |
| `20260420` | `20260420_elevations_laterales_v4.sql`, `20260420_kettlebell_swing_v4.sql` |
| `20260421` | `20260421_arnold_press_video.sql`, `20260421_hip_thrust_video.sql` |
| `20260422` | `20260422_curl_concentre_video.sql`, `20260422_curl_halteres_alterne_video.sql`, `20260422_curl_marteau_video.sql`, `20260422_elevations_frontales_halteres_video.sql` |
| `20260612` | `20260612_add_unit_personal_records.sql`, `20260612_backfill_personal_records.sql`, `20260612_user_badges_badge_type_nullable.sql` |

Les 73 fichiers de ces groupes sont E. Le runner expose leur liste complète
et leurs SHA-256; aucune collision de nom de fichier exact n'existe.

### Données de référence désormais autorisées

`20260317010000_seed_exercises_catalog.sql` contient un `INSERT INTO
public.exercises_db` portant le catalogue canonique historique. Il ne contient
aucune donnée utilisateur et évite de modifier un catalogue déjà non vide,
et son insertion est idempotente. La décision opérateur le requalifie en
donnée synthétique canonique staging autorisée. L'exclure isolément rendrait
incohérentes les migrations d'exercices ultérieures.

## Cron et références production

Le schéma distant `cron` est absent. Les quatre migrations historiques
deviennent donc des no-op pour leurs blocs cron. La migration
`20260725190000_configure_environment_scoped_cron.sql` est la dernière du plan
et ne crée aucun job lors de son application.

Les six références production restantes sont celles épinglées par SHA-256 :
cinq occurrences historiques et la branche production explicite de la
migration corrective. Elles n'apparaissent pas comme URL effective dans les
sorties des dry-runs staging.

## Application staging du 26 juillet 2026

Le runner opérateur a exécuté le dry-run final puis une application unique sur
`cycbnnojcymjnaqomlyj`. L'historique distant contient exactement 138 versions
uniques, sans manque, ajout ni collision. `pg_cron` reste absent, aucun job
cron n'existe et aucun seed Phase 6 séparé n'a été chargé.

Les contrôles post-application confirment la colonne `invited_by_coach`, la
contrainte `coach_clients_coach_client_unique`, 53 tables avec RLS activée,
127 policies, 25 fonctions et le catalogue canonique de 176 exercices. Les
tables `profiles`, `coach_clients` et `weekly_diagnostics` restent vides.

La prochaine autorisation doit porter sur le seed synthétique Phase 6. Tout
`migration repair`, reset ou configuration cron reste interdit.
