# Catalogue des métriques de progression

> Statut : inventaire documentaire de Phase 4, vérifié contre le code, les
> migrations et `lib/supabase/database.types.ts`. Ce document ne change aucun
> calcul et ne relie pas des historiques indépendants.

## 1. But et statuts

Ce catalogue prépare l'extraction future des fonctions d'agrégation pures. Il
distingue cinq statuts :

- **canonique** : définition pure déjà explicite et testée ;
- **legacy** : comportement reproductible, mais contrat non canonique ;
- **divergent** : plusieurs implémentations donnent potentiellement des valeurs
  différentes ;
- **ambigu** : résultat calculable seulement avec une convention implicite ;
- **non vérifiable** : score externe, IA ou donnée persistée sans formule locale
  reproductible.

Une absence n'est jamais assimilée à zéro dans ce catalogue. Lorsque le code le
fait, ce comportement est décrit comme legacy.

## 2. Glossaire et sources d'autorité

| Terme | Définition observée |
|---|---|
| séance détaillée | ligne `workout_sessions`, éventuellement jointe à `workout_sets` ; ownership `user_id` |
| marqueur de complétion | ligne indépendante `completed_sessions`, ownership `client_id`, sans FK vers `workout_sessions` |
| séance planifiée | ligne `scheduled_sessions`, avec dates, statut et deux paires de champs durée |
| set complété | `workout_sets.completed = true` ; poids/reps peuvent néanmoins être nuls |
| tonnage | somme `weight × reps`, affichée en `kg` ou `T`, sans dimension canonique pour poids du corps |
| date locale | chaîne `YYYY-MM-DD` construite avec les getters locaux ; contrat explicite de `lib/streak.ts` |
| date UTC tronquée | `toISOString().split('T')[0]` ou `.slice(0, 10)` ; peut changer de jour selon timezone |
| semaine | selon les endroits : lundi local, 7 derniers jours glissants, 28 jours découpés en lundis, ou `week_start` SQL |

Les tables principales sont `workout_sessions`, `workout_sets`,
`completed_sessions`, `scheduled_sessions`, `personal_records`, `weight_logs`,
`body_measurements`, `body_analyses`, `daily_checkins`, `daily_food_logs`,
`water_intake`, `weekly_diagnostics` et `profiles`. Les RLS donnent en général
l'autorité à l'utilisateur (`user_id` ou `client_id`) ; la visibilité coach
doit rester conditionnée à la relation active documentée dans
[les repositories](SUPABASE_REPOSITORIES.md).

## 3. Tableau synthétique — 39 métriques

| # | Identifiant proposé | Domaine | Unité | Fenêtre | Statut |
|---:|---|---|---|---|---|
| 1 | `training.detailed_session_count` | Training | séances | globale/chargée | legacy |
| 2 | `training.completion_marker_count` | Training | marqueurs | globale/chargée | legacy |
| 3 | `training.sessions_this_week` | Training | séances | semaine locale | divergent |
| 4 | `training.scheduled_adherence_pct` | Training | % | semaine | divergent |
| 5 | `training.completed_set_count` | Training | séries | séance/période | legacy |
| 6 | `training.completed_repetition_count` | Training | répétitions | séance/période | ambigu |
| 7 | `training.session_tonnage` | Training | kg·répétitions | séance | legacy |
| 8 | `training.weekly_tonnage` | Training | kg·répétitions | 28 j par semaine | divergent |
| 9 | `training.weekly_tonnage_change_pct` | Training | % | 2 dernières semaines présentes | legacy |
| 10 | `training.muscle_set_count_28d` | Training | séries | 28 jours glissants | legacy |
| 11 | `training.muscle_tonnage_28d` | Training | kg·répétitions | 28 jours glissants | legacy |
| 12 | `training.muscle_average_rir_28d` | Training | RIR | 28 jours glissants | legacy |
| 13 | `training.session_duration` | Training | minutes/ms | séance | divergent |
| 14 | `records.estimated_1rm` | Records | kg | jour/exercice | divergent |
| 15 | `records.max_weight` | Records | unité persistée | globale/exercice | legacy |
| 16 | `records.last_30d_count` | Records | PR | 30 jours glissants | legacy |
| 17 | `body.current_weight` | Corps | kg | dernière valeur | divergent |
| 18 | `body.weight_change` | Corps | kg | période variable | divergent |
| 19 | `body.weight_moving_average_7` | Corps | kg | 7 observations | legacy |
| 20 | `body.weight_goal_progress_pct` | Corps | % | globale | ambigu |
| 21 | `body.circumference` | Corps | cm | mesure | legacy |
| 22 | `body.circumference_delta` | Corps | cm | 2 mesures | legacy |
| 23 | `body.body_fat_pct` | Corps | % | dernière valeur | divergent |
| 24 | `body.lean_mass_estimate` | Corps | kg | instant | divergent |
| 25 | `body.symmetry_score` | Corps | score inconnu | analyse | non vérifiable |
| 26 | `body.bmi` | Corps | kg/m² | instant | legacy |
| 27 | `regularity.training_streak` | Régularité | jours | consécutive | canonique |
| 28 | `regularity.coach_dashboard_streak` | Régularité | jours | consécutive | divergent |
| 29 | `regularity.nutrition_streak` | Régularité | jours | consécutive | divergent |
| 30 | `wellbeing.sleep_hours` | Activité | heures | jour/7–N j | legacy |
| 31 | `wellbeing.mood` | Activité | catégorie | jour/7–N j | ambigu |
| 32 | `nutrition.daily_energy` | Nutrition | kcal | jour | divergent |
| 33 | `nutrition.daily_macros` | Nutrition | g | jour | divergent |
| 34 | `nutrition.daily_water` | Nutrition | ml/l | jour | legacy |
| 35 | `nutrition.energy_target_match` | Nutrition | booléen | jour | legacy |
| 36 | `nutrition.weekly_averages` | Nutrition | kcal, g | semaine | divergent |
| 37 | `nutrition.meal_plan_adherence_pct` | Nutrition | % | semaine | legacy |
| 38 | `profile.fitness_score` | Profil | score /100 supposé | snapshot | non vérifiable |
| 39 | `gamification.xp_level_progress` | Profil | XP, niveau, % | globale | legacy |

