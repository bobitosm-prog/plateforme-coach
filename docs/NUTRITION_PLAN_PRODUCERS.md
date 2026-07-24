# Producteurs de plans Nutrition legacy

## Objet et conclusion

Cette caractérisation couvre les écritures locales connues vers `meal_plans`
et `client_meal_plans`. Elle ne consulte aucune donnée distante et ne modifie
ni producteur, ni schéma, ni policy.

**Décision d'exécution : ne pas versionner ces producteurs dans leur état actuel.** Les
types générés et les migrations décrivent `meal_plans.plan` / `active`, alors
que quatre producteurs et leurs consommateurs écrivent ou lisent
`plan_data` / `is_active` ainsi que des colonnes de totaux absentes. Le même
écart existe pour les objectifs et `week_start` de `client_meal_plans`.
Choisir l'une des formes sans preuve du schéma effectivement déployé
inventerait un contrat.

Le snapshot Nutrition v1 reste réutilisable pour des aliments individuels
dont la source et les alias sont connus. Il ne suffit pas pour versionner un
plan : il ne décrit ni l'enveloppe du plan, ni son activation, ni ses
objectifs, ni son affectation. Aucun snapshot v2 n'est donc créé. L'autorité
cible et une enveloppe de plan distincte sont désormais fixées par
[l'ADR 0007](adr/0007-nutrition-plan-persistence-contract.md), sans migration
des sept producteurs.

## Contrat SQL démontré

Sources : `20260415_master_rls_fix.sql`,
`lib/supabase/database.types.ts` et projections des repositories Nutrition.

| Table | Colonnes générées | Nullabilité et défauts SQL | Projection |
|---|---|---|---|
| `meal_plans` | `id`, `user_id`, `created_by`, `name`, `plan`, `active`, `created_at` | `plan` non nul, défaut `{}` ; `id` généré ; `active` défaut `true` mais nullable dans les types ; identités, nom et date nullable | `id,user_id,created_by,name,plan,active,created_at` |
| `client_meal_plans` | `id`, `client_id`, `coach_id`, `plan`, `created_at`, `updated_at` | `plan` non nul, défaut `{}` ; `id` généré ; identités et dates nullable | `id,client_id,coach_id,plan,created_at,updated_at` |

Les colonnes runtime suivantes ne sont démontrées ni par les migrations ni par
les types générés :

- `meal_plans.plan_data`, `is_active`, `total_calories`, `protein_g`,
  `carbs_g`, `fat_g`, `objective` ;
- `client_meal_plans.week_start`, `calorie_target`, `protein_target`,
  `carb_target`, `fat_target`.

Les repositories read-only n'inventent pas ces colonnes et conservent le JSON
`plan` brut.

## Ownership et policies observées

- `meal_plans_own` autorise le propriétaire `user_id`; `meal_plans_coach`
  utilise `created_by`. Une policy de lecture ultérieure autorise aussi tout
  coach présent dans `coach_clients` pour le `user_id`.
- `client_meal_plans_client_read` autorise la lecture du client.
  `client_meal_plans_coach_all` et `client_meal_plans_coach_write` se fondent
  sur `coach_id`.
- Ces policies historiques ne vérifient pas le statut actif d'une relation.
  Le repository spécialisé le vérifie côté lecture, mais cela ne change pas
  la policy.
- `created_by` décrit l'auteur d'un plan personnel coach ; il ne remplace pas
  l'ownership `user_id`. `coach_id` et `client_id` portent l'affectation du
  plan coach.

## Matrice des producteurs

| Producteur | Autorité et ordre | Payload observé | Provenance des totaux |
|---|---|---|---|
| `NutritionPreferences` | utilisateur authentifié ; désactive ses lignes `is_active`, puis insère | `user_id`, `plan_data`, `is_active: true` | totaux journaliers fournis puis vérifiés par le service de génération ; aucun total de plan séparé |
| `useInitialGeneration` | utilisateur authentifié ; même ordre désactivation puis insertion | même payload minimal | même contrat IA ; aucun total déclaré de plan |
| détail du diagnostic hebdomadaire | utilisateur du diagnostic ; désactivation puis insertion | payload minimal + `total_calories`, `protein_g`, `carbs_g`, `fat_g`, `objective` | objectifs déclarés issus des paramètres du diagnostic, distincts des aliments |
| `useClientDetailAi` | coach et client sélectionné ; génération, remplissage de sept jours, arrondis, insertion | `user_id`, `created_by`, `plan_data`, `is_active`, quatre totaux et `objective` | total de **lundi** ou objectif cible en fallback ; ce n'est pas une somme hebdomadaire |
| sauvegarde manuelle coach | coach/client ; update par `id` et scopes, sinon insert ; mise à jour de l'objectif profil séparée | `coach_id`, `client_id`, `week_start`, quatre cibles, `plan`, `updated_at` | cibles déclarées au niveau plan, pas somme des aliments |
| onboarding photo | utilisateur authentifié ; `upsert` sur `client_id` | `client_id`, `plan`, `created_at` | totaux présents uniquement dans le JSON IA |
| calculateur ABS | utilisateur authentifié ; même `upsert` | `client_id`, `plan`, `created_at` | totaux présents uniquement dans le JSON IA |

Aucun producteur de plan Nutrition dans un cron, aucune copie entre ces deux
tables et aucune activation de `client_meal_plans` n'ont été trouvés. Les
routes IA produisent le JSON mais n'écrivent pas directement ces tables.

## Formes persistées et attentes des consommateurs

Deux formes de semaine restent distinctes :

1. coach/template : `{ lundi: { meals: [{ type, foods }] } }`, aliments
   `{ name, qty, kcal, prot, carb, fat }`;
2. IA legacy : `{ lundi: { repas: { dejeuner: [...] }, total_kcal,
   total_protein, total_carbs, total_fat } }`, aliments français.

`parseMealPlan` ne reconnaît que les sept clés françaises. Il accepte ces deux
formes sans les fusionner :

- quantité : `qty`, puis `quantite_g`, puis `quantity_g`;
- énergie : `kcal`, puis `calories`;
- protéines : `prot`, `proteines`, `protein`, `proteins`;
- glucides : `carb`, `glucides`, `carbs`;
- lipides : `fat`, `lipides`, `fats`.

Une valeur invalide ou absente devient actuellement zéro dans cet adaptateur.
Si un seul total journalier IA est présent, les autres totaux absents
deviennent aussi zéro. Un jour IA avec `repas: {}` reste visible sous forme de
quatre repas vides ; un jour coach avec `meals: []` est omis. Les jours anglais
sont ignorés.

Les consommateurs personnels sélectionnent `plan_data` avec `is_active`, alors
que les repositories exposent `plan` avec `active`. Le client affiche aussi le
dernier `client_meal_plans.plan`, ordonné par `created_at`. `NutritionTab`
préfère le plan personnel actif au plan coach ; le dashboard client charge le
plan coach. Ces priorités sont des comportements legacy, pas un invariant
canonique.

## Totaux, concordance et pertes

| Niveau | Valeur observée | Interprétation sûre |
|---|---|---|
| aliment | macros dans chaque aliment, avec alias | calculée ou déclarée selon le producteur ; provenance absente dans les objets historiques |
| jour IA | `total_kcal`, `total_protein`, `total_carbs`, `total_fat` | le service actuel les recalcule depuis les aliments avant réponse ; les anciens objets ne prouvent pas ce passage |
| plan personnel diagnostic | colonnes runtime de totaux | objectifs déclarés, pas agrégation du plan |
| plan personnel coach IA | colonnes runtime de totaux | lundi arrondi, ou objectif en fallback |
| plan coach | colonnes runtime `*_target` | objectifs déclarés ; le JSON coach n'a pas de total journalier obligatoire |

Les fixtures exécutables démontrent :

- payloads personnels, diagnostic, coach IA, coach manuel et auto-affecté
  conservés exactement ;
- sept jours français acceptés, jour vide et jour anglais caractérisés ;
- zéro explicite distinct de total absent tant que le parseur reçoit la clé ;
- alias singuliers et pluriels acceptés, mais leur provenance n'est pas
  persistée ;
- un total déclaré de 600 kcal peut coexister avec 500 kcal recalculées ;
- le remplissage coach IA de jours manquants avec zéro perd la distinction
  entre inconnu et zéro.

Aucun arrondi intermédiaire commun ne peut être affirmé : la génération
Nutrition arrondit les aliments et jours, le coach IA arrondit après avoir
complété les jours, et le plan manuel persiste les valeurs d'éditeur.

## Décision de migration

| Question | Statut | Motif |
|---|---|---|
| Envelopper les aliments avec snapshot v1 | réutilisable ultérieurement | alias et provenance alimentaire sont couverts |
| Versionner aujourd'hui `meal_plans` | refusé | contrat `plan/active` contre `plan_data/is_active` non résolu |
| Versionner aujourd'hui `client_meal_plans` | refusé | cibles et `week_start` runtime absents du schéma généré |
| Déclarer les colonnes de total comme sommes | refusé | certaines sont des objectifs, une autre représente lundi |
| Créer une enveloppe de plan | contrat accepté, implémentation différée | l'ADR 0007 définit `NutritionPlanEnvelopeV1`; aucun producteur ne l'écrit encore |
| Réécrire les deux divergences historiques | interdit | elles restent des preuves réelles |

## Prochaine étape

Implémenter les types, validateurs et adaptateurs de lecture purs de
`NutritionPlanEnvelopeV1` et des deux formes legacy, sans migrer de producteur.