Répartition : Training 13, records 3, corps 10, régularité/activité 5,
Nutrition 6, profil/gamification 2.

## 4. Fiches Training et records

### 4.1 Comptages de séances (#1–4)

- `training.detailed_session_count` est `wSessions.length` dans
  `ProgressTab` (`app/components/tabs/ProgressTab.tsx:456,463`). Le loader lit
  les séances détaillées via le repository Training. La limite de chargement
  devient implicitement la limite de la métrique.
- `training.completion_marker_count` compte `completed_sessions` côté coach
  (`app/client/[id]/components/ClientProgress.tsx:283`). Il ne doit pas être
  fusionné avec le premier : aucun lien relationnel ne prouve qu'une ligne de
  chaque table représente la même exécution.
- `training.sessions_this_week` varie : le dashboard desktop prend les
  `workout_sessions.created_at >= now-7j` (`app/(dashboard)/page-desktop.tsx:202-220`),
  le coach compte les marqueurs depuis le lundi local
  (`ClientProgress.tsx:279-283`), et le diagnostic utilise `[week_start,
  week_end)` (`lib/weekly-diagnostic/generator.ts:99-103`). Statut divergent.
- `training.scheduled_adherence_pct` vaut, dans le diagnostic,
  `min(100, sessionsDone / sessions_per_week * 100)` avec défaut 4
  (`generator.ts:133-137`). Le desktop utilise `weekSessions / 5 * 100`, sans
  plafond (`page-desktop.tsx:269`). Aucun des deux ne compare réellement
  `scheduled_sessions` aux exécutions : le nom « adhérence planifiée » est donc
  trompeur.

Zéro est affiché lorsque les tableaux sont vides ; une panne de lecture peut
donc devenir indistinguable d'une semaine sans séance dans certains flux.

### 4.2 Séries, répétitions, tonnage et durée (#5–13)

- Sets complétés : nombre de `workout_sets` retenus par `completed`; la
  finalisation pure compte les sets complétés et tous les sets
  (`lib/training/workout-session-model.ts:266-280`).
- Répétitions : somme possible de `reps`, mais aucune vue principale ne publie
  actuellement un total global ; les valeurs nulles sont souvent converties à
  zéro. Statut ambigu.
- Tonnage de séance : `Σ(weight × reps)` sur sets complétés dans le modèle pur
  et `WorkoutSession` ; `session-history.ts:181-188` inclut tous les sets du
  détail fourni. Les entrées nulles/non numériques deviennent zéro. Aucune
  conversion `lb`, poids du corps ou assistance machine.
- Tonnage hebdomadaire : `useAnalytics` lit 500 sets complétés maximum sur 28
  jours, groupe par lundi puis arrondit chaque semaine à l'entier
  (`app/hooks/useAnalytics.ts:52-77`). Le diagnostic somme les sets des séances
  de sa fenêtre sans plafond explicite (`generator.ts:116-129`). Le desktop
  recalcule depuis une jointure `select('*')` (`page-desktop.tsx:205-220`).
- Variation : `(dernière - précédente) / précédente × 100`, arrondie à l'entier,
  `null` si moins de deux semaines ou précédente zéro
  (`AnalyticsSection.tsx:229-235`). Les semaines absentes ne sont pas comblées.
- Par muscle : sur les sets complétés des 28 derniers jours, mapping
  `exercise_id → exercises_db.muscle_group`; nombre de sets et tonnage arrondi
  (`AnalyticsSection.tsx:117-137`). Les sets sans `exercise_id` ou mapping sont
  exclus silencieusement.
- RIR moyen : moyenne des `rir` par muscle, seulement à partir de 5 sets,
  arrondie au dixième ; tri croissant (`AnalyticsSection.tsx:139-161`).
- Durée : `WorkoutSession` prépare `durationMs`, puis la persistance écrit des
  minutes ; les tables exposent `workout_sessions.duration_minutes`,
  `completed_sessions.duration_minutes` et les deux champs
  `scheduled_sessions.duration_min/duration_minutes`. Aucune source unique.

Les timestamps des fenêtres 28 jours utilisent `Date.now()` et des
`timestamptz`; le regroupement hebdomadaire modifie une `Date` locale puis
tronque en UTC. Une transition DST peut déplacer la clé.

### 4.3 Records (#14–16)

- e1RM Epley : `weight × (1 + reps / 30)`. `AnalyticsSection` arrondit au
  dixième avant de garder le maximum journalier (`:85-108`). `useAnalytics`
  compare la valeur non arrondie au record, puis persiste au dixième
  (`app/hooks/useAnalytics.ts:81-117`). Les regroupements sont par
  `exercise_name`, pas par `exercise_id`.
- Poids maximal : valeur brute du set déclencheur, persistée comme
  `record_type='max_weight'`, unité `kg` par défaut. Les migrations autorisent
  aussi `max_reps` et `best_volume`, peu consommés.
- PR sur 30 jours : nombre de lignes dont `achieved_at >= date locale convertie
  en chaîne ISO` (`AnalyticsSection.tsx:237-242`). La requête est limitée à 50
  records, donc le compte peut être tronqué.

## 5. Fiches corps et mesures (#17–26)

- Poids actuel : le client privilégie le dernier élément des 30 lignes
  ascendantes, puis `profiles.current_weight`; le coach privilégie
  `weightLogs[0]`, chargé en ordre décroissant. Le desktop emploie encore une
  autre projection. Un tableau vide peut retomber sur un snapshot ancien.
- Variation de poids : ProgressTab compare premier/dernier de la collection
  affichée et arrondit au dixième (`ProgressTab.tsx:442-445`), Analytics compare
  première/dernière valeur des 30 derniers jours (`AnalyticsSection.tsx:221-227`),
  le coach cherche la première valeur d'un autre mois (`useClientDetail.ts:770-780`),
  et ClientProgress compare poids courant/initial (`ClientProgress.tsx:275-277`).
- Moyenne mobile : moyenne des 7 **observations**, pas des 7 jours, arrondie au
  dixième (`AnalyticsSection.tsx:163-180`).
- Progression vers objectif : `((start-current)/(start-target))*100`, arrondi et
  borné 0–100 (`useClientDetail.ts:775-780`). `start` retombe sur
  `profile.current_weight`, qui peut déjà être le poids courant : statut ambigu.
- Mensurations : poitrine, taille, hanches et, dans l'UI, bras/cuisses. Le
  loader compatible distant ne projette que `chest/waist/hips`; les types
  générés exposent `biceps/thighs/calves`, tandis que `ProgressTab` écrit/lit
  aussi `left_arm/right_arm/left_thigh/right_thigh`, absents des types générés.
  Les deltas sont `current-prev`, affichés en valeur absolue sans arrondi
  (`ProgressTab.tsx:377-385`).
- Masse grasse : `profiles.body_fat_pct`, champs runtime de mesures
  (`body_fat`) ou estimation IA `body_analyses.body_fat_estimate` sont trois
  sources différentes.
- Masse maigre : calcul local `weight - weight × bodyFat/100` dans
  `AbsCalculator.tsx:41-45`, ou valeur IA persistée
  `body_analyses.lean_mass_estimate` ; elles ne sont pas interchangeables.
- Symétrie : `body_analyses.symmetry_score`, produite par fournisseur IA, sans
  formule locale ni unité documentée : non vérifiable.
- IMC : `weight / (height/100)^2`, affiché à un décimal
  (`AbsCalculator.tsx:41-43,174`). Valeurs absentes font disparaître le bloc ;
  aucune validation métier des bornes.

Les `weight_logs.date` et `body_measurements.date` sont des dates SQL sans
timezone. Plusieurs vues utilisent `new Date('YYYY-MM-DD')`, interprété UTC par
JavaScript, puis affichent en locale : risque de décalage d'un jour.

## 6. Régularité, bien-être et profil (#27–31, #38–39)

- Streak canonique : union dédupliquée des dates locales de complétion et jours
  de repos planifiés ; compte jusqu'à aujourd'hui ou hier avec grâce
  (`lib/streak.ts:30-71`). Le dashboard convertit d'abord les timestamps en date
  locale (`app/hooks/useClientDashboard.ts:154-160`).
- Streak coach : dates UTC tronquées de `workout_sessions`, boucle tolérant un
  écart `<= 1` jour (`useClientDetail.ts:781-790`), sans repos planifié. Diverge
  du contrat canonique.
- Streak Nutrition : logique badge distincte dans `lib/check-badges.ts`, fondée
  sur dates de logs et seuil 1,5 jour. Il mesure la saisie, pas la conformité.
- Sommeil : valeur déclarée `daily_checkins.sleep_hours`; fenêtre démarrant à
  `Date.now()-N×24h`, chaîne UTC, sans agrégation stable dans ProgressTab.
- Humeur : catégorie texte `daily_checkins.mood`; affichage par jour mais aucun
  ordre/score canonique. Toute moyenne serait inventée.
- `profiles.fitness_score` est affiché comme `/100` dans le diagnostic, mais sa
  formule n'est pas disponible dans les frontières auditées.
- XP : `getLevelFromXP` transforme `user_xp.total_xp` en niveau/progression
  (`lib/gamification.ts`). C'est une métrique de gamification, pas une mesure de
  performance Training ; les écritures XP restent une autorité séparée.

## 7. Nutrition dans la progression (#32–37)

- Énergie/macros quotidiennes : somme de `daily_food_logs` par `date`, valeurs
  absentes converties à zéro (`app/hooks/useAnalytics.ts:33-43`). Les règles
  divergent du [noyau canonique](NUTRITION_CANONICAL_MODEL.md) et du
  [comparateur legacy/canonique](NUTRITION_TOTAL_COMPARISON.md).
- Eau : somme `amount_ml` par date ; graphique converti en litres via
  `Math.round(ml)/1000`, export au dixième de litre
  (`AnalyticsSection.tsx:203-209,266`).
- Cible calorique : journée dans la cible si
  `abs(calories-calorieGoal) <= 100`, après arrondi des calories à l'entier
  (`AnalyticsSection.tsx:182-190`). Zéro loggé et absence de jour sont
  différents car les jours absents ne figurent pas dans le tableau.
- Moyennes diagnostic : moyenne calories/protéines sur les **jours ayant au
  moins un log**, pas sur sept jours ; absence donne zéro. Conformité protéines
  `avg/goal×100`, non plafonnée (`generator.ts:139-155`).
- Adhérence plan alimentaire coach : nombre de couples date/type de repas
  marqués dans `weeklyTracking` divisé par les repas planifiés passés
  (`app/client/[id]/components/ClientNutrition.tsx:306`). Elle ne mesure ni
  aliments, ni quantités, ni macros et ne fusionne pas les tables de journaux.

## 8. Matrice métrique → consommateurs

| Groupe | Client mobile | Desktop | Coach | Diagnostic/API | Export |
|---|---|---|---|---|---|
| séances/streak | `HomeTab`, `ProgressTab` | dashboard/Training | `ClientOverview`, `ClientProgress` | weekly diagnostic | — |
| séries/volume/RIR | `ProgressTab/AnalyticsSection` | Training/analytics | historique | weekly diagnostic | CSV analytics partiel |
| records/e1RM | `ProgressTab/AnalyticsSection` | Training/progression | overview | — | — |
| poids/mesures | `ProgressTab`, modales | progression | overview/progression | weekly diagnostic, analyse photo | CSV/XLSX |
| corps IA/photos | `ProgressTab` | progression | timeline | analyse photo/body | téléchargement photo |
| calories/macros/eau | `NutritionTab`, `AnalyticsSection` | dashboard | suivi nutrition | weekly diagnostic | CSV analytics |
| sommeil/humeur | `ProgressTab` | — | — | — | — |
| fitness/XP | profil/home | dashboard | aperçu profil | weekly diagnostic | — |

## 9. Divergences et métriques non reproductibles

Principales divergences :

1. `completed_sessions` et `workout_sessions` comptent deux faits différents.
2. Les semaines sont tantôt ISO-like lundi, tantôt glissantes 7/28 jours.
3. Le streak coach ignore les repos et tronque en UTC ; le streak canonique
   utilise des dates locales et inclut les repos.
4. Le volume varie selon filtre `completed`, plafond de requête et source.
5. Le poids “mensuel” peut signifier 30 jours, période sélectionnée, mois civil
   précédent ou écart depuis le départ.
6. Les mensurations runtime `left_arm/right_arm/left_thigh/right_thigh/body_fat`
   divergent des types générés et du schéma distant déjà caractérisé.
7. Nutrition remplace encore souvent inconnu par zéro.
8. L'adhérence varie entre objectif fixe 5, préférence profil par défaut 4 et
   complétion de repas.
9. Le diagnostic demande `workout_sessions.date` alors que les migrations et
   types générés n'exposent que `created_at` (`generator.ts:99-103`) : ses
   métriques de séance ne sont pas reproductibles contre le schéma canonique
   sans corriger d'abord cette projection.

Les accès `select('*')` encore observés concernent notamment les records dans
`useAnalytics`, les analyses/check-ins dans `ProgressTab` et les jointures de
séances du dashboard desktop. Ils rendent les read models sensibles aux écarts
de schéma. Aucun cache localStorage/sessionStorage spécifique aux métriques de
progression n'a été trouvé : les agrégats vivent dans l'état React après les
lectures ; le cache dashboard owner-scoped porte le profil et ne constitue pas
une autorité métrique.

Non reproductibles sans hypothèse ou fournisseur : `symmetry_score`, analyses
photo textuelles, `fitness_score`, `score_semaine` généré par IA, tendances
qualitatives de l'analyse photo et humeur agrégée. Le champ
`weekly_diagnostics.score_semaine` est borné 0–100 par le contrat fournisseur,
mais sa formule n'est pas déterministe localement.

## 10. Ordre recommandé d'extraction des fonctions pures

1. **Périodes et dates** : date locale, fenêtre glissante, semaine lundi et
   clés hebdomadaires, avec timezone/horloge injectées.
2. **Tonnage et sets** : filtres explicites, résultats partiels, unité et
   politique pour poids/reps manquants.
3. **Séances** : compteurs séparés pour détails, marqueurs et planification ;
   aucune déduplication implicite.
4. **Poids/mesures** : sélection courant/départ, deltas, moyenne mobile et
   progression objectif avec absence distincte de zéro.
5. **Records** : e1RM, maximum journalier et regroupement stable par identité
   d'exercice, avec adaptateur par nom legacy.
6. **Régularité** : conserver `computeStreak`, ajouter seulement des adaptateurs
   explicites pour les sources.
7. **Nutrition/eau** : réutiliser les invariants Nutrition et rendre les jours
   manquants explicites.
8. **Read models** : seulement après convergence des fonctions ci-dessus.

## 11. Critères des futures fixtures

Les fixtures devront être synthétiques, owner-scoped et sans donnée
personnelle. Elles couvriront : ordre aléatoire, doublons, limites de requête,
dates UTC/locales/DST, dimanche et lundi, semaines vides, poids/reps nuls ou
invalides, `kg`/`lb`, mesures partielles, zéro explicite, historiques non reliés,
sets sans `exercise_id`, jours Nutrition absents et résultats déterministes.
Chaque fixture indiquera la source, la timezone, l'horloge, l'unité, le statut
attendu et les éléments exclus. Aucun test ne devra inventer une correspondance
entre les deux historiques de séance.

## 12. Audit d'autorité RC1

La [matrice d'autorité](PROGRESSION_AGGREGATION_AUTHORITY.md) remplace les
anciens numéros de ligne comme preuve active. Les formules Epley et tonnage
réutilisent désormais `lib/progression/` dans les consommateurs ; les variantes
de sources, fenêtres et timezones restent séparées et nommées.

La garde `npm run progression:authority:check` parcourt tout `app/` et les
consommateurs métier `lib/` explicitement concernés. Elle refuse une nouvelle
formule Epley ou poids×répétitions hors noyau partagé.
